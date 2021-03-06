import {messaging} from "firebase-admin/lib/messaging";
import DataMessagePayload = messaging.DataMessagePayload;

const SocketUser = require('../model/socket_user.ts').SocketUser;
const stringWithSocketRoomPrefix = require('../utils/converters');
const io = require('../entrypoint/routing');
const fcm = require('../config/firebase_config');
const userManager = require('./user_manager');
const SocketEvents = require('../config/events');

module SocketEventHandler {
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

    import MessagingDevicesResponse = messaging.MessagingDevicesResponse;

    function stringifyObjectProps(object: { [key: string]: any }): DataMessagePayload {
        Object.keys(object).forEach(function(key) {
            object[key] = typeof object[key] == 'object' ? JSON.stringify(object[key]) : String(object[key]);
        });
        return <DataMessagePayload>object;
    }

    function getDisconnectedUsersDeviceTokens(idToDeviceToken: Map<number, string>) {
        const socketUserIds = userManager.users.map((user: typeof SocketUser) => user.id);
        return new Map(
            Array.from(idToDeviceToken).filter(([id, _]) => id !in socketUserIds)
        );
    }

    function emitEventOnSenderConnection(roomId: number, event: string, message: object, sender?: typeof SocketUser) {
        if(!sender || !sender.socket.connected) {
            io.to(stringWithSocketRoomPrefix(roomId.toString()))
                .emit(event, message);
        } else {
            sender.socket.to(stringWithSocketRoomPrefix(roomId.toString()))
                .emit(event, message);
        }
    }

    function handleFCMAndEventEmissionForData(idToDeviceToken: Map<number, string>, event: string,
                                              data: object, userRequestId: number, roomId: number) {
        fcm.sendToDevice(Array.from(getDisconnectedUsersDeviceTokens(idToDeviceToken).values()),
            { data: stringifyObjectProps(data) }).then((r: MessagingDevicesResponse) => {
            console.log(`FCM for event ${event} failure & success count. F: ${r.failureCount}; S: ${r.successCount}`);
            let user = userManager.findUser(userRequestId);
            console.log(`user found on ${event} socket event handler: ${user}`);

            // emit socket event to the rest
            emitEventOnSenderConnection(roomId, event, data, user);
        });
    }

    const onCreateMessage = (message: { type: string; id: number;
        message: string; create_time: string;
        chatroom_sent_id: number; user_sent_id?: number
    }, idToDeviceToken: Map<number, string>, userRequestId: number) =>
        handleFCMAndEventEmissionForData(idToDeviceToken, SocketEvents.createMessageType,
            message, userRequestId, message.chatroom_sent_id);

    const onEditMessage = (editFields: { type: string; id: number;
        message: string; create_time?: string;
        user_sent_id?: number; chatroom_sent_id: number
    }, idToDeviceToken: Map<number, string>, userRequestId: number) =>
        handleFCMAndEventEmissionForData(idToDeviceToken, SocketEvents.editMessageType,
            editFields, userRequestId, editFields.chatroom_sent_id);

    const onDeleteMessage = (deletePayload: { type: string; deletedId: number;
        chatroom_sent_id: number; user_sent_id: number;
    }, idToDeviceToken: Map<number, string>, userRequestId: number) =>
        handleFCMAndEventEmissionForData(idToDeviceToken, SocketEvents.deleteMessageType,
            deletePayload, userRequestId, deletePayload.chatroom_sent_id);

    // TODO: Implement
    // TODO: Tags and arrays are passed in as JSON/objects and simply stringified when they need to be sent
    const onJoinUser = (joinedUser: { type: string; }
        , idToDeviceToken: Map<number, string>, userRequestId: number) => {

    }

    const onLeaveUser = (editFields: { type: string; id: number; }
        , idToDeviceToken: Map<number, string>, userRequestId: number) => {

    }

    const onEditUser = (editFields: { type: string; id: number; }
        , idToDeviceToken: Map<number, string>, userRequestId: number
    ) => {

    }

    const onCreateEvent = (event: { type: string; id: number;
        name: string; photoUrl: string;
        startDate: string; date: string;
        lat: number; long: number;
        description?: string
    }, idToDeviceToken: Map<number, string>, userRequestId: number) => {

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

    const socketEventResolutionMap: { [event: string]: any } = {
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

    export const socketEventResolutionMapper = (event: string): any => {
        if(!(event in socketEventResolutionMap)) {
            throw new TypeError('Invalid event constant passed for socket event resolution mapping!');
        }

        return socketEventResolutionMap[event];
    }
}

export default SocketEventHandler;