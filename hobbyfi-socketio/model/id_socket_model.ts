import {Socket} from "socket.io";
import IdModel from "./id_model";

module Models {
    export class IdSocketModel extends IdModel {
        socket: Socket;

        constructor(id: number, socket: Socket) {
            super(id);
            this.socket = socket;
        }
    }
}

export default Models.IdSocketModel;