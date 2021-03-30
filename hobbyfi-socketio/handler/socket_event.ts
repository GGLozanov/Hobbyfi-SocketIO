import {messaging} from "firebase-admin/lib/messaging";
import DataMessagePayload = messaging.DataMessagePayload;
import flatten from "../utils/flattener";

// holy shit do I suck at this language
import SocketUser from "../model/socket_user";
import IdToken from "../model/id_token";
import RoomIdToken from "../model/room_id_token";
import userManager, {ExpandedSet} from "../handler/user_manager";
import io from "../entrypoint/routing";
import Message from "../model/message";
import {classToPlain, plainToClass} from "class-transformer";
import IdTypeModel from "../model/id_type_model";
import User from "../model/user";
import Event from "../model/event";
import Chatroom from "../model/chatroom";
import {Socket} from "socket.io";
import IdSocketModel from "../model/id_socket_model";
import {AxiosError, AxiosResponse} from "axios";

const stringWithSocketRoomPrefix = require('../utils/converters');
const fcm = require('../config/firebase_config');
const SocketEvents = require('../config/events');
const axios = require('axios');
const fs = require('fs');
const qs = require('qs');

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
    // update: last words said before disaster

    function socketInRoom(socket: Socket, roomId: number): boolean {
        return Object.keys(socket.rooms).includes(stringWithSocketRoomPrefix(roomId.toString()))
    }

    import MessagingDevicesResponse = messaging.MessagingDevicesResponse;
    import MessagingDeviceResult = messaging.MessagingDeviceResult;

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

    function filterUsersDeviceTokensByConnectedSockets(idToDeviceToken: IdToken[],
                                                       sourceArray: ExpandedSet<IdSocketModel>,
                                                       oppositeArray: ExpandedSet<IdSocketModel>): string[] {
        const socketUserIdsChatroom: number[] = Array.from(sourceArray
            .filter((user: IdSocketModel) => !oppositeArray.includes(user))
            .map((user: IdSocketModel) => user.id).keys());
        console.log(socketUserIdsChatroom);

        return flatten(getUsersDeviceTokens(socketUserIdsChatroom, idToDeviceToken)
            .map((idToken) => idToken.deviceTokens));
    }

    function emitEventToRoomOnSenderConnection(roomId: number, event: string, message: any, sender?: SocketUser) {
        console.log(`DATA EMITTING TO ROOM WITH ID ${roomId}: ${JSON.stringify(classToPlain(message))}`);
        if(!sender || !sender.socket.connected ||
                (event == SocketEvents.userLeaveType && message.id != sender?.id) ||
                (event == SocketEvents.createMessageType && !message.user_sent_id)) {
            io.to(stringWithSocketRoomPrefix(roomId.toString()))
                .emit(event, classToPlain(message));
        } else {
            sender.socket.to(stringWithSocketRoomPrefix(roomId.toString()))
                .emit(event, classToPlain(message));
        }
    }

    function processFCMAndEventEmissionForData(
        rawDisconnectedUsersTokens: string[], disconnectedInactiveUsersTokens: string[],
        event: string,
        data: any, rooms: number[], onEmission: () => void
    ) {
        // clean up possible duplicates
        rawDisconnectedUsersTokens = [...new Set(rawDisconnectedUsersTokens.filter(
            (rawDisconnectedTokens: string) => disconnectedInactiveUsersTokens.includes(rawDisconnectedTokens)
        ))];
        disconnectedInactiveUsersTokens = [...new Set(disconnectedInactiveUsersTokens.filter(
            (disconnInactiveTokens) => rawDisconnectedUsersTokens.includes(disconnInactiveTokens)))];

        const anyDisconnected = rawDisconnectedUsersTokens.length > 0;
        const anyInactive = disconnectedInactiveUsersTokens.length > 0;

        console.log(`disconnected ROOM user tokens: ${rawDisconnectedUsersTokens}`);
        console.log(`disconnected MAIN USER INACTIVE tokens: ${disconnectedInactiveUsersTokens}`);

        // FCM Foreground reactivation doesn't exist because apparently Android does *not* suspend network activity
        // for standby? Or it isn't documented. Weird. Just send FCM for push notifications then.
        if(SocketEvents.isPushNotificationEvent(event) && (anyDisconnected || anyInactive)) {
            const onFCMNotificationsSent = (r: MessagingDevicesResponse, tokens: string[]) => {
                console.log(`FCM for event ${event} failure & success count. F: ${r.failureCount}; S: ${r.successCount}`);
                if(r.failureCount > 0) {
                    handleFailedFCMMessages(r.results, tokens);
                }
                onEmission();
            };

            data.roomIds = rooms; // add special roomIds prop
            // two token arrays should be equivalent - for now, meaning the mapping is useless (FOR NOW), but left for the Future:tm:
            fcm.sendToDevice(rawDisconnectedUsersTokens, { data: stringifyObjectProps(data) })
                .then((r: MessagingDevicesResponse) => onFCMNotificationsSent(r, rawDisconnectedUsersTokens));
            // if(anyDisconnected) {
            //     fcm.sendToDevice(rawDisconnectedUsersTokens, { data: stringifyObjectProps(data) })
            //         .then((r: MessagingDevicesResponse) => onFCMNotificationsSent(r, rawDisconnectedUsersTokens));
            // }
            //
            // if(SocketEvents.isPushNotificationEvent(event) && anyInactive) {
            //     // .filter(
            //     //                     (disconnInactiveTokens) => rawDisconnectedUsersTokens.includes(disconnInactiveTokens))
            //     fcm.sendToDevice(disconnectedInactiveUsersTokens,
            //         { data: stringifyObjectProps(data) })
            //         .then((r: MessagingDevicesResponse) => onFCMNotificationsSent(r, disconnectedInactiveUsersTokens));
            // }
        } else {
            onEmission();
        }
    }

    // map is number to string array due to users being able to log in through multiple devices
    function handleFCMAndEventEmissionForData(idToDeviceToken: IdToken[], event: string,
                                              data: object, userRequestId: number, roomId: number) {
        const disconnectedInactiveUsersTokens =  filterUsersDeviceTokensByConnectedSockets(idToDeviceToken, userManager.mainUsers, userManager.roomUsers);
                // getInactiveChatroomUsersDeviceTokens(idToDeviceToken, roomId);
        const rawDisconnectedUsersTokens = filterUsersDeviceTokensByConnectedSockets(idToDeviceToken, userManager.roomUsers, userManager.mainUsers);
        // const disconnectedUsersTokens = rawDisconnectedUsersTokens.filter((token) =>
        //     !disconnectedInactiveUsersTokens.includes(token));
        // const filteredInactiveUserTokens = disconnectedInactiveUsersTokens.filter(
        //     (disconnInactiveTokens) => rawDisconnectedUsersTokens.includes(disconnInactiveTokens));
        // room tokens take precedence over inactive => exclude any that match w/ rawDisconnectedUsersTokens

        processFCMAndEventEmissionForData(rawDisconnectedUsersTokens,
            disconnectedInactiveUsersTokens, event, data, [roomId],() => emitEventToRoom(userRequestId, roomId, event, data));
    }

    function emitEventToRoom(userRequestId: number, roomId: number, event: string, data: object) {
        let user = userManager.findRoomUser(userRequestId);
        console.log(`user found on ${event} socket event handler: ${user}`);

        // emit socket event to the rest
        emitEventToRoomOnSenderConnection(roomId, event, data, user);
    }

    function getDisconnectedUsersRoomDeviceTokens(roomIdToIdAndDeviceToken: RoomIdToken[]): string[] {
        return flatten(roomIdToIdAndDeviceToken.map((roomIdToken: RoomIdToken) =>
            filterUsersDeviceTokensByConnectedSockets(roomIdToken.idTokens, userManager.roomUsers, userManager.mainUsers)));
    }

    function getInactiveUsersRoomDeviceTokens(roomIdToIdAndDeviceToken: RoomIdToken[]): string[] {
        return flatten(roomIdToIdAndDeviceToken.map((roomIdToken: RoomIdToken) =>
            // getInactiveChatroomUsersDeviceTokens(roomIdToken.idTokens, roomIdToken.roomId))
            filterUsersDeviceTokensByConnectedSockets(roomIdToken.idTokens, userManager.mainUsers, userManager.roomUsers)
        ));
    }

    function emitEventToRoomsOnSenderConnection(roomIds: number[], event: string, data: object, sender: SocketUser) {
        console.log(`DATA EMITTING TO ROOM: ${JSON.stringify(classToPlain(data))}`);
        if(!sender || !sender.socket.connected) {
            io.to(roomIds.map((roomId: number) => stringWithSocketRoomPrefix(roomId.toString())))
                .emit(event, classToPlain(data));
        } else {
            sender.socket.to(roomIds.map((roomId: number) => stringWithSocketRoomPrefix(roomId.toString())))
                .emit(event, classToPlain(data));
        }
    }

    function emitEventToRooms(userRequestId: number, roomIds: number[], event: string, data: object) {
        let user = userManager.findRoomUser(userRequestId);

        emitEventToRoomsOnSenderConnection(roomIds, event, data, user);
    }

    function handleFCMAndEventEmissionForDataToRooms(roomIdToIdAndDeviceToken: RoomIdToken[], event: string,
                                                     data: object, userRequestId: number, roomIds: number[]) {
        const disconnectedInactiveUsersTokens = getInactiveUsersRoomDeviceTokens(roomIdToIdAndDeviceToken);
        const rawDisconnectedUsersTokens = getDisconnectedUsersRoomDeviceTokens(roomIdToIdAndDeviceToken);
        // const disconnectedUsersTokens = rawDisconnectedUsersTokens.filter((token) =>
        //     !disconnectedInactiveUsersTokens.includes(token));

        processFCMAndEventEmissionForData(rawDisconnectedUsersTokens, disconnectedInactiveUsersTokens,
            event, data, roomIds, () => emitEventToRooms(userRequestId, roomIds, event, data));
    }

    function handleFailedFCMMessages(results: MessagingDeviceResult[], tokens: string[]) {
        const failedTokens: string[] = [];
        results.forEach((result, idx) => {
            if(result.error) {
                failedTokens.push(tokens[idx]); // supposedly, the results array is kept intact & in order, so there should be no issue
            }
        });

        // TODO: Change API port & URL schema if hosted! MAY FAIL if NOT consistent!
        axios.delete('http://' + (process.env.serverHost || fs.readFileSync(__dirname + '/../keys/server_host.txt').toString())
                + ':8080/Hobbyfi-API/api/v1.0/token/cleanup_failed', {
            data: qs.stringify({
                device_tokens: failedTokens
            }),
            auth: {
                username: process.env.serverUsername ||
                    fs.readFileSync(__dirname + '/../keys/socket_server_username.txt').toString(),
                password: process.env.serverPassword ||
                    fs.readFileSync(__dirname + '/../keys/socket_server_password.txt').toString()
            },
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8'
            },
        }).then((response: AxiosResponse) => {
            console.log(`Server returned response for token deletion: ${JSON.stringify(response.data)}`);
        }).catch((reason: AxiosError) => {
            console.log(reason.toJSON());
        })
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