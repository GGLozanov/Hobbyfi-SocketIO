import IdModel from "./id_model";
import {Expose} from "class-transformer";

module Models {
    export class IdTypeModel extends IdModel {
        @Expose()
        type: string;

        constructor(id: number, type: string) {
            super(id);
            this.type = type;
        }
    }
}

export default Models.IdTypeModel;