import { Expose } from "class-transformer";

module Models {
    export class IdToken {
        @Expose({ name: 'user_id' })
        id: number;
        @Expose({ name: 'device_tokens' })
        deviceToken: string[];

        constructor(id: number, deviceToken: string[]) {
            this.id = id;
            this.deviceToken = deviceToken;
        }
    }
}

export default Models.IdToken;