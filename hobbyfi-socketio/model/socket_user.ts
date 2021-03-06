import { Socket } from "socket.io";

module Models {
    const IdModel = require('./id_model').IdModel;

    export class SocketUser extends IdModel {
        id: number;
        roomId: number; // i.e. chatroom id
        socket: Socket;

        constructor(id: number, roomId: number, socket: Socket) {
            super(id);
            this.roomId = roomId;
            this.socket = socket;
        }
    }
}

module.exports = Models;