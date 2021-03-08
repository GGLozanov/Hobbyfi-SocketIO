import {Socket} from "socket.io";
import io from "./routing";
import SocketUser from "../model/socket_user";

const stringWithSocketRoomPrefix = require('../utils/converters');

import userManager from "../handler/user_manager";

export default io.on('connection', (socket: Socket) => {
    console.log('New user connected');

    socket.on('connect', () => {
        console.log('New user connected [Confirm]');
        // socket.sendBuffer = []; // empty send buffer for emissions queued up for offline unavailability
        // refresh connection should be handled in clients through API refetch
    });

    socket.on('join_chatroom', (data) => {
        // receive the id in the form of data IMMEDIATELY after connection
        // set SocketUser ID: i.e. socketUser.id = 1; etc. (don't use socket ID because that may interfere w/ Socket.IO)
        // contain a SocketUser list somewhere as well...
        console.log(`join_chatroom event received with data: ${JSON.stringify(data)}`)
        userManager.addUserDistinct(new SocketUser(data.id, data.chatroom_id, socket));

        socket.join(stringWithSocketRoomPrefix(data.chatroom_id.toString()));
    });

    socket.on('disconnect', () => {
        const user = userManager.findUserBySocketId(socket.id);
        userManager.pruneUserBySocketId(socket.id);
        socket.leave(stringWithSocketRoomPrefix(user.roomId.toString()));

        console.log('User disconnected');
    });
});