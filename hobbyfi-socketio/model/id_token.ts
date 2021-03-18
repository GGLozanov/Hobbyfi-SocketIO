import { Expose } from "class-transformer";

module Models {
    export class IdToken {
        @Expose({ name: 'user_id' })
        id: number;
        @Expose({ name: 'device_tokens' })
        deviceTokens: string[];

        constructor(id: number, deviceToken: string[]) {
            this.id = id;
            this.deviceTokens = deviceToken;
        }
    }
}

export default Models.IdToken;