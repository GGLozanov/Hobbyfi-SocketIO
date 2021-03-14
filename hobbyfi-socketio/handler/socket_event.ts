import {messaging} from "firebase-admin/lib/messaging";
import DataMessagePayload = messaging.DataMessagePayload;
import flatten from "../utils/flattener";

// holy shit do I suck at this language
import SocketUser from "../model/socket_user";
import IdToken from "../model/id_token";
import RoomIdToken from "../model/room_id_token";
import userManager from "../handler/user_manager";
import io from "../entrypoint/routing";
import Message from "../model/message";
import {plainToClass} from "class-transformer";
import IdTypeModel from "../model/id_type_model";
import User from "../model/user";
import Event from "../model/event";
import Chatroom from "../model/chatroom";

const stringWithSocketRoomPrefix = require('../utils/converters');
const fcm = require('../config/firebase_config');
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

    function getUsersDeviceTokens(socketUsersIds: number[], idToDeviceToken: IdToken[]) {
        if(socketUsersIds.length > 0) {
            return idToDeviceToken.filter((idToken: IdToken) => {
                console.log(`id token ID: ${idToken.id}`);
                return socketUsersIds.includes(idToken.id);
            });
        } else return idToDeviceToken;
    }

    function getDisconnectedUsersDeviceTokens(idToDeviceToken: IdToken[], roomId: number): string[] {
        const socketUserIdsChatroom: number[] = userManager.users.filter((user: SocketUser) =>
            user.roomId == roomId
        ).map((user: SocketUser) => user.id);
        console.log(socketUserIdsChatroom);

        return flatten(getUsersDeviceTokens(socketUserIdsChatroom, idToDeviceToken)
            .map((idToken) => idToken.deviceToken));
    }

    function getInactiveChatroomUsersDeviceTokens(idToDeviceToken: IdToken[]): string[] {
        const socketUserIdsActive: number[] = userManager.users.filter((user: SocketUser) =>
            user.roomId == null
        ).map((user: SocketUser) => user.id);
        console.log(`User IDs from inactive users device tokens: ${socketUserIdsActive}`);

        return flatten(getUsersDeviceTokens(socketUserIdsActive, idToDeviceToken)
            .map((idToken) => idToken.deviceToken));
    }

    function emitEventOnSenderConnection(roomId: number, event: string, message: object, sender?: SocketUser) {
        if(!sender || !sender.socket.connected) {
            io.to(stringWithSocketRoomPrefix(roomId.toString()))
                .emit(event, message);
        } else {
            sender.socket.to(stringWithSocketRoomPrefix(roomId.toString()))
                .emit(event, message);
        }
    }

    // map is number to string array due to users being able to log in through multiple devices
    function handleFCMAndEventEmissionForData(idToDeviceToken: IdToken[], event: string,
                                              data: object, userRequestId: number, roomId: number) {
        const disconnectedInactiveUsersTokens = getInactiveChatroomUsersDeviceTokens(idToDeviceToken);
        const rawDisconnectedUsersTokens = getDisconnectedUsersDeviceTokens(idToDeviceToken, roomId);
        const disconnectedUsersTokens = rawDisconnectedUsersTokens.filter((token) =>
            disconnectedInactiveUsersTokens.includes(token));

        console.log(`disconnected user tokens: ${disconnectedUsersTokens}`);
        console.log(`disconnected user INACTIVE tokens: ${disconnectedInactiveUsersTokens}`);
        if(rawDisconnectedUsersTokens.length > 0 || disconnectedInactiveUsersTokens.length > 0) {
            const onFCMNotificationsSent = (r: MessagingDevicesResponse) => {
                console.log(`FCM for event ${event} failure & success count. F: ${r.failureCount}; S: ${r.successCount}`);
                emitEventToRoom(userRequestId, roomId, event, data);
            };

            fcm.sendToDevice(disconnectedUsersTokens, { data: stringifyObjectProps(data) })
                .then(onFCMNotificationsSent);

            if(SocketEvents.isPushNotificationEvent(event)) {
                fcm.sendToDevice(disconnectedInactiveUsersTokens.filter(
                        (disconnInactiveTokens) => rawDisconnectedUsersTokens.includes(disconnInactiveTokens)),
                    { data: stringifyObjectProps(data) })
                    .then(onFCMNotificationsSent);
            }
        } else {
            emitEventToRoom(userRequestId, roomId, event, data);
        }
    }

    function emitEventToRoom(userRequestId: number, roomId: number, event: string, data: object) {
        let user = userManager.findUser(userRequestId);
        console.log(`user found on ${event} socket event handler: ${user}`);

        // emit socket event to the rest
        emitEventOnSenderConnection(roomId, event, data, user);
    }

    function getDisconnectedUsersRoomDeviceTokens(roomIdToIdAndDeviceToken: RoomIdToken[], roomIds: number[]): string[][] {
        return roomIdToIdAndDeviceToken.map((roomIdToken: RoomIdToken) =>
            getDisconnectedUsersDeviceTokens(roomIdToken.idTokens, roomIdToken.roomId));
    }

    function emitEventToRooms(userRequestId: number, roomIds: number[], event: string, data: object) {
        // TODO: Emit to multiple rooms (used by LEAVE_USER and EDIT_USER)
    }

    function handleFCMAndEventEmissionForDataToRooms(roomIdToIdAndDeviceToken: RoomIdToken[], event: string,
                                                     data: object, userRequestId: number, roomIds: number[]) {
        // TODO: Handle emission to multiple rooms (used by LEAVE_USER and EDIT_USER)
    }

    const onCreateMessage = (message: object, idToDeviceToken: IdToken[], userRequestId: number, roomId: number) => {
        handleFCMAndEventEmissionForData(idToDeviceToken, SocketEvents.createMessageType,
            plainToClass(Message, message, { excludeExtraneousValues: true }), userRequestId, roomId);
    }

    const onEditMessage = (editFields: object, idToDeviceToken: IdToken[], userRequestId: number, roomId: number) =>
        handleFCMAndEventEmissionForData(idToDeviceToken, SocketEvents.editMessageType,
            plainToClass(Message, editFields, { excludeExtraneousValues: true }), userRequestId, roomId);

    const onDeleteMessage = (deletePayload: object, idToDeviceToken: IdToken[], userRequestId: number, roomId: number) =>
        handleFCMAndEventEmissionForData(idToDeviceToken, SocketEvents.deleteMessageType,
            plainToClass(IdTypeModel, deletePayload, { excludeExtraneousValues: true }), userRequestId, roomId);

    // TODO: Implement
    // TODO: Tags and arrays are passed in as JSON/objects and simply stringified when they need to be sent
    const onJoinUser = (joinedUser: object, idToDeviceToken: IdToken[], userRequestId: number, roomId: number) =>
        handleFCMAndEventEmissionForData(idToDeviceToken, SocketEvents.userJoinType,
            plainToClass(User, joinedUser, { excludeExtraneousValues: true }), userRequestId, roomId);

    // TODO: Handle batch notifications by parsing the chatroom_ids property and translating it to room ids and sending emissions to all rooms with those ids

    // TODO: Handle leave_user being able to have both array of roomids and just a roomid
    const onLeaveUser = (leaveUser: object
        , idToDeviceToken: IdToken[], userRequestId: number, roomId: number) =>
        handleFCMAndEventEmissionForData(idToDeviceToken, SocketEvents.userLeaveType,
            plainToClass(User, leaveUser, { excludeExtraneousValues: true }), userRequestId, roomId);

    const onLeaveUserKick = (kickedUser: object
        , roomIdToIdAndDeviceToken: RoomIdToken[], userRequestId: number, roomIds: number[]) =>
        handleFCMAndEventEmissionForDataToRooms(roomIdToIdAndDeviceToken, SocketEvents.userLeaveType,
            plainToClass(User, kickedUser, { excludeExtraneousValues: true }), userRequestId, roomIds);

    const onEditUser = (editFields: User
        , roomIdToIdAndDeviceToken: RoomIdToken[], userRequestId: number, roomIds: number[]
    ) =>
        handleFCMAndEventEmissionForDataToRooms(roomIdToIdAndDeviceToken, SocketEvents.userEditType,
            plainToClass(User, editFields, { excludeExtraneousValues: true }), userRequestId, roomIds);

    const onCreateEvent = (event: object, idToDeviceToken: IdToken[],
                           userRequestId: number, roomId: number) =>
        handleFCMAndEventEmissionForData(idToDeviceToken, SocketEvents.eventCreateType,
            plainToClass(Event, event, { excludeExtraneousValues: true }), userRequestId, roomId);

    const onDeleteEvent = (deletePayload: object, idToDeviceToken: IdToken[],
                           userRequestId: number, roomId: number) =>
        handleFCMAndEventEmissionForData(idToDeviceToken, SocketEvents.eventDeleteType,
            plainToClass(IdTypeModel, deletePayload, { excludeExtraneousValues: true }), userRequestId, roomId);

    const onDeleteEventBatch = (deleteBatchPayload: object, idToDeviceToken: IdToken[],
                                userRequestId: number, roomId: number) =>
        handleFCMAndEventEmissionForData(idToDeviceToken, SocketEvents.eventDeleteBatchType,
            plainToClass(IdTypeModel, deleteBatchPayload, { excludeExtraneousValues: true }), userRequestId, roomId);

    const onEditEvent = (editFields: object, idToDeviceToken: IdToken[], userRequestId: number, roomId: number) =>
        handleFCMAndEventEmissionForData(idToDeviceToken, SocketEvents.eventEditType,
            plainToClass(Event, editFields, { excludeExtraneousValues: true }), userRequestId, roomId)

    const onEditChatroom = (editFields: object, idToDeviceToken: IdToken[], userRequestId: number, roomId: number) =>
        handleFCMAndEventEmissionForData(idToDeviceToken, SocketEvents.editChatroomType,
            plainToClass(Chatroom, editFields, { excludeExtraneousValues: true }), userRequestId, roomId)

    const onDeleteChatroom = (deleteBatchPayload: object, idToDeviceToken: IdToken[],
                              userRequestId: number, roomId: number) =>
        handleFCMAndEventEmissionForData(idToDeviceToken, SocketEvents.deleteChatroomType,
            plainToClass(Chatroom, deleteBatchPayload, { excludeExtraneousValues: true }), userRequestId, roomId)

    const socketEventResolutionMap: { [event: string]: any } = {
        [SocketEvents.createMessageType]: onCreateMessage,
        [SocketEvents.editMessageType]: onEditMessage,
        [SocketEvents.deleteMessageType]: onDeleteMessage,
        [SocketEvents.userJoinType]: onJoinUser,
        [SocketEvents.userLeaveType]: [onLeaveUser, onLeaveUserKick],
        [SocketEvents.userEditType]: onEditUser,
        [SocketEvents.deleteChatroomType]: onDeleteChatroom,
        [SocketEvents.editChatroomType]: onEditChatroom,
        [SocketEvents.eventCreateType]: onCreateEvent,
        [SocketEvents.eventEditType]: onEditEvent,
        [SocketEvents.eventDeleteType]: onDeleteEvent,
        [SocketEvents.eventDeleteBatchType]: onDeleteEventBatch
    };

    export function socketEventResolutionMapper(event: string): any {
        if(!(event in socketEventResolutionMap)) {
            throw new TypeError('Invalid event constant passed for socket event resolution mapping!');
        }

        return socketEventResolutionMap[event];
    }
}

export default SocketEventHandler;