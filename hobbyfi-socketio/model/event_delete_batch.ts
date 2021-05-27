import IdTypeModel from "./id_type_model";
import {Expose} from "class-transformer";

module Models {
    export class EventDeleteBatch extends IdTypeModel {
        @Expose({ name: "event_ids" })
        eventIds: number[];

        constructor(id: number, type: string, eventIds?: number[]) {
            super(id, type);
            this.eventIds = eventIds;
        }
    }
}

export default Models.EventDeleteBatch;