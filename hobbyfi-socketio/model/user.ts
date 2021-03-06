import IdTypeNameDescriptionModel from "./id_type_model";
import IdTypeNameDescriptionImageTagModel from "./id_type_name_description_image_tag_model";
import Tag from './tag';
import {Expose} from "class-transformer";

module Models {
    export class User extends IdTypeNameDescriptionImageTagModel {
        @Expose({ name: 'username' })
        name?: string;
        @Expose()
        email?: string;
        @Expose({ name: 'chatroom_ids' })
        chatroomIds?: number[];
        @Expose({ name: 'allowed_push_chatroom_ids' })
        allowedPushChatroomIds?: number[];

        constructor(id: number, type: string, name?: string, email?: string,
                    chatroomIds?: number[], allowedPushChatroomIds?: number[], description?: string, photoUrl?: string, tags?: Tag[]) {
            super(id, type, name, tags, description, photoUrl);
            this.email = email;
            this.name = name;
            this.chatroomIds = chatroomIds;
            this.allowedPushChatroomIds = allowedPushChatroomIds;
        }
    }
}

export default Models.User;