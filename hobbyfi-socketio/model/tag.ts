import {Expose} from "class-transformer";

module Models {
    export class Tag {
        name: string;
        colour: string;
        @Expose({ name: 'is_from_facebook' })
        isFromFacebook: boolean;

        constructor(name: string, colour: string, isFromFacebook: boolean) {
            this.name = name;
            this.colour = colour;
            this.isFromFacebook = isFromFacebook;
        }
    }
}

export default Models.Tag;