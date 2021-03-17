import { Socket } from "socket.io";
import IdSocketModel from "./id_socket_model";

module Models {
    // class is relatively the same as outersocketuser but semantic distinction is important
    export class SocketUser extends IdSocketModel {
        roomId?: number; // i.e. chatroom id

        constructor(id: number, socket: Socket, roomId?: number) {
            super(id, socket);
            this.roomId = roomId;
        }
    }
}

export default Models.SocketUser;