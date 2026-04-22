import { WebSocket } from 'ws'
import { logger } from '../config/logger'

export interface AuthenticatedWebsocket extends WebSocket {
    userId: string;
    isAlive: boolean;
    socketId: string;
};

class ConnectionRegistory{
    private connections = new Map<string, Set<AuthenticatedWebsocket>>();

    add(userId: string, ws: AuthenticatedWebsocket) {
        if (!this.connections.has(userId)) {
            this.connections.set(userId, new Set());
        }
        this.connections.get(userId)!.add(ws);
        logger.debug(`Registry: added socket for user ${userId}  (total: ${this.getCount(userId)})`);
    }

    remove(userId: string, ws: AuthenticatedWebsocket) {
        const sockets = this.connections.get(userId);
        if (!sockets) return;

        sockets.delete(ws);
        if (sockets.size === 0) {
            this.connections.delete(userId);
        }
        logger.debug(`Registry: removed socket for user ${userId} (remaining: ${this.getCount(userId)})`);
    }

    hasConnections(userId: string): boolean {
        return (this.connections.get(userId)?.size ?? 0) > 0;
    }

    getCount(userId: string): number {
        return this.connections.get(userId)?.size ?? 0
    }

    sendToUsers(userId: string, data: object): boolean {
        const sockets = this.connections.get(userId);
        if (!sockets || sockets.size === 0) return false;

        const payload = JSON.stringify(data);
        let sent = false;

        for (const ws of sockets) {
            if (ws.readyState === WebSocket.OPEN) {
                ws.send(payload);
                sent = true;
            }
        }

        return sent;
    }

    getAllConnectedUsersIds(): string[]{
        return Array.from(this.connections.keys());
    }

    getTotalConnections(): number {
        let total = 0;
        for (const sockets of this.connections.values()) {
            total += sockets.size;
        }

        return total;
    }
};

export const registory = new ConnectionRegistory();