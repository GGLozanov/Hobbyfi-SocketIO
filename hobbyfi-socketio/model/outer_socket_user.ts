import { Socket } from "socket.io";
import IdSocketModel from "./id_socket_model";

module Models {
    export class OuterSocketUser extends IdSocketModel {
        lastEnteredRoomId?: number; // keeps track of when/where to send FCM notifications to users connected to the main client
        socket: Socket;

        constructor(id: number, socket: Socket, lastEnteredRoomId?: number) {
            super(id, socket);
            this.lastEnteredRoomId = lastEnteredRoomId;
        }
    }
}

export default Models.OuterSocketUser;