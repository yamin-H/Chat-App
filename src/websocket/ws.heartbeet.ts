import { WebSocketServer } from "ws";
import { AuthenticatedWebsocket } from "./ws.registery";
import { logger } from "../config/logger";

const HEARTBEAT_INTERVAL = 30_000;

export function setupHeartBeat(wss: WebSocketServer): NodeJS.Timeout {
    const interval = setInterval(() => {
        let alive = 0;
        let terminated = 0;

        wss.clients.forEach((ws) => {
            const socket = ws as AuthenticatedWebsocket;
            if (!socket.isAlive) {
                logger.debug(`Terminating dead socket for user ${socket.userId}`);
                socket.terminate();
                terminated++;
                return;
            }

            socket.isAlive = false;
            socket.ping();
            alive++;
        });

        if (alive > 0 || terminated > 0) {
            logger.debug(`Heartbeat: ${alive} alive, ${terminated} terminated`);
        }
    }, HEARTBEAT_INTERVAL);

    return interval;
}