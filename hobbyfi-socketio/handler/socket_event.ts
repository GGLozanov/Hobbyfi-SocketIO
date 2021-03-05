import { stringWithSocketRoomPrefix } from "../utils/converters";

const userManager = require('./user_manager');

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
}

module SocketEventHandler {
    // TODO:
    // in reality, these closures can be defined and abstracted away (with different arguments/impl.) in 7 steps:
    // 1) find the user socket for the notification (whether by room id, user id, etc.)
    // 2) have a source for the chatroom ID - doesn't matter how
    // 3) use that ID and emit the appropriate event to the given room with the received payload from the POST request from the server
    // 4) if the user is not found in the clients => emit to everyone
    // 5) receive extra parameter (map) containing user_ids for the chatroom ID mapped to relevant device tokens
    // 6) for all the users which ARE PART OF the socket user array from the map keys => emit event
    // 7) for all who ARE NOT PART OF the socket user array from the map keys => use FCM to send individual notifications (not subscription)

    // models get JSON-ified either way; no point in making them separate model classes for now
    // also because it'd be tedious

    // TODO: Handle user not being in socket clients anymore (emit to all)
    const onCreateMessage = (message: { id: number,
        message: string, create_time: string,
        chatroom_sent_id: number, user_sent_id?: number
    }, idToDeviceToken: Map<number, string>) => {
        let user = userManager.findUserByRoomId(message.chatroom_sent_id);
        console.log(`user found on CREATE_MESSAGE socket event handler: ${user}`);

        user.socket.to(stringWithSocketRoomPrefix(message.chatroom_sent_id.toString()))
            .emit(SocketEvents.createMessageType, message);
    }

    const onEditMessage = (editFields: { id: number;
        message: string; create_time?: string;
        user_sent_id?: number; chatroom_sent_id: number
    }, idToDeviceToken: Map<number, string>) => {
        let user = userManager.findUser(editFields.user_sent_id);
        console.log(`user found on EDIT_MESSAGE socket event handler: ${user}`);

        user.socket.to(stringWithSocketRoomPrefix(editFields.chatroom_sent_id.toString()))
            .emit(SocketEvents.editMessageType, editFields)
    }

    const onDeleteMessage = (deletePayload: { deletedId: number;
        chatroom_sent_id: number; user_sent_id: number;
    }, idToDeviceToken: Map<number, string>) => {
        let user = userManager.findUser(deletePayload.user_sent_id);
        console.log(`user found on EDIT_MESSAGE socket event handler: ${user}`);

        user.socket.to(stringWithSocketRoomPrefix(deletePayload.chatroom_sent_id.toString()))
            .emit(SocketEvents.deleteMessageType, )
    }

    // TODO: Implement
    const onJoinUser = () => {

    }

    const onLeaveUser = (editFields: { id: number; }) => {

    }

    const onEditUser = () => {

    }

    const onCreateEvent = (event: { id: number,
        name: string, photoUrl: string,
        startDate: string, date: string, lat: number, long: number,
        description?: string }) => {

    }

    const onDeleteEvent = () => {

    }

    const onDeleteEventBatch = () => {

    }

    const onEditEvent = () => {

    }

    const onEditChatroom = () => {

    }

    const onDeleteChatroom = () => {

    }

    const socketEventResolutionMap = {
        [SocketEvents.createMessageType]: onCreateMessage,
        [SocketEvents.editMessageType]: onEditMessage,
        [SocketEvents.deleteMessageType]: onDeleteMessage,
        [SocketEvents.userJoinType]: onJoinUser,
        [SocketEvents.userLeaveType]: onLeaveUser,
        [SocketEvents.userEditType]: onEditUser,
        [SocketEvents.deleteChatroomType]: onDeleteChatroom,
        [SocketEvents.editChatroomType]: onEditChatroom,
        [SocketEvents.eventCreateType]: onCreateEvent,
        [SocketEvents.eventEditType]: onEditEvent,
        [SocketEvents.eventDeleteType]: onDeleteEvent,
        [SocketEvents.eventDeleteBatchType]: onDeleteEventBatch
    };

    export const socketEventResolutionMapper = (event: string) => {
        if(!(event in socketEventResolutionMap)) {
            throw new TypeError('Invalid event constant passed for socket event resolution mapping!');
        }

        return socketEventResolutionMapper[event];
    }
}

export default SocketEventHandler;