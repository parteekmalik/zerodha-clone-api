import { TOrder } from "../../utils/types";
import Order from "./Order";

export default class OrdersRecord {
    private orders: Record<string, Order> = {};
    private subscriptions: Set<string> = new Set();

    getOrderListByName(name: string) {
        if (!this.orders[name]) this.orders[name] = new Order();
        return this.orders[name];
    }
    updateOrder(orders: TOrder[]) {
        orders.map((order) => {
            const ordersList = this.getOrderListByName(order.name);
            let res = ordersList.deleteItem(order);
            if (order.status === "OPEN") res = ordersList.addItem(order);

            if (res.count) this.subscriptions.add(res.name);
            else this.subscriptions.delete(res.name);
        });
        console.log("orders =>", this.orders);
        return this.subscriptions;
    }
    matchOrders(msg: { s: string; p: string }) {
        const temp = this.getOrderListByName(msg.s);
        const MatchedOrders = temp.getmatchedOrders(Number(msg.p));
        if (MatchedOrders.left === 0) this.subscriptions.delete(msg.s);
        return MatchedOrders;
    }
    getSubsriptions() {
        return Array.from(this.subscriptions);
    }
}
