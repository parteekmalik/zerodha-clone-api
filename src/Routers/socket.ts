import { Server as HttpServer } from "http";
import { Socket, Server as SocketServer } from "socket.io";
import { NOTIFY_USER, NOTIFY_USER_PAYLOAD, SendMessageToSuperUserType, UPDATE_ORDER } from "../../WStypes/typeForBackendAndSocket";
import { AUTHENTICATION, AUTHENTICATION_PAYLOAD, BACKEND_SERVER_UPDATE, BACKEND_SERVER_UPDATE_PAYLOAD, NOTIFICATION, SendMessageToClientType } from "../../WStypes/typeForFrontendToSocket";
import { UPDATE_OR_ADD_ORDER, UPDATE_OR_ADD_ORDER_PAYLOAD } from "../../WStypes/typeForSocketToFrontend";
import verifyDiscordAccessToken from "../Auth/auth";
import env from "../env";
import { TOrder } from "../utils/types";

interface SocketWithContextType extends Socket {
    data: {
        tradingAccId: string;
        isSuperUser: boolean;
    };
}
export class ServerSocket {
    public static instance: ServerSocket;
    public io: SocketServer;

    public socketidtouserandmatchid: {
        [socketid: string]: { uid: string; matchid: string };
    } = {};

    constructor(server: HttpServer) {
        ServerSocket.instance = this;
        this.io = new SocketServer(server, {
            cors: {
                methods: ["GET", "POST"],
                origin: ["*", "http://localhost:3000", "https://zerodha-copy-next.vercel.app"],
            },
        });
        // Middleware to authenticate the token from the frontend
        this.io.use(async (socket: Socket, next) => {
            try {
                const token = socket.handshake.auth.token;
                if (token === env.BACKEND_SECRET_CODE) {
                    this.superUserID = socket.id;
                    socket.data.isSuperUser = true;
                } else {
                    const tradingAccId = (await verifyDiscordAccessToken(token))?.id;
                    socket.data.tradingAccId = tradingAccId;
                    socket.data.isSuperUser = false;
                }

                next(); // Continue to the next middleware or event handler
            } catch (error) {
                console.log("Authentication error: " + error);
                socket.disconnect(true);
            }
        });

        this.io.on("connect", this.StartListeners);
    }

    /** Master list of all connected users */
    public usersToID: Record<string, string> = {};
    /** Master list of all matches */
    private superUserID: null | string = null;

    private StartListeners = (socket: SocketWithContextType) => {
        console.info("connected to -> " + socket.id, socket.data);
        socketEmitter({ name: AUTHENTICATION, payload: "sucessful" });
        if (socket.data.tradingAccId) this.usersToID[socket.data.tradingAccId] = socket.id;
        if (this.superUserID) {
            if (socket.data.isSuperUser)
                this.SendMessageToClient({
                    data: { name: BACKEND_SERVER_UPDATE, payload: "connected" },
                    TradingAccountId: "all",
                });
            else socketEmitter({ name: BACKEND_SERVER_UPDATE, payload: "connected" });
        }
        // Logging function to log all messages received
        const logMessage = (eventName: string, payload: any) => {
            console.log(`Received "${eventName}" message:`, typeof payload, payload);
        };

        // Generic event handler to catch all incoming messages
        socket.onAny((eventName, payload) => {
            logMessage(eventName, payload);
        });

        socket.on(UPDATE_OR_ADD_ORDER, async (payload: UPDATE_OR_ADD_ORDER_PAYLOAD) => {
            const order: TOrder = typeof payload === "string" ? JSON.parse(payload) : payload;
            if (socket.data.tradingAccId !== order.TradingAccountId) disconnectWithUnathorizedMessage();

            if (this.superUserID) this.SendMessageToSuperUser({ name: UPDATE_ORDER, payload: order });
            else console.log("superuser not connected");
        });

        socket.on(NOTIFY_USER, async (payload: NOTIFY_USER_PAYLOAD) => {
            if (!socket.data.isSuperUser) disconnectWithUnathorizedMessage();
            this.SendMessageToClient({
                data: { name: NOTIFICATION, payload },
                TradingAccountId: payload.TradingAccountId,
            });
        });

        socket.on("disconnect", (payload) => {
            if (socket.id === this.superUserID) {
                this.superUserID = null;
                this.SendMessageToClient({
                    data: { name: BACKEND_SERVER_UPDATE, payload: "disconneted" },
                    TradingAccountId: "all",
                });
            } else {
                delete this.usersToID[socket.data.tradingAccId];
            }
        });
        const disconnectWithUnathorizedMessage = () => {
            socketEmitter({ name: AUTHENTICATION, payload: "unsucessful" });
            socket.disconnect(true);
        };
        function socketEmitter({
            name,
            payload,
        }:
            | {
                  name: typeof AUTHENTICATION;
                  payload: AUTHENTICATION_PAYLOAD;
              }
            | {
                  name: typeof BACKEND_SERVER_UPDATE;
                  payload: BACKEND_SERVER_UPDATE_PAYLOAD;
              }) {
            socket.emit(name, payload);
        }
    };
    SendMessageToClient = ({ TradingAccountId, data }: { data: SendMessageToClientType; TradingAccountId: string }) => {
        const { name, payload } = data;
        console.info("Emitting event: " + name + " to", this.usersToID[TradingAccountId], payload);
        if (!this.usersToID[TradingAccountId]) console.log("debug: ", this.usersToID);
        if (TradingAccountId === "all") this.io.emit(name, payload);
        else this.io.to(this.usersToID[TradingAccountId]).emit(name, payload);
    };
    SendMessageToSuperUser = ({ name, payload }: SendMessageToSuperUserType) => {
        if (!this.superUserID)
            this.SendMessageToClient({
                data: { name: BACKEND_SERVER_UPDATE, payload: "disconneted" },
                TradingAccountId: "all",
            });
        else {
            console.info("Emitting event: " + "superUser" + " to", payload);
            this.io.to(this.superUserID).emit(name, payload);
        }
    };
}
