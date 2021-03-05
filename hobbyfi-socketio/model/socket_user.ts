import { Socket } from "socket.io";
import { IdModel } from './id_model';

module Models {
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

export default Models;