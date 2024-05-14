import { TPostReq } from "../../utils/types";
import Trade_TP_SL from "./Trade_TP_SL";
import Order from "./Order";

export default class OrdersRecord {
    public orders: Record<string, { pending: Order; tp_sl: Trade_TP_SL }> = {};
    public subscriptions: string[] = [];

    getListByName(name: string) {
        if (!this.orders[name]) this.orders[name] = { pending: new Order(), tp_sl: new Trade_TP_SL() };

        return this.orders[name];
    }
    private getOrderList(name: string) {
        if (!this.orders[name]) this.orders[name] = { pending: new Order(), tp_sl: new Trade_TP_SL() };

        return this.orders[name];
    }
    addOrder(order: TPostReq) {
        // console.log("order recieved ->", order);

        const { pending, tp_sl } = this.getOrderList(order.name);
        const res = pending.deleteItem(order);
        const res1 = tp_sl.deleteItem(order);
        if (order.status === "PENDING") pending.addItem(order);
        else if (order.status === "FILLED") tp_sl.addItem(order);
        else return;
        if (!this.subscriptions.includes(order.name)) this.subscriptions.push(order.name);
        // console.log("orders =>", this.orders);
    }
    deleteOrders(orders: TPostReq[]) {
        orders.map((order) => {
            const { pending, tp_sl } = this.getOrderList(order.name);
            const res = pending.deleteItem(order);
            const res1 = tp_sl.deleteItem(order);
            if (res && res1) this.subscriptions = this.subscriptions.filter((i) => i !== res);
        });
        console.log("orders =>", this.orders);
        return this.subscriptions;
    }
    matchOrders(msg: { s: string; p: string }) {
        const temp = this.getListByName(msg.s);
        const MatchedOrders = temp.pending.getmatchedOrders(Number(msg.p));
        const TP_SL_MatchedOrders = temp.tp_sl.getmatchedOrders(Number(msg.p));
        if (MatchedOrders.left + TP_SL_MatchedOrders.left === 0) this.subscriptions = this.subscriptions.filter((i) => i !== msg.s);
        return { MatchedOrders, TP_SL_MatchedOrders };
    }
}
