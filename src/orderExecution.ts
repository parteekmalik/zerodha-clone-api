import { PrismaClient } from "@prisma/client";
import WebSocket from "ws";
import { TPostReq, Twsbinance, WS_method, WS_response, orderType } from "./types";
import { TFormSchema } from "./FrmSchema";
import axios from "axios";

// const orders: Record<string, orderType> = { BTCUSDT: { asks: [{ price: 70000 }], bids: [{ price: 70600 }] ,Triger:{price:72000}[] }};

export default class WSbinance {
    private prisma = new PrismaClient();
    private orders: Record<string, orderType> = {};
    private _subscriptions: string[] = [];
    private ws: WebSocket; // Define ws property
    private _pendingSub: string[] = ["btcusdt@trade"];

    private handleMessages(data: { s: string; p: string }) {
        if (!this.orders[data.s]) return;
        const { buyLimit, sellLimit, buyStop, sellStop } = this.orders[data.s];
        // console.log(data, SymbolOrders);
        if (buyLimit.length && buyLimit[0].price >= Number(data.p)) {
            console.log("order matched buyLimit");
            const orders = [buyLimit.shift()] as TPostReq[];
            while (buyLimit.length && buyLimit[0].price >= Number(data.p)) {
                orders.push(buyLimit.shift() as TPostReq);
            }
            if (orders) this.sendCompletedOrderToDB(orders);
        } else if (sellLimit.length && sellLimit[0].price <= Number(data.p)) {
            console.log("order matched sellLimit");
            const orders = [sellLimit.shift()] as TPostReq[];
            while (sellLimit.length && sellLimit[0].price <= Number(data.p)) {
                orders.push(sellLimit.shift() as TPostReq);
            }
            if (orders) this.sendCompletedOrderToDB(orders);
        }
        if (sellStop.length && sellStop[0].price >= Number(data.p)) {
            console.log("order matched sellStop");
            const orders = [sellStop.shift()] as TPostReq[];
            while (sellStop.length && sellStop[0].price >= Number(data.p)) {
                orders.push(sellStop.shift() as TPostReq);
            }
            if (orders) this.sendCompletedOrderToDB(orders);
        } else if (buyStop.length && buyStop[0].price <= Number(data.p)) {
            console.log("order matched buyStop");
            const orders = [buyStop.shift()] as TPostReq[];
            while (buyStop.length && buyStop[0].price <= Number(data.p)) {
                orders.push(buyLimit.shift() as TPostReq);
            }
            if (orders) this.sendCompletedOrderToDB(orders);
        }
    }
    private async sendCompletedOrderToDB(order: { type: "BUY" | "SELL"; name: string; price: number; TradingAccountId: string; quantity: number }[]) {
        console.log("orders sent to db ->", order);
        const res = await this.prisma.fullOrder.createMany({
            data: order.map((item) => {
                return { status: "completed", type: item.type, name: item.name, price: item.price, TradingAccountId: item.TradingAccountId, quantity: item.quantity };
            }),
        });
    }

    constructor() {
        this.ws = new WebSocket("wss://stream.binance.com:9443/ws");

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
        return params;
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
    private async getLTP(symbol: string) {
        const url = "https://api.binance.us/api/v3/ticker/price?symbol=" + symbol;
        const res = (await axios.get(url)).data as { symbol: string; price: string };
        console.log("getLTP " + symbol + " -> ", res);
        return Number(res.price);
    }
    private async marketorder(data: TFormSchema) {
        const price = await this.getLTP(data.symbolName);
        this.sendCompletedOrderToDB([{ type: data.orderType, name: data.symbolName, TradingAccountId: data.TradingAccountId, price, quantity: data.quantity }]);
    }
    addOrder(data: TFormSchema) {
        console.log("order recved WSbinance ->", data);
        const { symbolName: name, orderType: type, trigerType } = data;
        if (data.trigerType === "MARKET") {
            this.marketorder(data);
        } else {
            if (this._subscriptions.includes(name + "@trade")) this.subscribe([name + "@trade"]);

            if (!this.orders[name]) {
                this.orders[name] = { buyLimit: [], sellLimit: [], buyStop: [], sellStop: [] };
            }
            const symbolOrders = this.orders[name];

            const orderList = trigerType === "LIMIT" ? (type === "BUY" ? symbolOrders.buyLimit : symbolOrders.sellLimit) : type === "BUY" ? symbolOrders.buyStop : symbolOrders.sellStop;
            // fix ???
            orderList.push({ sl: data.sl, tp: data.tp, trigerType, status: "patial_filled", TradingAccountId: data.TradingAccountId, name: data.symbolName, type: data.orderType, quantity: data.quantity, price: data.price });

            if (trigerType === "LIMIT") {
                orderList.sort((a, b) => (type === "BUY" ? b.price - a.price : a.price - b.price));
            } else {
                orderList.sort((a, b) => b.price - a.price);
            }
        }
        console.log(this.orders);
    }
}
