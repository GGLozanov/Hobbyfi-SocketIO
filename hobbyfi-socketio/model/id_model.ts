module Models {
    export abstract class IdModel {
        id: number

        protected constructor(id: number) {
            this.id = id;
        }
    }
}

export = Models;