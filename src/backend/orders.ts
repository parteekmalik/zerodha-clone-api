import { $Enums, PrismaClient } from "@prisma/client";
import { TPostReq, orderType } from "../utils/types";
import WSbinance from "./Binance";
import superUserSocket from "./superUserSocket";
import completeOrders from "./utils/matching_orders";
import lowUpp from "./utils/order-helper";
import { INSPECT_MAX_BYTES } from "buffer";
const prisma = new PrismaClient();
class Order {
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
        if (this[to].length === 0) return order.name;
    }
    addItem(order: TPostReq) {
        const to = order.triggerType === "LIMIT" ? "LOWER" : "UPPER";
        this[to].push(order);
        this.sortLists(to);
    }
    private sortLists(name: "LOWER" | "UPPER") {
        this[name].sort((a, b) => (name === "UPPER" ? a.price - b.price : b.price - a.price));
    }
    getmatchedOrders(price: number) {
        const matchedOrders = [];
        while (this.UPPER.length && this.UPPER[0].price <= price) matchedOrders.push(this.UPPER.shift() as TPostReq);
        while (this.LOWER.length && this.LOWER[0].price >= price) matchedOrders.push(this.LOWER.shift() as TPostReq);
        return matchedOrders;
    }
}
class OrdersRecord {
    public orders: Record<string, Order> = {};
    getListByName(name: string) {
        if (!this.orders[name]) this.orders[name] = new Order();

        return this.orders[name];
    }
    private getOrderList(name: string) {
        if (!this.orders[name]) this.orders[name] = new Order();

        return this.orders[name];
    }
    addOrder(order: TPostReq) {
        console.log("order recieved ->", order);

        const list = this.getOrderList(order.name);
        list.addItem(order);
        console.log("orders =>", this.orders);
    }
    deleteOrder(orders: TPostReq[]) {
        const unsubList: string[] = [];
        orders.map((order) => {
            const orderList = this.getOrderList(order.name);
            const res = orderList.deleteItem(order);
            if (res) unsubList.push(res);
        });
        console.log("orders =>", this.orders);
        return unsubList;
    }
    matchOrders(msg: { s: string; p: string }) {
        const MatchedOrders = this.getListByName(msg.s).getmatchedOrders(Number(msg.p));
        return MatchedOrders;
    }
}
export default class OrdersManage {
    private ws;
    public orders = new OrdersRecord();
    public count = 0;
    constructor() {
        this.collectOrdersFromDB();
        this.ws = new WSbinance(process.env.BINANCE_WS_URL as string);
        this.ws.setonmessage((msg) => {
            // console.log(msg);
            const matchedOrder = this.orders.matchOrders(msg);
            this.updateOrders(matchedOrder);
        });
    }
    async updateOrders(orders: TPostReq | TPostReq[]) {
        // If order is not an array, convert it to an array containing the single order
        if (!Array.isArray(orders)) {
            orders = [orders];
        }
        if (!orders.length) return "no orders sent";
        console.log("orders sent to db ->", orders);
        // TODO: ccreate a messageQ
        try {
            const res = await prisma.orders.updateMany({
                where: {
                    id: {
                        in: orders.map((order) => order.id),
                    },
                },
                data: { status: "completed" },
            });
            this.SuperWS.sendNotification(
                orders.map((item) => {
                    return { ...item, status: "completed" as $Enums.OrderStatus };
                })
            );
            this.count -= orders.length;
            console.log(res);
            return res;
        } catch {
            console.log("error in updating orders");
        }
    }
    private SuperWS = new superUserSocket(process.env.BACKEND_URL as string, {
        setAddOrderFunction: (order: TPostReq) => {
            this.orders.addOrder(order);
            this.ws.addSubsciption(order);
        },
        setDeleteOrderFunction: async (ordersid: string | string[]) => {
            if (!Array.isArray(ordersid)) ordersid = [ordersid];
            const orders = await prisma.orders.findMany({
                where: { id: { in: ordersid } },
            });
            console.log("order recieved ->", orders);
            const unSubList = this.orders.deleteOrder(orders);
            if (unSubList.length) this.ws.unSubscribe(unSubList);
        },
    });

    private async collectOrdersFromDB() {
        const res = await prisma.orders.findMany({
            where: {
                status: "open",
            },
        });
        console.log("orders colleed from db ->", res.length, res);
        res.map((item) => {
            this.ws.addSubsciption(item);
            this.orders.addOrder(item);
        });
    }
}
