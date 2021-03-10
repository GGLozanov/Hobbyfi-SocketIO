import IdTypeModel from "./id_type_model";
import {Expose} from "class-transformer";

module Models {
    export class IdTypeNameDescriptionModel extends IdTypeModel {
        @Expose()
        name?: string;
        @Expose()
        description?: string;

        constructor(id: number, type: string, name?: string, description?: string) {
            super(id, type);
            this.name = name;
            this.description = description;
        }
    }
}

export default Models.IdTypeNameDescriptionModel;