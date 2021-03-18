import {SocketId} from "socket.io-adapter";
import SocketUser from "../model/socket_user";
import IdSocketModel from "../model/id_socket_model";

class UserManager {
    roomUsers: SocketUser[]; // users in a given room
    mainUsers: IdSocketModel[]; // users in Main screen (filter FCM and do not send messages while connected)

    constructor(initialUsers: SocketUser[] = [], mainUsers: IdSocketModel[] = []) {
        this.roomUsers = initialUsers;
        this.mainUsers = mainUsers;
    }

    addMainUserDistinct(user: IdSocketModel): void {
        if(this.mainUsers.indexOf(user) === -1) {
            console.log(`Adding MAIN OUTER SOCKET user DISTINCT`);
            this.mainUsers.push(user);
        } else console.log(`Not adding MAIN OUTER SOCKET user DISTINCT`);
    }

    addRoomUserDistinct(user: SocketUser): void {
        if(this.roomUsers.indexOf(user) === -1) {
            console.log(`Adding ROOM SOCKET user DISTINCT`);
            this.roomUsers.push(user);
        } else console.log(`Not adding ROOM SOCKET user DISTINCT`);
    }

    pruneMainUserBySocketId(id: SocketId): IdSocketModel {
        const pruneUserIndex = this.mainUsers.findIndex(user => user.socket.id == id);

        if (pruneUserIndex !== -1) {
            return this.mainUsers.splice(pruneUserIndex, 1)[0];
        }
        return null;
    }

    pruneRoomUserBySocketId(id: SocketId): SocketUser {
        const pruneUserIndex = this.roomUsers.findIndex(user => user.socket.id == id);

        if (pruneUserIndex !== -1) {
            return this.roomUsers.splice(pruneUserIndex, 1)[0];
        }
        return null;
    }

    findRoomUser(id: number): SocketUser {
        console.log(`find ROOM SOCKET user Id query: ${id}`)
        return this.roomUsers.find((user, _) => {
            console.log(`ROOM SOCKET user find current id: ${user.id}`);
            return user.id == id;
        });
    }

    findMainUser(id: number): IdSocketModel {
        console.log(`find MAIN OUTER SOCKET user Id query: ${id}`)
        return this.mainUsers.find((user, _) => {
            console.log(`MAIN OUTER SOCKET user find current id: ${user.id}`);
            return user.id == id;
        });
    }

    replaceRoomUserWithId(id: number, user: SocketUser) {
        const oldUser = this.findRoomUser(id);

        if (oldUser !== undefined) {
            this.mainUsers[this.mainUsers.indexOf(oldUser)] = user;
        } else {
            throw new Error('Invalid replace call to nonexistent ROOM SOCKET user!');
        }

        return oldUser;
    }

    replaceMainUserWithId(id: number, user: IdSocketModel) {
        const oldUser = this.findMainUser(id);

        if (oldUser !== undefined) {
            this.mainUsers[this.mainUsers.indexOf(oldUser)] = user;
        } else {
            throw new Error('Invalid replace call to nonexistent MAIN OUTER SOCKET user!');
        }

        return oldUser;
    }
}

const userManager = new UserManager();
export default userManager;