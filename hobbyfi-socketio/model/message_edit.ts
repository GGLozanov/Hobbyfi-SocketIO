import IdTypeModel from "./id_type_model";

// similar to CreateMessage class but w/ nullable fields
module Models {
    export class MessageEdit extends IdTypeModel {
        message: string;
        create_time?: string;
        user_sent_id?: number;
        chatroom_sent_id: number

        constructor(id: number, type: string, message: string, chatroom_sent_id: number, create_time?: string, user_sent_id?: number) {
            super(id, type);
            this.message = message;
            this.chatroom_sent_id = chatroom_sent_id;
            this.create_time = create_time;
            this.user_sent_id = user_sent_id;
        }
    }
}

export default Models.MessageEdit;