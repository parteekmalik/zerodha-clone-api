import { PrismaClient } from "@prisma/client";
import WebSocket from "ws";
import { Twsbinance, WS_response } from "../utils/types";
import FormatSubsctriptionParams from "./utils/list_sub";

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
                this.send({ method: "SUBSCRIBE", params: this._pendingSub, id: 1 });
                this._pendingSub = [];
            }
        };
        this.ws.onmessage;
    }

    public setonmessage(fn: (msg: { s: string; p: string }) => void) {
        this.ws.onmessage = (msg) => {
            const data = JSON.parse(msg.data.toString()) as WS_response;
            // console.log(data);
            if ("id" in data) {
                if (data.result && data.id === 3) {
                    this._subscriptions = FormatSubsctriptionParams(data.result);
                }
                console.log(msg.data);
            } else {
                fn(data);
            }
        };
    }

    send(payload: Twsbinance) {
        if ("params" in payload) {
            payload.params = payload.params.map((i) => i.toLowerCase() + "@trade");
            if (payload.params.length === 0) return;
        }
        console.log("wsbinance send -> ", payload);
        this.ws.send(JSON.stringify(payload));
    }

    updateSubscription(SubList: string[]) {
        // TODO sort new item and removed item
        const commonList = this._subscriptions.filter((i) => SubList.includes(i));
        const unSubList = this._subscriptions.filter((i) => !commonList.includes(i));
        const newSubList = SubList.filter((i) => !commonList.includes(i));
        // console.log(this._subscriptions, SubList, unSubList, newSubList);
        if (this.ws.OPEN !== this.ws.readyState) {
            this._pendingSub = this._pendingSub.concat(newSubList);
            this._pendingSub = this._pendingSub.filter((i) => !unSubList.includes(i));
        } else {
            if (unSubList.length > 0)
                this.send({
                    method: "UNSUBSCRIBE",
                    params: unSubList,
                    id: 2,
                });
            if (SubList.length > 0)
                this.send({
                    method: "SUBSCRIBE",
                    params: newSubList,
                    id: 1,
                });
            if (unSubList.length + SubList.length > 0) {
                this._subscriptions = SubList;
                this.ws.send(JSON.stringify({ method: "LIST_SUBSCRIPTIONS", id: 3 }));
            }
        }
    }
}
