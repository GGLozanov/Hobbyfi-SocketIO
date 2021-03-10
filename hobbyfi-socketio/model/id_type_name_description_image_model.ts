import {Expose} from "class-transformer";
import IdTypeNameDescriptionModel from "./id_type_name_description_model";
import Tag from './tag';

module Models {
    export class IdTypeNameDescriptionImageModel extends IdTypeNameDescriptionModel {
        @Expose({ name: 'photo_url' })
        photoUrl?: string;

        constructor(id: number, type: string, name?: string, description?: string, photoUrl?: string) {
            super(id, type, name, description);
            this.photoUrl = photoUrl;
        }
    }
}

export default Models.IdTypeNameDescriptionImageModel;