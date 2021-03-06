const SocketUser = require('../model/socket_user.ts').SocketUser;
import {SocketId} from "socket.io-adapter";

class UserManager {
    users: typeof SocketUser[] = [];

    constructor(initialUsers: typeof SocketUser[] = []) {
        this.users = initialUsers;
    }

    addUser(user: typeof SocketUser): void {
        this.users.push(user);
    }

    // ah, filter in lieu of splice - truly the pinnacle of suboptimal performance brought upon by
    // the language with the most annoying API for removing an element from an array!
    pruneUser(id: number): void {
        this.users = this.users.filter((user, _) => user.id == id);
    }

    pruneUserBySocketId(id: SocketId): void {
        this.users = this.users.filter((user, _) => user.socket.id == id);
    }

    findUser(id: number): typeof SocketUser {
        return this.users.find((user, _) => user.id == id);
    }

    findUserBySocketId(id: SocketId): typeof SocketUser {
        return this.users.find((user, _) => user.socket.id == id);
    }

    findUserByRoomId(id: number): typeof SocketUser {
        return this.users.find((user, _) => user.roomId == id);
    }
}

const instance = new UserManager();
export default instance;