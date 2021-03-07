import {Expose} from "class-transformer";
import IdTypeModel from "./id_type_model";

module Models {
    export class MessageCreate extends IdTypeModel {
        @Expose()
        message: string;
        @Expose()
        create_time: string;
        @Expose()
        chatroom_sent_id: number;
        @Expose()
        user_sent_id?: number

        constructor(id: number, type: string, message: string, create_time: string, chatroom_sent_id: number, user_sent_id: number) {
            super(id, type);
            this.type = type;
            this.message = message;
            this.create_time = create_time;
            this.chatroom_sent_id = chatroom_sent_id;
            this.user_sent_id = user_sent_id;
        }

    }
}
export default Models.MessageCreate;