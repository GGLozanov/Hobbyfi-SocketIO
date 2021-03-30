import {SocketId} from "socket.io-adapter";
import SocketUser from "../model/socket_user";
import IdSocketModel from "../model/id_socket_model";

// shouldn't be here but do I type like I care
export class ExpandedSet<T> extends Set<T> {
    find(predicate: (value: T) => boolean): T {
        const entries = Array.from(this.entries())
        for(const [value] of entries) {
            if (predicate(value)) return value;
        }
        return null;
    }
    
    deleteByPredicate(predicate: (value: T) => boolean): T {
        const entries = Array.from(this.entries())
        for(const [value] of entries) {
            if (predicate(value)) {
                this.delete(value);
                return value;
            }
        }
        return null;
    }

    includes(value: T): boolean {
        return this.find((val) => val === value) != null;
    }

    replace(predicate: (value: T) => boolean, val: T): boolean {
        const entries = Array.from(this.entries())
        for(const [value] of entries) {
            if (predicate(value)) {
                this.delete(value);
                this.add(val);
                return true;
            }
        }
        return false;
    }

    filter(predicate: (v: T) => boolean) {
        const newSet = new ExpandedSet<T>()
        const entries = Array.from(this.entries())
        for(const [value] of entries) {
            if (predicate(value)) newSet.add(value)
        }
        return newSet
    }

    map<V>(transform: (v: T) => V): ExpandedSet<V> {
        const newSet = new ExpandedSet<V>()
        const entries = Array.from(this.entries())
        for(const [value] of entries) {
            newSet.add(transform(value));
        }
        return newSet
    }
}

class UserManager {
    roomUsers: ExpandedSet<SocketUser>; // users in a given room
    mainUsers: ExpandedSet<IdSocketModel>; // users in Main screen (filter FCM and do not send messages while connected)

    constructor(initialUsers: ExpandedSet<SocketUser> = new ExpandedSet([]),
                mainUsers: ExpandedSet<IdSocketModel> = new ExpandedSet([])) {
        this.roomUsers = initialUsers;
        this.mainUsers = mainUsers;
    }

    addMainUserDistinct(user: IdSocketModel): void {
        console.log(`Adding MAIN OUTER SOCKET user DISTINCT`);
        this.mainUsers.add(user);
    }

    addRoomUserDistinct(user: SocketUser): void {
        console.log(`Adding ROOM SOCKET user DISTINCT`);
        this.roomUsers.add(user);
    }

    pruneMainUserBySocketId(id: SocketId): IdSocketModel {
        return this.mainUsers.deleteByPredicate(user => user.socket.id === id);
    }

    pruneMainUserById(id: number): IdSocketModel {
        return this.mainUsers.deleteByPredicate(user => user.id === id);
    }

    pruneRoomUserById(id: number): SocketUser {
        return this.roomUsers.deleteByPredicate(user => user.id === id);
    }

    pruneRoomUserBySocketId(id: SocketId): SocketUser {
        return this.roomUsers.deleteByPredicate(user => user.socket.id === id);
    }

    findRoomUser(id: number): SocketUser {
        console.log(`find ROOM SOCKET user Id query: ${id}`)
        return this.roomUsers.find((user) => {
            console.log(`ROOM SOCKET user find current id: ${user.id}`);
            return user.id == id;
        });
    }

    findMainUser(id: number): IdSocketModel {
        console.log(`find MAIN OUTER SOCKET user Id query: ${id}`)
        return this.mainUsers.find((user) => {
            console.log(`MAIN OUTER SOCKET user find current id: ${user.id}`);
            return user.id == id;
        });
    }
}

const userManager = new UserManager();
export default userManager;