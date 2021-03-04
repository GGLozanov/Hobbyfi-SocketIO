/// <reference path="id_model.ts" />
module Models {
    export class Message implements IdModel {
        id: number;
        message?: string;
        createTime: string;
        chatroomId: number;
        userSentId: number;
    }
}