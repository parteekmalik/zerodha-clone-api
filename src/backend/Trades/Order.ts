import { INSPECT_MAX_BYTES } from "buffer";
import { TPostReq } from "../../utils/types";

export default class Order {
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
        const to = order.triggerType === "LIMIT" ? "LOWER" : "UPPER";

        this[to] = this[to].filter((i) => i.id !== order.id);
        this.sortLists(to);
        if (this.UPPER.length === 0 && this.LOWER.length === 0) return order.name;
    }
    addItem(order: TPostReq) {
        const to = order.triggerType === "LIMIT" ? "LOWER" : "UPPER";
        this[to].push(order);
        this.sortLists(to);
    }
    private sortLists(name: "LOWER" | "UPPER") {
        this[name].sort((a, b) => (name === "UPPER" ? a.openPrice - b.openPrice : b.openPrice - a.openPrice));
    }
    getmatchedOrders(price: number) {
        const matchedOrders = [];
        while (this.UPPER.length && this.UPPER[0].openPrice <= price) matchedOrders.push(this.UPPER.shift() as TPostReq);
        while (this.LOWER.length && this.LOWER[0].openPrice >= price) matchedOrders.push(this.LOWER.shift() as TPostReq);
        return { matchedOrders, left: this.UPPER.length + this.LOWER.length };
    }
}
