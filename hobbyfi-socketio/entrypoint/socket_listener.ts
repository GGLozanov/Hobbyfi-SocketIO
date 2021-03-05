import { io } from "./routing";
import Models from "../model/socket_user";
import SocketUser = Models.SocketUser;
import {stringWithSocketRoomPrefix} from "../utils/converters";

const userManager = require('../handler/user_manager');

io.on('connection', (socket) => {
    console.log('New user connected');

    socket.on('connect', () => {
        socket.sendBuffer = []; // empty send buffer for emissions queued up for offline unavailability
        // refresh connection should be handled in clients through API refetch
    });

    socket.on('join_chatroom', (data) => {
        // receive the id in the form of data IMMEDIATELY after connection
        // set SocketUser ID: i.e. socketUser.id = 1; etc. (don't use socket ID because that may interfere w/ Socket.IO)
        // contain a SocketUser list somewhere as well...
        userManager.addUser(new SocketUser(data.id, data.roomId, socket));

        socket.join(stringWithSocketRoomPrefix(data.roomId.toString()));
    });

    socket.on('disconnect', () => {
        userManager.pruneUserBySocketId(socket.id);

        console.log('user disconnected');
    });
});