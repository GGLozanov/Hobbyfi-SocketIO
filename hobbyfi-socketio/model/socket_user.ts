import { Socket } from "socket.io";
import IdModel from "./id_model";

module Models {
    export class SocketUser extends IdModel {
        roomId?: number; // i.e. chatroom id
        socket: Socket;

        // TODO: last_entered_room_id prop to identify chatrooms for FCM ignore

        constructor(id: number, socket: Socket, roomId?: number) {
            super(id);
            this.roomId = roomId;
            this.socket = socket;
        }
    }
}

export default Models.SocketUser;