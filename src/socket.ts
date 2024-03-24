import { $Enums, PrismaClient } from "@prisma/client";
import axios from "axios";
import { Server as HttpServer } from "http";
import { Server, Socket } from "socket.io";
import { TFormSchema } from "./FrmSchema";
import { TPostReq } from "./types";
import env from "./env";
import getLTP from "./utils/getLTP";

export class ServerSocket {
    public static instance: ServerSocket;
    public io: Server;

    public socketidtouserandmatchid: { [socketid: string]: { uid: string; matchid: string } } = {};
    private prisma = new PrismaClient();

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

    private StartListeners = (socket: Socket) => {
        console.info("Message received from " + socket.id, socket.data);

        socket.on("order", async (payload: string) => {
            // console.log("order recved ->", payload);
            const order = JSON.parse(payload.toString()) as TFormSchema;
            const TradingAccountId = this.IdToUser[socket.id];

            this.addOrder({ ...order, TradingAccountId });
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

    SendMessage = (name: string, TradingAccountId: string, payload?: Object) => {
        const id = this.usersToID[TradingAccountId];
        console.info("Emitting event: " + name + " to", id);

        payload ? this.io.to(id).emit(name, payload) : this.io.to(id).emit(name);
    };
    private async sendCompletedOrderToDB(order: { type: "BUY" | "SELL"; status: $Enums.OrderStatus; name: string; price: number; TradingAccountId: string; quantity: number; triggerType: $Enums.EtriggerType }) {
        console.log("orders sent to db ->", order);
        const res = await this.prisma.orders.create({
            data: { status: order.status, triggerType: order.triggerType, type: order.type, name: order.name, price: order.price, TradingAccountId: order.TradingAccountId, quantity: order.quantity },
        });
    }
    private async marketorder(data: TFormSchema) {
        const price = await getLTP(data.symbolName);
        this.sendCompletedOrderToDB({ triggerType: "MARKET", status: "completed", type: data.orderType, name: data.symbolName, TradingAccountId: data.TradingAccountId, price, quantity: data.quantity });
    }
    private orderSubmitComform(){
        
    }
    private addOrder(data: TFormSchema) {
        console.log("order recved WSbinance ->", data);

        const { symbolName: name, orderType: type, trigerType: triggerType } = data;
        if (triggerType === "MARKET") {
            this.marketorder(data);
        } else axios.post(env.BACKEND_URL, [data]).catch((error) => console.log(error));
    }
}
