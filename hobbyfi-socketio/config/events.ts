module SocketEvents {
    export const createMessageType = 'CREATE_MESSAGE';
    export const editMessageType = 'EDIT_MESSAGE';
    export const deleteMessageType = 'DELETE_MESSAGE';
    export const userJoinType = 'JOIN_USER';
    export const userLeaveType = 'LEAVE_USER';
    export const userEditType = 'EDIT_USER';
    export const deleteChatroomType = 'DELETE_CHATROOM';
    export const editChatroomType = 'EDIT_CHATROOM';
    export const eventCreateType = 'CREATE_EVENT';
    export const eventEditType = 'EDIT_EVENT';
    export const eventDeleteType = 'DELETE_EVENT';
    export const eventDeleteBatchType = 'DELETE_EVENT_BATCH';

    export function isPushNotificationEvent(event: string): boolean {
        return event == createMessageType ||
            event == eventCreateType || event == deleteChatroomType || event == userJoinType || event == userLeaveType;
    }
}

module.exports = SocketEvents;