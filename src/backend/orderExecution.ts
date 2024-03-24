import { $Enums, PrismaClient } from "@prisma/client";
import { TPostReq, Twsbinance, WS_method, WS_response, orderType } from "../types";
import { TFormSchema } from "../FrmSchema";
import axios from "axios";
import WebSocket from "ws";
import getLTP from "../utils/getLTP";

// const orders: Record<string, orderType> = { BTCUSDT: { asks: [{ price: 70000 }], bids: [{ price: 70600 }] ,Triger:{price:72000}[] }};
const prisma = new PrismaClient();
async function sendCompletedOrderToDB(order: { type: "BUY" | "SELL"; status: $Enums.OrderStatus; name: string; price: number; TradingAccountId: string; quantity: number; triggerType: $Enums.EtriggerType }) {
    console.log("orders sent to db ->", order);
    // TODO: change create to update
    const res = await prisma.orders.create({
        data: { status: order.status, triggerType: order.triggerType, type: order.type, name: order.name, price: order.price, TradingAccountId: order.TradingAccountId, quantity: order.quantity },
    });

    console.log(res);
    return res;
}
async function updateOrders(orders: TPostReq | TPostReq[]) {
    console.log("orders sent to db ->", orders);

    // If order is not an array, convert it to an array containing the single order
    if (!Array.isArray(orders)) {
        orders = [orders];
    }

    // TODO: Ensure `prisma` is defined correctly
    const res = await prisma.orders.updateMany({
        where: {
            id: {
                in: orders.map((order) => order.id),
            },
        },
        data: { status: "completed" },
    });

    console.log(res);
    return res;
}
function getOrderList(name: string, orders: Record<string, orderType>) {
    if (!orders[name]) orders[name] = { BUYLIMIT: [], SELLLIMIT: [], BUYSTOP: [], SELLSTOP: [] };
    return orders[name];
}
class Orders {
    public orders: Record<string, orderType> = {};
    public count = 0;
    constructor() {
        this.collectOrdersFromDB();
    }
    private async collectOrdersFromDB() {
        const res = await prisma.orders.findMany({
            where: {
                status: "open",
            },
        });

        res.map((item) => getOrderList(item.name, this.orders)[(item.type + item.triggerType) as keyof orderType].push(item));
    }
    completeOrders(data: { s: string; p: string }) {
        if (!this.orders[data.s]) return;
        const { BUYLIMIT, SELLLIMIT, BUYSTOP, SELLSTOP } = this.orders[data.s];
        // console.log(data);
        // TODO: move code to orders class
        const orders = [] as TPostReq[];
        while (BUYLIMIT.length && BUYLIMIT[0].price >= Number(data.p)) {
            console.log("order matched buyLimit");
            this.count--;
            orders.push(BUYLIMIT.shift() as TPostReq);
        }
        while (SELLLIMIT.length && SELLLIMIT[0].price <= Number(data.p)) {
            console.log("order matched sellLimit");
            this.count--;
            orders.push(SELLLIMIT.shift() as TPostReq);
        }
        while (SELLSTOP.length && SELLSTOP[0].price >= Number(data.p)) {
            console.log("order matched sellStop");
            this.count--;
            orders.push(SELLSTOP.shift() as TPostReq);
        }
        while (BUYSTOP.length && BUYSTOP[0].price <= Number(data.p)) {
            console.log("order matched buyStop");
            this.count--;
            orders.push(BUYLIMIT.shift() as TPostReq);
        }
        if (orders) updateOrders(orders);
        if (!BUYLIMIT.length && !BUYSTOP.length && !SELLLIMIT.length && !SELLSTOP.length) return true;
    }
    async addOrders(data: TPostReq) {
        const { name, type, triggerType } = data;
        const orderList = getOrderList(name, this.orders)[(type + triggerType) as keyof orderType];

        orderList.push(data);
        this.count++;

        if (triggerType === "LIMIT") {
            orderList.sort((a, b) => (type === "BUY" ? b.price - a.price : a.price - b.price));
        } else {
            orderList.sort((a, b) => b.price - a.price);
        }
    }
}
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
        this.ws = new WebSocket("wss://stream.binance.us:9443/ws");

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
                    this._subscriptions = data.result;
                }
                console.log(msg.data);
            } else {
                this.handleMessages(data);
            }
        };
    }

    private sendPrint(payload: Twsbinance) {
        if (payload.method !== "LIST_SUBSCRIPTIONS") this._subscriptions = [...this._subscriptions, ...payload.params.filter((item) => !this._subscriptions.includes(item))];
        console.log(payload);
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
        console.log("order recved WSbinance ->", data);
        if (!Array.isArray(data)) data = [data];

        data.map(async (data) => {
            const { name, type, triggerType } = data;

            if (!this._subscriptions.includes(name + "@trade")) this.subscribe([name + "@trade"]);

            this.orders.addOrders(data);
        });
        console.log(this.orders);
    }
}
