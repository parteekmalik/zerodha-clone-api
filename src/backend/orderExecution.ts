import { $Enums, PrismaClient } from "@prisma/client";
import { TPostReq, Twsbinance, WS_method, WS_response, orderType } from "../types";
import { TFormSchema } from "../FrmSchema";
import axios from "axios";
import WebSocket from "ws";
import getLTP from "../utils/getLTP";

// const orders: Record<string, orderType> = { BTCUSDT: { asks: [{ price: 70000 }], bids: [{ price: 70600 }] ,Triger:{price:72000}[] }};
const prisma = new PrismaClient();
async function sendCompletedOrderToDB(order: { type: "BUY" | "SELL"; status: $Enums.OrderStatus; name: string; price: number; TradingAccountId: string; quantity: number; trigerType: $Enums.EtrigerType }) {
    console.log("orders sent to db ->", order);
    // TODO: change create to update
    const res = await prisma.orders.create({
        data: { status: order.status, trigerType: order.trigerType, type: order.type, name: order.name, price: order.price, TradingAccountId: order.TradingAccountId, quantity: order.quantity },
    });

    console.log(res);
    return res;
}
async function updateOrders(orders: { id: string } | { id: string }[]) {
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

export default class WSbinance {
    public static instance: WSbinance;
    private orders: Record<string, orderType> = {};
    private _subscriptions: string[] = [];
    private ws: WebSocket; // Define ws property
    private _pendingSub: string[] = [];

    private handleMessages(data: { s: string; p: string }) {
        if (!this.orders[data.s]) return;
        const { BUYLIMIT: buyLimit, SELLLIMIT: sellLimit, BUYSTOP: buyStop, SELLSTOP: sellStop } = this.orders[data.s];
        // console.log(data);
        if (buyLimit.length && buyLimit[0].price >= Number(data.p)) {
            console.log("order matched buyLimit");
            const orders = [buyLimit.shift()] as TPostReq[];
            while (buyLimit.length && buyLimit[0].price >= Number(data.p)) {
                orders.push(buyLimit.shift() as TPostReq);
            }
            if (orders) updateOrders(orders);
        } else if (sellLimit.length && sellLimit[0].price <= Number(data.p)) {
            console.log("order matched sellLimit");
            const orders = [sellLimit.shift()] as TPostReq[];
            while (sellLimit.length && sellLimit[0].price <= Number(data.p)) {
                orders.push(sellLimit.shift() as TPostReq);
            }
            if (orders) updateOrders(orders);
        }
        if (sellStop.length && sellStop[0].price >= Number(data.p)) {
            console.log("order matched sellStop");
            const orders = [sellStop.shift()] as TPostReq[];
            while (sellStop.length && sellStop[0].price >= Number(data.p)) {
                orders.push(sellStop.shift() as TPostReq);
            }
            if (orders) updateOrders(orders);
        } else if (buyStop.length && buyStop[0].price <= Number(data.p)) {
            console.log("order matched buyStop");
            const orders = [buyStop.shift()] as TPostReq[];
            while (buyStop.length && buyStop[0].price <= Number(data.p)) {
                orders.push(buyLimit.shift() as TPostReq);
            }
            if (orders) updateOrders(orders);
        }
        if (!buyLimit.length && !buyStop.length && !sellLimit.length && !sellStop.length) this.unSubscribe([data.s + "@trade"]);
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
        this.collectOrdersFromDB();
    }
    private async collectOrdersFromDB() {
        const res = await prisma.orders.findMany({
            where: {
                status: "open",
            },
        });

        res.map((item) => this.getOrderList(item.name)[(item.type + item.trigerType) as keyof orderType].push(item));
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
    private getOrderList(name: string) {
        if (!this.orders[name]) {
            this.orders[name] = { BUYLIMIT: [], SELLLIMIT: [], BUYSTOP: [], SELLSTOP: [] };
        }
        return this.orders[name];
    }
    async addOrder(data: TFormSchema) {
        console.log("order recved WSbinance ->", data);
        const { symbolName: name, orderType: type, trigerType } = data;
        if (!this._subscriptions.includes(name + "@trade")) this.subscribe([name + "@trade"]);

        const orderList = this.getOrderList(name)[(data.orderType + data.trigerType) as keyof orderType];
        // fix ???

        const tempOrder = { sl: data.sl, tp: data.tp, trigerType, status: "open", TradingAccountId: data.TradingAccountId, name: data.symbolName, type: data.orderType, quantity: data.quantity, price: data.price };
        const res = await sendCompletedOrderToDB({ ...tempOrder, status: "open" });
        orderList.push(res);

        if (trigerType === "LIMIT") {
            orderList.sort((a, b) => (type === "BUY" ? b.price - a.price : a.price - b.price));
        } else {
            orderList.sort((a, b) => b.price - a.price);
        }

        console.log(this.orders);
    }
}
