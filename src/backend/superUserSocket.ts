import { io } from "socket.io-client";
import { TOrder } from "../utils/types";
import env from "../env";
import {
    NOTIFY_USER,
    NOTIFY_USER_PAYLOAD,
    UPDATE_ORDER,
    UPDATE_ORDER_PAYLOAD,
} from "../../WStypes/typeForBackendAndSocket";

export default class superUserSocket {
    private ws;
    constructor(
        url: string,
        {
            setUpdateOrderFunction,
            setDeleteOrderFunction,
        }: {
            setUpdateOrderFunction: (data: UPDATE_ORDER_PAYLOAD) => void;
            setDeleteOrderFunction?: (data: number | number[]) => void;
        }
    ) {
        console.log("connectiong to backend server -> ",url);
        this.ws = io(url, { auth: { token: env.BACKEND_SECRET_CODE } });
        this.ws.on("connect", () => {
            console.log("Connected to WebSocket server");
        });

        this.ws.on("disconnect", () => {
            console.log("Disconnected from WebSocket server");
        });
        this.ws.onAny((event) => {
            console.log(`got ${event}`);
        });
        if (setUpdateOrderFunction) this.ws.on(UPDATE_ORDER, setUpdateOrderFunction);
        // this.ws.on("deleteOrder", setDeleteOrderFunction);
    }

    sendNotification(orders: NOTIFY_USER_PAYLOAD) {
        this.ws.emit(NOTIFY_USER, orders);
    }
}
