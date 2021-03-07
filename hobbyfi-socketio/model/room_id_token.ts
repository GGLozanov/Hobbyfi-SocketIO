import { Expose, Type } from "class-transformer";
import IdToken from "./id_token";

module Models {
    // id = roomId; idToken.id = userId
    export class RoomIdToken {
        @Expose({ name: 'chatroom_id' })
        roomId: number;
        @Expose({ name: 'id_to_device_token' })
        @Type(() => IdToken)
        idTokens: IdToken[];

        constructor(roomId: number, idTokens: IdToken[]) {
            this.roomId = roomId
            this.idTokens = idTokens;
        }
    }
}

export default Models.RoomIdToken;