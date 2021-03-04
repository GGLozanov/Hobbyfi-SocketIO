///<reference path='../model/message.ts'/>

import Message = Models.Message;
import { io } from "./routing";

io.on("connection", (socket) => {
    console.log('user connected');

    // TODO: Associate socket with some ID or whatever (send token/user Id?)
    // TODO: And then access the socket by that

    // TODO: Register user in Socket.IO room

    // socket.join()

    socket.on('disconnect', () => {
        console.log('user disconnected');
    });
});
