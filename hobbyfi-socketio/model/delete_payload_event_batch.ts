import {Expose} from "class-transformer";

module Models {
    export class DeletePayloadEventBatch {
        @Expose({ name: 'event_ids' })
        eventIds: number[];

        constructor(eventIds: number[]) {
            this.eventIds = eventIds;
        }
    }
}

export default Models.DeletePayloadEventBatch;