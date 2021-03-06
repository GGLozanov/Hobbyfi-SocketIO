import {Request, Response} from "express";
import require_auth from "../handler/require_auth";

const socketEventResolutionMapper = require('../handler/socket_event');
const express = require('express');
const app = express();
const http = require('http').createServer(app);

const io = require('socket.io')(http);

const formUrlEncodedParser = express.urlencoded({ extended: true });

app.use(formUrlEncodedParser);

app.all('*', require_auth);

app.post('/receive_server_message', (req: Request, res: Response) => {
    const content = req.body;
    console.log('BODY received from server: ' + content.toString());
    if(!req.is('urlencoded') || !content.type || !content.id_to_device_token) {
        return res.status(400).send('Invalid encoding or missing server message type or missing ID to device token map for FCM!');
    }
    console.log('message TYPE received from server: ' + content.type);

    // TODO: id_to_device_token => JSON.parse to somehow convert to Map object???
    socketEventResolutionMapper(content.type)(content, content.id_to_device_token, res.locals.userId, content.room_id);

    return res.status(200).send('Socket event successfully handled');
});

http.listen(3000, () => {
    console.log(`listening on ${http.address.toString()}`);
});

export default io;