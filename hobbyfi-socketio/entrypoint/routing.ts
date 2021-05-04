import {Express, Request, Response} from "express";
import require_auth from "../handler/require_auth";
import {classToPlain, plainToClass} from "class-transformer";
import SocketEventHandler from "../handler/socket_event";
import socketEventResolutionMapper = SocketEventHandler.socketEventResolutionMapper;
import RoomIdToken from "../model/room_id_token";
import IdToken from "../model/id_token";
import excludeRoutes from "../utils/route_unless";
import {Server, Socket} from "socket.io";
import userManager from "../handler/user_manager";
import SocketUser from "../model/socket_user";
import {Server as HttpServer} from "node:http";
import IdSocketModel from "../model/id_socket_model";

const cors = require('cors');
const fs = require('fs');

const express = require('express');
const bodyParser = require('body-parser');
const app: Express = express();

const stringWithSocketRoomPrefix = require('../utils/converters');

const http: HttpServer = require('http').createServer(app);
const io: Server = require('socket.io')(http);

app.use(bodyParser.json()) // for parsing application/json
app.use(bodyParser.urlencoded({ extended: true }))
app.use(cors());
app.set('trust proxy', true);

app.all('*', excludeRoutes(['/test'], require_auth));

io.on('connection', (socket: Socket) => {
    if(socket != undefined) {
        console.log('New user connected');
        console.log(`socket connected: ${socket.connected}`);
        console.log(`socket id: ${socket.id}`);
        console.log(`sockets all ids: ${Array.from(io.sockets.sockets.keys())}`);

        socket.on("connect", () => {
            console.log('New user connected [Confirm]');
            // socket.sendBuffer = []; // empty send buffer for emissions queued up for offline unavailability
            // refresh connection should be handled in clients through API refetch
        });

        socket.on('enter_main', (data) => {
            if(data != undefined && data.id != undefined) {
                console.log(`enter_main event received for socket and id: ${data.id}`);

                const roomUser = userManager.findRoomUser(data.id);
                if(roomUser != undefined) {
                    userManager.pruneRoomUserById(roomUser.id);
                }

                userManager.addMainUserDistinct(new IdSocketModel(data.id, socket)); // tracks FCM filtering for people idling in app
            } else {
                console.log(`enter_main event received with UNDEFINED DATA OR ID from data.`)
            }
        });

        // receive the id in the form of data IMMEDIATELY after connection
        // set SocketUser ID: i.e. socketUser.id = 1; etc. (don't use socket ID because that may interfere w/ Socket.IO)
        // contain a SocketUser list somewhere as well...
        socket.on('join_chatroom', (data) => {
            // { id, chatroom_id }
            if(data != undefined && data.id != undefined && data.chatroom_id != undefined) {
                console.log(`join_chatroom event received for socket w/ id: ${data.id} and chatroom_id: ${data.chatroom_id}`);

                const mainUser = userManager.findMainUser(data.id);
                if(mainUser != undefined) {
                    userManager.pruneMainUserById(mainUser.id);
                }

                userManager.addRoomUserDistinct(new SocketUser(data.id, socket, data.chatroom_id));
                socket.join(stringWithSocketRoomPrefix(data.chatroom_id.toString()));
            } else {
                console.log(`join_chatroom event received with UNDEFINED DATA OR ID from data.`)
            }
        });

        socket.on('user_typing', (data) => {
            if(data != undefined && data.id != undefined && data.chatroom_id != undefined) {
                console.log(`user_typing event received for socket w/ id: ${data.id} and chatroom_id: ${data.chatroom_id}`);
                socket.to(stringWithSocketRoomPrefix(data.chatroom_id.toString()))
                    .emit('user_typing', {id: data.id})
            } else {
                console.log(`user_typing event received with UNDEFINED DATA OR ID from data.`)
            }
        });

        socket.on('user_cease_typing', (data) => {
            if(data != undefined && data.id != undefined && data.chatroom_id != undefined) {
                console.log(`user_cease_typing event received for socket w/ id: ${data.id} and chatroom_id: ${data.chatroom_id}`);
                socket.to(stringWithSocketRoomPrefix(data.chatroom_id.toString()))
                    .emit('user_cease_typing', {id: data.id})
            } else {
                console.log(`user_cease_typing event received with UNDEFINED DATA OR ID from data.`)
            }
        });

        socket.on('disconnect', () => {
            const roomUser = userManager.pruneRoomUserBySocketId(socket.id);

            // OPTIMAL PERFORMANCE GO BRRR
            if(roomUser != null) {
                console.log(`Chatroom socket DISCONNECTED.`);
                socket.leave(stringWithSocketRoomPrefix(roomUser.roomId.toString()));
            } else {
                console.log(`Chatroom socket NOT disconnected. SOCKET disconnect MAY BE main socket`);
                const mainUser = userManager.pruneMainUserBySocketId(socket.id);
                if(mainUser != null) {
                    console.log(`Main socket disconnected with ID: ${mainUser.id}`);
                } else {
                    console.log(`MAIN SOCKET WASN'T ABLE TO DISCONNECT; SOMETHING IS WRONG`);
                }
            }

            console.log(`user socket LEAVE: ${roomUser}`)
            console.log('User disconnected');
        });
    } else {
        console.log(`UHHHH, UNDEFINED SOCKET????`);
    }
});

app.get('/test', (req: Request, res: Response) => {
    res.sendFile('index.html', {  root: __dirname });
})

app.post('/receive_server_message', (req: Request, res: Response) => {
    const content = req.body;

    if((process.env.serverHost ||
            fs.readFileSync(__dirname + '/../keys/server_host.txt').toString()) != req.ip && req.ip != '::1') {
        return res.status(401).send('Invalid remote address for endpoint designed to only be accessible from remote PHP REST server!');
    }

    if(!req.is('urlencoded') || !content.type ||
            (!content.id_to_device_token && !content.room_id_to_id_and_device_token)) {
        return res.status(400).send('Invalid encoding or missing server message type or missing ID to device token map for FCM!');
    }

    if(typeof content.id_to_device_token === 'string' || content.id_to_device_token instanceof String) {
        content.id_to_device_token = JSON.parse(content.id_to_device_token);
    }

    if(typeof content.room_id_to_id_and_device_token === 'string' || content.room_id_to_id_and_device_token instanceof String) {
        content.room_id_to_id_and_device_token = JSON.parse(content.room_id_to_id_and_device_token);
    }

    const tokens = content.room_id_to_id_and_device_token ?
        plainToClass(RoomIdToken, content.room_id_to_id_and_device_token) : plainToClass(IdToken, content.id_to_device_token)

    const resolution = socketEventResolutionMapper(content.type);
    if(Array.isArray(resolution)) {
        // for now, this handles the LEAVE_USER special case; might have to abstract these away and make it explicit...
        !content.room_id_to_id_and_device_token ?
            resolution[0](content, tokens, res.locals.userId, content.room_id) :
                resolution[1](content, tokens, res.locals.userId, content.room_id)
    } else {
        resolution(content, tokens, res.locals.userId, content.room_id);
    }

    return res.status(200).send('Socket event successfully handled');
});


http.listen(process.env.PORT || 3000, () => {
    console.log(`Listening on ${process.env.PORT || 3000}`);
});

export default io;