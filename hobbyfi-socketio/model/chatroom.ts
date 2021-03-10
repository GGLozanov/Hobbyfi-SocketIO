import IdTypeNameDescriptionModel from "./id_type_model";
import IdTypeNameDescriptionImageTagModel from "./id_type_name_description_image_tag_model";
import Tag from './tag';

module Models {
    export class Chatroom extends IdTypeNameDescriptionImageTagModel {
        ownerId: number;
        eventIds?: number[];

        constructor(id: number, type: string, ownerId: number, name?: string,
                    eventIds?: number[], description?: string, photoUrl?: string, tags?: Tag[]) {
            super(id, type, name, tags, description, photoUrl);
            this.ownerId = ownerId;
            this.eventIds = eventIds;
        }
    }
}

export default Models.Chatroom;