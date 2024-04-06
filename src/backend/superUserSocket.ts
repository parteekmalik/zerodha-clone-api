import { io } from "socket.io-client";
import { TPostReq } from "../utils/types";

export default class superUserSocket {
    private ws;
    constructor(url: string, { setAddOrderFunction, setDeleteOrderFunction }: { setAddOrderFunction: (data: TPostReq) => void; setDeleteOrderFunction: (data: string | string[]) => void }) {
        this.ws = io(url);
        this.ws.on("connect", () => {
            console.log("Connected to WebSocket server");

            // Send a message when the socket is connected
            this.ws.emit("authenticate", { TradingAccountId: process.env.BACKEND_SECRET_CODE as string });
        });

        this.ws.on("disconnect", () => {
            console.log("Disconnected from WebSocket server");
        });
        this.ws.on("addOrder", setAddOrderFunction);
        this.ws.on("deleteOrder", setDeleteOrderFunction);
    }

    sendNotification(orders: TPostReq[]) {
        this.ws.emit("sendNotification", orders);
    }
}
