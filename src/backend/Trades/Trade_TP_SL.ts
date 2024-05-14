import { INSPECT_MAX_BYTES } from "buffer";
import { TPostReq } from "../../utils/types";

export default class Trade_TP_SL {
    UPPER: TPostReq[] = [];
    LOWER: TPostReq[] = [];
    constructor() {}

    topItems() {
        return { UPPER: this.UPPER[0] ?? INSPECT_MAX_BYTES, LOWER: this.LOWER[0] ?? 0 };
    }

    getLists() {
        return { UPPER: this.UPPER, LOWER: this.LOWER };
    }
    deleteItem(order: TPostReq) {
        this.UPPER = this.UPPER.filter((i) => i.id !== order.id);
        this.LOWER = this.LOWER.filter((i) => i.id !== order.id);
        this.sortLists();
        if (this.UPPER.length === 0 && this.LOWER.length === 0) return order.name;
    }
    addItem(order: TPostReq) {
        if (order.sl !== 0) this.LOWER.push(order);
        if (order.tp !== 0) this.UPPER.push(order);
        this.sortLists();
    }
    private sortLists() {
        this.UPPER.sort((a, b) => a.tp - b.tp);
        this.LOWER.sort((a, b) => b.sl - a.sl);
    }
    getmatchedOrders(price: number) {
        const sl = [],
            tp = [];
        while (this.UPPER.length && this.UPPER[0].tp <= price) tp.push(this.UPPER.shift() as TPostReq);
        while (this.LOWER.length && this.LOWER[0].sl >= price) sl.push(this.LOWER.shift() as TPostReq);
        return { sl, tp, left: this.UPPER.length + this.LOWER.length };
    }
}
