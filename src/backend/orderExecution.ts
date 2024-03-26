import { PrismaClient } from "@prisma/client";
import WebSocket from "ws";
import { TPostReq, Twsbinance, WS_method, WS_response } from "../utils/types";
import Orders from "./orders";
import env from "../env";

// const orders: Record<string, orderType> = { BTCUSDT: { asks: [{ price: 70000 }], bids: [{ price: 70600 }] ,Triger:{price:72000}[] }};
const prisma = new PrismaClient();

// export async function sendCompletedOrderToDB(order: { type: "BUY" | "SELL"; status: $Enums.OrderStatus; name: string; price: number; TradingAccountId: string; quantity: number; triggerType: $Enums.EtriggerType }) {
//     console.log("orders sent to db ->", order);
//     // TODO: change create to update
//     const res = await prisma.orders.create({
//         data: { status: order.status, triggerType: order.triggerType, type: order.type, name: order.name, price: order.price, TradingAccountId: order.TradingAccountId, quantity: order.quantity },
//     });

//     console.log(res);
//     return res;
// }

export default class WSbinance {
    public static instance: WSbinance;
    public orders = new Orders();
    private _subscriptions: string[] = [];
    private ws: WebSocket; // Define ws property
    private _pendingSub: string[] = [];

    private handleMessages(data: { s: string; p: string }) {
        const res = this.orders.completeOrders(data);
        if (res) this.unSubscribe([data.s + "@trade"]);
    }

    constructor() {
        this.ws = new WebSocket(env.BINANCE_WS_URL);

        // Add event listener for 'open' event
        this.ws.onopen = () => {
            console.log("WSbinance opened");
            if (this._pendingSub.length) {
                this.sendPrint({ method: "SUBSCRIBE", params: [...this._pendingSub], id: 1 });
                this._pendingSub = [];
            }
        };
        this.ws.onclose = () => {
            console.log("closed");
        };
        this.ws.onmessage = (msg) => {
            const data = JSON.parse(msg.data.toString()) as WS_response;
            if ("id" in data) {
                if (data.id !== 3) this.sendPrint({ method: "LIST_SUBSCRIPTIONS", id: 3 });
                else if (data.result) {
                    this.updateSubsctription(data.result);
                }
                console.log(msg.data);
            } else {
                this.handleMessages(data);
            }
        };
    }
    private updateSubsctription(list: string[]) {
        this._subscriptions = list.map((i) => i.slice(0, i.length - 6).toUpperCase() + "@trade");
        console.log("this._subscriptions -> ", this._subscriptions);
    }
    private sendPrint(payload: Twsbinance) {
        if (payload.method !== "LIST_SUBSCRIPTIONS") {
            this.updateSubsctription([...this._subscriptions, ...payload.params]);
            payload.params = payload.params.map((i) => i.toLowerCase());
        }
        console.log("sendPrint ->", payload);
        this.ws.send(JSON.stringify(payload));
    }
    private removeParams(type: WS_method, params: string[]) {
        if (type === "SUBSCRIBE") {
            if (this.ws.OPEN === this.ws.readyState) {
                params = params.filter((item) => !this._subscriptions.includes(item));
            } else {
                params = params.filter((item) => !this._pendingSub.includes(item));
            }
        } else {
            params = params.filter((item) => this._subscriptions.includes(item));
        }
        return params.map((item) => item.toLowerCase());
    }
    private subscribe(params: string[]) {
        const msg: Twsbinance = {
            method: "SUBSCRIBE",
            params: this.removeParams("SUBSCRIBE", params),
            id: 1,
        };
        if (msg.params.length === 0) return;
        if (this.ws.OPEN === this.ws.readyState) this.sendPrint(msg);
        else {
            this._pendingSub = [...this._pendingSub, ...params];
        }
    }
    private unSubscribe(params: string[]) {
        const msg: Twsbinance = {
            method: "UNSUBSCRIBE",
            params: this.removeParams("UNSUBSCRIBE", params),
            id: 2,
        };
        if (msg.params.length === 0) return;
        this.sendPrint(msg);
    }
    async addOrder(data: TPostReq | TPostReq[]) {
        if (!Array.isArray(data)) data = [data];

        data.map(async (data) => {
            const { name } = data;

            if (!this._subscriptions.includes(name + "@trade")) {
                this.subscribe([name + "@trade"]);
                console.log(this._subscriptions, name + "@trade");
            }

            this.orders.addOrders(data);
        });
        console.log(this.orders);
    }
}
