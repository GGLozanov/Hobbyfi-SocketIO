import {Expose} from "class-transformer";

module Models {
    export class IdModel {
        @Expose()
        id: number

        protected constructor(id: number) {
            this.id = id;
        }
    }
}

export default Models.IdModel;