import { PrismaClient } from "@prisma/client";
import { Server as HttpServer } from "http";
import { Server, Socket } from "socket.io";
import { TFormSchema } from "./FrmSchema";
import WSbinance from "./orderExecution";

const prisma = new PrismaClient();
const WSbin = new WSbinance();

export class ServerSocket {
    public static instance: ServerSocket;
    public io: Server;

    public socketidtouserandmatchid: { [socketid: string]: { uid: string; matchid: string } } = {};

    constructor(server: HttpServer) {
        ServerSocket.instance = this;
        this.io = new Server(server, {
            // serveClient: false,
            // pingInterval: 10000,
            // pingTimeout: 5000,
            // cookie: false,
            cors: {
                origin: "*",
            },
        });

        this.io.on("connect", this.StartListeners);
    }

    /** Master list of all connected users */
    public usersToID: Record<string, string> = {};
    public IdToUser: Record<string, string> = {};
    /** Master list of all matches */

    private StartListeners = (socket: Socket) => {
        console.info("Message received from " + socket.id, socket.data);

        socket.on("order", (payload: string) => {
            // console.log("order recved ->", payload);
            const order = JSON.parse(payload.toString()) as TFormSchema;
            const TradingAccountId = this.IdToUser[socket.id];
            // WSbin.addOrder({ ...order, TradingAccountId });
        });
        socket.on("authenticate", (payload: string) => {
            console.log(payload);
            const { TradingAccountId } = JSON.parse(payload) as { TradingAccountId: string };
            // Check if the token is valid (e.g., verify the token with your authentication service)
            if (TradingAccountId && TradingAccountId !== "") {
                console.log("Authentication sucessful");
                this.usersToID[TradingAccountId] = socket.id;
                this.IdToUser[socket.id] = TradingAccountId;
            } else {
                console.log("Authentication failed");
                socket.disconnect(true);
            }
            console.log(this.usersToID);
            console.log(this.IdToUser);
        });
        // socket.on("handshake", (payload: { TradingAccountId: string }) => {
        //     console.info("Handshake received from: " + socket.id);
        //     console.info(" payload 'handshake' ->", JSON.stringify(payload));
        //     this.OnHandshake(payload, socket);
        // });

        socket.on("disconnect", (payload) => {
            console.info("payload 'Disconnect' : ", payload);
            const user = this.IdToUser[socket.id];
            const id = this.usersToID[user];
            delete this.usersToID[user];
            delete this.IdToUser[id];
        });
    };

    private OnHandshake = (payload: { TradingAccountId: string }, socket: Socket) => {};

    GetUidFromSocketID = (id: string) => {
        return Object.keys(this.usersToID).find((uid) => this.usersToID[uid] === id);
    };

    SendMessage = (name: string, id: string, payload?: Object) => {
        console.info("Emitting event: " + name + " to", id);
        payload ? this.io.to(id).emit(name, payload) : this.io.to(id).emit(name);
    };
}
