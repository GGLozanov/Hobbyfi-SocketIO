import {Express, Request, Response} from "express";
import require_auth from "../handler/require_auth";
import { plainToClass } from "class-transformer";
import SocketEventHandler from "../handler/socket_event";
import socketEventResolutionMapper = SocketEventHandler.socketEventResolutionMapper;
import {Server as HttpServer} from "node:http";
import {Server} from "socket.io";
import RoomIdToken from "../model/room_id_token";
import IdToken from "../model/id_token";

const fs = require('fs');

const express = require('express');
const app: Express = express();
const http: HttpServer = require('http').createServer(app);
const io: Server = require('socket.io')(http);

const formUrlEncodedParser = express.urlencoded({ extended: true });

app.use(formUrlEncodedParser);
app.set('trust proxy', true);

// app.all('*', require_auth);

app.post('/receive_server_message', (req: Request, res: Response) => {
    const content = req.body;
    console.log('BODY received from server: ' + JSON.stringify(content));

    console.log(req.ip);
    if(fs.readFileSync(__dirname + '/../keys/server_host.txt').toString() != req.ip && req.ip != '::1') {
        return res.status(401).send('Invalid remote address for endpoint designed to only be accessible from remote PHP REST server!');
    }

    if(!req.is('urlencoded') || !content.type ||
            (!content.id_to_device_token && !content.room_id_to_id_and_device_token)) {
        return res.status(400).send('Invalid encoding or missing server message type or missing ID to device token map for FCM!');
    }
    console.log('message TYPE received from server: ' + content.type);
    console.log('message IDTODEVICETOKEN received from server: ' + JSON.stringify(content.id_to_device_token));
    console.log('message ROOMIDTODEVICETOKEN received from server: ' + JSON.stringify(content.room_id_to_id_and_device_token));

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

http.listen(process.env.PORT || 80, () => {
    console.log(`Listening on ${http.address.toString()}`);
});

export default io;