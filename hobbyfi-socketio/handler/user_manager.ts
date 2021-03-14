import {SocketId} from "socket.io-adapter";
import SocketUser from "../model/socket_user";

class UserManager {
    users: SocketUser[];

    constructor(initialUsers: SocketUser[] = []) {
        this.users = initialUsers;
    }

    addUserDistinct(user: SocketUser): void {
        if(this.users.indexOf(user) === -1 || !this.findUser(user.id)) {
            console.log(`Adding user DISTINCT`);
            this.users.push(user);
        } else console.log(`Not adding user DISTINCT`);
    }

    // ah, filter in lieu of splice - truly the pinnacle of suboptimal performance brought upon by
    // the language with the most annoying API for removing an element from an array!
    pruneUser(id: number): void {
        this.users = this.users.filter((user, _) => user.id == id);
    }

    pruneUserBySocketId(id: SocketId): SocketUser {
        const pruneUserIndex = this.users.findIndex(user => user.socket.id == id);

        if (pruneUserIndex !== -1) {
            return this.users.splice(pruneUserIndex, 1)[0];
        }
        return null;
    }

    findUser(id: number): SocketUser {
        console.log(`find user Id query: ${id}`)
        return this.users.find((user, _) => {
            console.log(`user find current id: ${user.id}`);
            return user.id == id;
        });
    }

    findUserBySocketId(id: SocketId): SocketUser {
        return this.users.find((user: SocketUser, _) => user.socket.id == id);
    }

    findUserByRoomId(id: number): SocketUser {
        return this.users.find((user, _) => user.roomId == id);
    }

    replaceUserWithId(id: number, user: SocketUser) {
        const oldUser = this.findUser(id);

        if (oldUser !== undefined) {
            this.users[this.users.indexOf(oldUser)] = user;
        } else {
            throw new Error('Invalid replace call to nonexistent user!');
        }

        return oldUser;
    }
}

const userManager = new UserManager();
export default userManager;