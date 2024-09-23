import { INSPECT_MAX_BYTES } from "buffer";
import { TOrder } from "../../utils/types";

export default class Order {
    UPPER: TOrder[] = [];
    LOWER: TOrder[] = [];
    constructor() {}

    topItems() {
        return { UPPER: this.UPPER[0] ?? INSPECT_MAX_BYTES, LOWER: this.LOWER[0] ?? 0 };
    }

    getLists() {
        return { UPPER: this.UPPER, LOWER: this.LOWER };
    }
    deleteItem(order: TOrder) {
        const to = order.triggerType === "LIMIT" ? "LOWER" : "UPPER";

        this[to] = this[to].filter((i) => i.id !== order.id);
        this.sortLists(to);
        return { name: order.name, count: this.LOWER.length + this.UPPER.length };
    }
    addItem(order: TOrder) {
        const to = order.triggerType === "LIMIT" ? "LOWER" : "UPPER";
        this[to].push(order);
        this.sortLists(to);
        return { name: order.name, count: this.LOWER.length + this.UPPER.length };
    }
    private sortLists(name: "LOWER" | "UPPER") {
        this[name].sort((a, b) => (name === "UPPER" ? a.price - b.price : b.price - a.price));
    }
    getmatchedOrders(price: number) {
        const matchedOrders = [];
        while (this.UPPER.length && this.UPPER[0].price <= price) matchedOrders.push(this.UPPER.shift() as TOrder);
        while (this.LOWER.length && this.LOWER[0].price >= price) matchedOrders.push(this.LOWER.shift() as TOrder);
        return { matchedOrders, left: this.UPPER.length + this.LOWER.length };
    }
}
