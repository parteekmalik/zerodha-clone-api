import { Server as HttpServer } from "http";
import { Server, Socket } from "socket.io";
import env from "./env";
import { TPostReq } from "./utils/types";

export class ServerSocket {
    public static instance: ServerSocket;
    public io: Server;

    public socketidtouserandmatchid: { [socketid: string]: { uid: string; matchid: string } } = {};

    constructor(server: HttpServer) {
        ServerSocket.instance = this;
        this.io = new Server(server, {
            cors: {
                methods: ["GET", "POST"],
                origin: ["*", "http://localhost", "http://localhost:3000", "http://localhost:3000/zerodha", "https://zerodha-copy-next.vercel.app", "https://zerodha-copy-next.vercel.app/zerodha"],
            },
        });

        this.io.on("connect", this.StartListeners);
    }

    /** Master list of all connected users */
    public usersToID: Record<string, string> = {};
    public IdToUser: Record<string, string> = {};
    /** Master list of all matches */
    private superUserID: null | string = null;

    private StartListeners = (socket: Socket) => {
        console.info("connected to -> " + socket.id, socket.data);
        // Logging function to log all messages received
        const logMessage = (eventName: string, payload: any) => {
            console.log(`Received "${eventName}" message:`,typeof payload, payload);
        };

        // Generic event handler to catch all incoming messages
        socket.onAny((eventName, payload) => {
            logMessage(eventName, payload);
        });

        socket.on("order", async (payload: TPostReq) => {
            console.log("order recved ->", payload);
            const order: TPostReq = typeof payload === "string" ? JSON.parse(payload) : payload;
            const TradingAccountId = this.IdToUser[socket.id];
            if (TradingAccountId) {
                console.log("sending order to superuser ->", order);
                if (this.superUserID) this.io.to(this.superUserID).emit("addOrder", order);
                else console.log("superuser not connected");
            } else {
                this.io.to(socket.id).emit("unauthorised");
                socket.disconnect(true);
            }
        });
        socket.on("deleteOrder", async (payload: TPostReq) => {
            console.log("deleteOrder recved ->", payload);
            const deleteOrder: TPostReq = typeof payload === "string" ? JSON.parse(payload) : payload;
            const TradingAccountId = this.IdToUser[socket.id];
            if (TradingAccountId) {
                console.log("sending deleteOrder to superuser ->", deleteOrder);
                if (this.superUserID) this.io.to(this.superUserID).emit("deleteOrder", deleteOrder);
                else console.log("superuser not connected");
            } else {
                this.io.to(socket.id).emit("unauthorised");
                socket.disconnect(true);
            }
        });
        socket.on("sendNotification", async (payload: TPostReq[]) => {
            if (this.superUserID === socket.id)
                payload.map((item) => {
                    this.SendMessage("notification", item.TradingAccountId, item);
                });
            else {
                this.io.to(socket.id).emit("unauthorised");
                socket.disconnect(true);
            }
        });
        socket.on("authenticate", (payload: string) => {
            console.log(payload);
            const data = typeof payload === "string" ? JSON.parse(payload) : payload;
            // console.log(typeof data,data.TradingAccountId,!data, typeof data !== "object", !("TradingAccountId" in data), !data.TradingAccountId, data.TradingAccountId !== "");
            if (!data || typeof data !== "object" || !("TradingAccountId" in data) || !data.TradingAccountId || data.TradingAccountId === "") {
                console.log("Authentication failed");
                this.io.to(socket.id).emit("unauthorised");
                socket.disconnect(true);
            } else {
                const { TradingAccountId } = data as { TradingAccountId: string };
                // Check if the token is valid (e.g., verify the token with your authentication service)
                console.log("Authentication sucessful");
                if (TradingAccountId === env.BACKEND_SECRET_CODE) {
                    console.log("superuser conected");
                    this.superUserID = socket.id;
                } else {
                    this.usersToID[TradingAccountId] = socket.id;
                    this.IdToUser[socket.id] = TradingAccountId;
                }
                console.log(this.usersToID);
                console.log(this.IdToUser);
            }
        });

        socket.on("disconnect", (payload) => {
            console.info("payload 'Disconnect' : ", payload);
            const user = this.IdToUser[socket.id];
            const id = this.usersToID[user];
            delete this.usersToID[user];
            delete this.IdToUser[id];
        });
    };

    GetUidFromSocketID = (id: string) => {
        return Object.keys(this.usersToID).find((uid) => this.usersToID[uid] === id);
    };

    SendMessage = (name: string, TradingAccountId: string, payload: Object) => {
        const id = this.usersToID[TradingAccountId];
        console.info("Emitting event: " + name + " to", id);
        console.log(TradingAccountId, id, this.usersToID);

        this.io.to(id).emit(name, payload);
    };
}
