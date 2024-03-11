import WebSocket from "ws";
export type Twsbinance =
    | {
          method: WS_method;
          params: string[];
          id: number;
      }
    | {
          method: "LIST_SUBSCRIPTIONS";
          id: number;
      };
export type WS_method = "SUBSCRIBE" | "UNSUBSCRIBE";
export type WS_response = { result: null | string[]; id: number } | { s: string; p: string };

export default class WSbinance {
    private _subscriptions: string[] = [];
    private ws: WebSocket; // Define ws property
    private _pendingSub: string[] = ["btcusdt@trade"];

    constructor(url: string, options?: { onmessage: (data: { s: string; p: string }) => void }) {
        this.ws = new WebSocket(url);

        // Add event listener for 'open' event
        this.ws.onopen = () => {
            console.log("opened");
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
                options?.onmessage(data);
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
    subscribe(params: string[]) {
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
    unSubscribe(params: string[]) {
        const msg: Twsbinance = {
            method: "UNSUBSCRIBE",
            params: this.removeParams("UNSUBSCRIBE", params),
            id: 2,
        };
        if (msg.params.length === 0) return;
        this.sendPrint(msg);
    }
}
