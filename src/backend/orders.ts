import { $Enums, PrismaClient } from "@prisma/client";
import { TPostReq, orderType } from "../utils/types";
import WSbinance from "./Binance";
import superUserSocket from "./superUserSocket";
import completeOrders from "./utils/matching_orders";
const prisma = new PrismaClient();
export default class Orders {
    private ws;
    public orders: Record<string, orderType> = {};
    public count = 0;
    constructor() {
        this.collectOrdersFromDB();
        this.ws = new WSbinance(process.env.BINANCE_WS_URL as string);
        this.ws.setonmessage((msg) => {
            // console.log(msg);
            const res = completeOrders(msg, this.orders[msg.s]);
            this.updateOrders(res.machedOrders);
            if (res.isleft) this.ws.unSubscribe([msg.s + "@trade"]);
        });
    }

    private getOrderList(name: string) {
        if (!this.orders[name]) this.orders[name] = { BUYLIMIT: [], SELLLIMIT: [], BUYSTOP: [], SELLSTOP: [] };
        return this.orders[name];
    }
    async updateOrders(orders: TPostReq | TPostReq[]) {
        // If order is not an array, convert it to an array containing the single order
        if (!Array.isArray(orders)) {
            orders = [orders];
        }
        if (!orders.length) return "no orders sent";
        console.log("orders sent to db ->", orders);
        // TODO: ccreate a messageQ
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
                return { ...item, status: "comleted" as $Enums.OrderStatus };
            })
        );
        this.count -= orders.length;
        console.log(res);
        return res;
    }
    private SuperWS = new superUserSocket(process.env.BACKEND_URL as string, {
        setAddOrderFunction: (order: TPostReq) => {
            console.log("order recieved ->", order);

            const list = this.getOrderList(order.name)[(order.type + order.triggerType) as keyof orderType];
            list.push(order);
            if (order.triggerType === "LIMIT") {
                list.sort((a, b) => (order.type === "BUY" ? b.price - a.price : a.price - b.price));
            } else {
                list.sort((a, b) => b.price - a.price);
            }
            this.ws.addOrder(order);
            console.log("orders =>", this.orders);
        },
    });
    private async collectOrdersFromDB() {
        const res = await prisma.orders.findMany({
            where: {
                status: "open",
            },
        });
        console.log("orders colleed from db ->", res.length);
        res.map((item) => {
            this.ws.addOrder(item);

            this.getOrderList(item.name)[(item.type + item.triggerType) as keyof orderType].push(item);
        });
    }

    addOrders(data: TPostReq) {
        console.log("order recieved addOrder fn ->", data);
        const { name, type, triggerType } = data;
        const orderList = this.getOrderList(name)[(type + triggerType) as keyof orderType];

        orderList.push(data);
        this.count++;

        if (triggerType === "LIMIT") {
            orderList.sort((a, b) => (type === "BUY" ? b.price - a.price : a.price - b.price));
        } else {
            orderList.sort((a, b) => b.price - a.price);
        }
    }
}
