module SocketEvents {
    export const createMessageType = 'CREATE_MESSAGE';
    export const editMessageType = 'EDIT_MESSAGE';
    export const deleteMessageType = 'DELETE_MESSAGE';
    export const userJoinType = 'JOIN_USER';
    export const userLeaveType = 'LEAVE_USER';
    export const userEditType = 'USER_EDIT';
    export const deleteChatroomType = 'DELETE_CHATROOM';
    export const editChatroomType = 'EDIT_CHATROOM';
    export const eventCreateType = 'EVENT_CREATE';
    export const eventEditType = 'EVENT_EDIT';
    export const eventDeleteType = 'EVENT_DELETE';
    export const eventDeleteBatchType = 'EVENT_DELETE_BATCH';

    export function isPushNotificationEvent(event: string): boolean {
        return event == createMessageType ||
            event == eventCreateType || event == deleteChatroomType || event == userJoinType || event == userLeaveType;
    }
}

module.exports = SocketEvents;