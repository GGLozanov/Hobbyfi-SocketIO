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
import OuterSocketUser from "../model/outer_socket_user";

const cors = require('cors');
const fs = require('fs');

const express = require('express');
const app: Express = express();

const stringWithSocketRoomPrefix = require('../utils/converters');

const http: HttpServer = require('http').createServer(app);
const io: Server = require('socket.io')(http);

const formUrlEncodedParser = express.urlencoded({ extended: true });

app.use(formUrlEncodedParser);
app.use(cors());

app.all('*', excludeRoutes(['/test'], require_auth));

io.on('connection', (socket: Socket) => {
    console.log('New user connected');
    console.log(`socket connected: ${socket.connected}`);
    console.log(`socket id: ${socket.id}`);
    console.log(`sockets all ids: ${Array.from(io.sockets.sockets.keys())}`);

    socket.on("connect", () => {
        console.log('New user connected [Confirm]');
        // socket.sendBuffer = []; // empty send buffer for emissions queued up for offline unavailability
        // refresh connection should be handled in clients through API refetch
    });

    socket.on('enter_main', ({ id }) => {
        console.log(`enter_main event received for socket and id: ${id}`);
        userManager.addMainUserDistinct(new OuterSocketUser(id, socket, null));
    });

    // receive the id in the form of data IMMEDIATELY after connection
    // set SocketUser ID: i.e. socketUser.id = 1; etc. (don't use socket ID because that may interfere w/ Socket.IO)
    // contain a SocketUser list somewhere as well...
    socket.on('join_chatroom', ({ id, chatroom_id }) => {
        console.log(`join_chatroom event received for socket and chatroom_id: ${chatroom_id}`);
        const mainUser = userManager.findMainUser(id);
        if(mainUser != undefined) {
            mainUser.lastEnteredRoomId = null; // reset last enter Id upon new entry
            userManager.replaceMainUserWithId(mainUser.id, mainUser);

            // console.log(`join_chatroom event MAIN_SOCKET user NOT logged in. CREATING THEM AND LOGGING THEM.`);
            // userManager.addMainUserDistinct(new OuterSocketUser(id, socket, null));
        } else {}

        userManager.addRoomUserDistinct(new SocketUser(id, socket, chatroom_id));
        socket.join(stringWithSocketRoomPrefix(chatroom_id.toString()));
    });

    socket.on('disconnect', () => {
        io.allSockets().then((sockets) => console.log(`Current socket ids: ${JSON.stringify(sockets)}`));
        const roomUser = userManager.pruneRoomUserBySocketId(socket.id);

        // OPTIMAL PERFORMANCE GO BRRR
        if(roomUser != null) {
            const mainUser = userManager.findMainUser(roomUser.id);
            if(mainUser != undefined) {
                console.log(`Chatroom socket disconnected but main socket user was left; id of user socket ${roomUser.id}`);
                mainUser.lastEnteredRoomId = roomUser.roomId;
                userManager.replaceMainUserWithId(mainUser.id, mainUser);
            } else {
                console.log(`Chatroom socket disconnected but no main socket found; main socket may have been disconnected!`);
            }
            socket.leave(stringWithSocketRoomPrefix(roomUser.roomId.toString()));
        } else {
            console.log(`Chatroom socket NOT disconnected. SOCKET disconnect MAY BE main socket`);
            const mainUser = userManager.pruneMainUserBySocketId(socket.id);
            if(mainUser != undefined) {
                console.log(`Main socket disconnected with LAST_CHATROOM_ID: ${mainUser.lastEnteredRoomId} AND ID: ${mainUser.id}`);
            } else {
                console.log(`MAIN SOCKET WASN'T ABLE TO DISCONNECT; SOMETHING IS WRONG`);
            }
        }

        console.log(`User manager OUTER SOCKET MAIN array: ${JSON.stringify(classToPlain(userManager.mainUsers))}`)
        console.log(`User manager ROOM SOCKET array: ${JSON.stringify(classToPlain(userManager.roomUsers))}`)

        console.log(`user socket LEAVE: ${roomUser}`)
        console.log('User disconnected');
    });
});

app.get('/test', (req: Request, res: Response) => {
    res.sendFile('index.html', {  root: __dirname });
})

app.post('/receive_server_message', (req: Request, res: Response) => {
    const content = req.body;
    console.log('BODY received from server: ' + JSON.stringify(content));

    console.log(req.ip);
    if((process.env.serverHost ||
            fs.readFileSync(__dirname + '/../keys/server_host.txt').toString()) != req.ip && req.ip != '::1') {
        return res.status(401).send('Invalid remote address for endpoint designed to only be accessible from remote PHP REST server!');
    }

    if(!req.is('urlencoded') || !content.type ||
            (!content.id_to_device_token && !content.room_id_to_id_and_device_token)) {
        return res.status(400).send('Invalid encoding or missing server message type or missing ID to device token map for FCM!');
    }
    console.log('message TYPE received from server: ' + content.type);
    console.log('message IDTODEVICETOKEN received from server: ' + JSON.stringify(content.id_to_device_token));
    console.log('message ROOMIDTODEVICETOKEN received from server: ' + JSON.stringify(content.room_id_to_id_and_device_token));

    if(typeof content.id_to_device_token === 'string' || content.id_to_device_token instanceof String) {
        content.id_to_device_token = JSON.parse(content.id_to_device_token);
    }

    if(typeof content.room_id_to_id_and_device_token === 'string' || content.room_id_to_id_and_device_token instanceof String) {
        content.room_id_to_id_and_device_token = JSON.parse(content.room_id_to_id_and_device_token);
    }

    const tokens = content.room_id_to_id_and_device_token ?
        plainToClass(RoomIdToken, content.room_id_to_id_and_device_token) : plainToClass(IdToken, content.id_to_device_token)

    const resolution = socketEventResolutionMapper(content.type);

    console.log('REQUEST USER ID: ' + res.locals.userId);

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