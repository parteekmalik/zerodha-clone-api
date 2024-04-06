import { PrismaClient } from "@prisma/client";
import WebSocket from "ws";
import { TPostReq, Twsbinance, WS_response } from "../utils/types";
import updateSubsctription from "./utils/list_sub";
import removeParams from "./utils/test";

const prisma = new PrismaClient();

export default class WSbinance {
    // public static instance: WSbinance;
    public _subscriptions: string[] = [];
    private ws: WebSocket; // Define ws property
    public _pendingSub: string[] = [];

    constructor(url: string) {
        this.ws = new WebSocket(url, {});

        // Add event listener for 'open' event
        this.ws.onclose = () => {
            console.log("closed");
        };
        this.ws.onopen = () => {
            console.log("WSbinance opened");
            if (this._pendingSub.length) {
                this.ws.send(JSON.stringify({ method: "SUBSCRIBE", params: [...this._pendingSub], id: 1 }));

                this._pendingSub = [];
            }
        };
        this.ws.onmessage;
    }

    public setonmessage(fn: (msg: { s: string; p: string }) => void) {
        this.ws.onmessage = (msg) => {
            const data = JSON.parse(msg.data.toString()) as WS_response;
            if ("id" in data) {
                if (data.id !== 3) this.ws.send(JSON.stringify({ method: "LIST_SUBSCRIPTIONS", id: 3 }));
                else if (data.result) {
                    this._subscriptions = updateSubsctription(data.result);
                }
                console.log(msg.data);
            } else {
                fn(data);
            }
        };
    }
    private subscribe(params: string | string[]) {
        if (!Array.isArray(params)) params = [params];
        params = removeParams("SUBSCRIBE", params, { subscriptions: this._subscriptions, pendingSub: this._pendingSub });
        if (params.length === 0) return;
        const msg: Twsbinance = {
            method: "SUBSCRIBE",
            params,
            id: 1,
        };
        if (this.ws.OPEN === this.ws.readyState) {
            this._subscriptions = updateSubsctription([...this._subscriptions, ...params]);
            this.ws.send(JSON.stringify(msg));
        } else {
            this._pendingSub = [...this._pendingSub, ...params];
        }
    }
    send(payload: string) {
        console.log("wsbinance send -> ", payload);
        this.ws.send(payload);
    }
    unSubscribe(params: string | string[]) {
        if (!Array.isArray(params)) params = [params];
        params = removeParams("UNSUBSCRIBE", params, { subscriptions: this._subscriptions, pendingSub: this._pendingSub });
        if (params.length === 0) return;

        const msg: Twsbinance = {
            method: "UNSUBSCRIBE",
            params,
            id: 2,
        };
        this.ws.send(JSON.stringify(msg));
    }
    addSubsciption(data: TPostReq | TPostReq[]) {
        if (!Array.isArray(data)) data = [data];
        const list: string[] = [];
        data.map(async (data) => {
            const { name } = data;

            if (![...this._subscriptions, ...list].includes(name + "@trade")) list.push(name + "@trade");
        });
        this.subscribe(list);
    }
}
