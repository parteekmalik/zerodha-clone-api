import WebSocket from "ws";
export type Twsbinance = {
  method: WS_method;
  params: string[];
  id: number;
};
export type WS_method = "SUBSCRIBE" | "UNSUBSCRIBE";

class WSbinance {
  private _subscriptions: string[] = [];
  private ws: WebSocket; // Define ws property
  private _pendingSub: string[] = [];

  constructor(url: string) {
    this.ws = new WebSocket(url);
  }
  private removeParams(type: WS_method, params: string[]) {
    if (type === "SUBSCRIBE") {
      if (this.ws.OPEN) {
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
    if (this.ws.OPEN) this.ws.send(JSON.stringify(msg));
    else {
      this._pendingSub = [...this._pendingSub, ...params];
    }
  }
}
