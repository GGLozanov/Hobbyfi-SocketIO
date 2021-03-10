import IdTypeNameDescriptionImageModel from "./id_type_name_description_image_model";
import Tag from './tag';
import {Expose} from "class-transformer";

module Models {
    // nullability for fields because of compatibility with edit_event field maps
    export class Event extends IdTypeNameDescriptionImageModel {
        @Expose({ name: 'start_date' })
        startDate?: string;
        @Expose()
        date?: string;

        lat?: number;
        long?: number;

        @Expose({ name: 'chatroom_id' })
        chatroomId?: number;

        constructor(id: number, type: string, name: string, chatroomId?: number,
                    startDate?: string, date?: string, lat?: number, long?: number,
                    description?: string, photoUrl?: string) {
            super(id, type, name, description, photoUrl);
            this.chatroomId = chatroomId;
            this.startDate = startDate;
            this.date = date;
            this.lat = lat;
            this.long = long;
        }
    }
}

export default Models.Event;