import {SocketId} from "socket.io-adapter";
import SocketUser from "../model/socket_user";

class UserManager {
    users: SocketUser[];

    constructor(initialUsers: SocketUser[] = []) {
        this.users = initialUsers;
    }

    addUserDistinct(user: SocketUser): void {
        if(this.users.indexOf(user) === -1) {
            this.users.push(user);
        }
    }

    // ah, filter in lieu of splice - truly the pinnacle of suboptimal performance brought upon by
    // the language with the most annoying API for removing an element from an array!
    pruneUser(id: number): void {
        this.users = this.users.filter((user, _) => user.id == id);
    }

    pruneUserBySocketId(id: SocketId): void {
        this.users = this.users.filter((user, _) => user.socket.id == id);
    }

    findUser(id: number): SocketUser {
        return this.users.find((user, _) => user.id == id);
    }

    findUserBySocketId(id: SocketId): SocketUser {
        return this.users.find((user: SocketUser, _) => user.socket.id == id);
    }

    findUserByRoomId(id: number): SocketUser {
        return this.users.find((user, _) => user.roomId == id);
    }
}

const userManager = new UserManager();
export default userManager;