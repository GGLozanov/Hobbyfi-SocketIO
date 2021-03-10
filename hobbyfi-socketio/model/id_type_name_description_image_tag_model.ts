import {Expose} from "class-transformer";
import IdTypeNameDescriptionImageModel from "./id_type_name_description_image_model";
import Tag from './tag';

module Models {
    export class IdTypeNameDescriptionImageTagModel extends IdTypeNameDescriptionImageModel {
        @Expose()
        tags?: Tag[]

        constructor(id: number, type: string, name?: string, tags?: Tag[], description?: string, photoUrl?: string) {
            super(id, type, name, description, photoUrl);
            this.tags = tags;
        }
    }
}

export default Models.IdTypeNameDescriptionImageTagModel;