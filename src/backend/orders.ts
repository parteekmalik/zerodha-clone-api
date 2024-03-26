import { PrismaClient } from "@prisma/client";
import { TPostReq, orderType } from "../types";
const prisma = new PrismaClient();
function getOrderList(name: string, orders: Record<string, orderType>) {
    if (!orders[name]) orders[name] = { BUYLIMIT: [], SELLLIMIT: [], BUYSTOP: [], SELLSTOP: [] };
    return orders[name];
}
export async function updateOrders(orders: TPostReq | TPostReq[]) {
    console.log("orders sent to db ->", orders);

    // If order is not an array, convert it to an array containing the single order
    if (!Array.isArray(orders)) {
        orders = [orders];
    }

    // TODO: ccreate a messageQ
    const res = await prisma.orders.updateMany({
        where: {
            id: {
                in: orders.map((order) => order.id),
            },
        },
        data: { status: "completed" },
    });
    await prisma.orderMessageQ.createMany({
        data: orders.map((order) => {
            return { Orders: order.id, type: "completed" };
        }),
    });

    console.log(res);
    return res;
}
export default class Orders {
    public orders: Record<string, orderType> = {};
    public count = 0;
    constructor() {
        // this.collectOrdersFromDB();
    }
    private async collectOrdersFromDB() {
        const res = await prisma.orders.findMany({
            where: {
                status: "open",
            },
        });

        res.map((item) => getOrderList(item.name, this.orders)[(item.type + item.triggerType) as keyof orderType].push(item));
    }
    completeOrders(data: { s: string; p: string }) {
        if (!this.orders[data.s]) return;
        const { BUYLIMIT, SELLLIMIT, BUYSTOP, SELLSTOP } = this.orders[data.s];
        // console.log(data);
        // TODO: move code to orders class
        const orders = [] as TPostReq[];
        while (BUYLIMIT.length && BUYLIMIT[0].price >= Number(data.p)) {
            // console.log("order matched buyLimit");
            this.count--;
            orders.push(BUYLIMIT.shift() as TPostReq);
        }
        while (SELLLIMIT.length && SELLLIMIT[0].price <= Number(data.p)) {
            // console.log("order matched sellLimit");
            this.count--;
            orders.push(SELLLIMIT.shift() as TPostReq);
        }
        while (SELLSTOP.length && SELLSTOP[0].price >= Number(data.p)) {
            // console.log("order matched sellStop");
            this.count--;
            orders.push(SELLSTOP.shift() as TPostReq);
        }
        while (BUYSTOP.length && BUYSTOP[0].price <= Number(data.p)) {
            // console.log("order matched buyStop");
            this.count--;
            orders.push(BUYSTOP.shift() as TPostReq);
        }
        if (orders.length) {
            console.log("order matched", orders);
            updateOrders(orders);
        }
        if (!BUYLIMIT.length && !BUYSTOP.length && !SELLLIMIT.length && !SELLSTOP.length) return true;
    }
    async addOrders(data: TPostReq) {
        const { name, type, triggerType } = data;
        const orderList = getOrderList(name, this.orders)[(type + triggerType) as keyof orderType];

        orderList.push(data);
        this.count++;

        if (triggerType === "LIMIT") {
            orderList.sort((a, b) => (type === "BUY" ? b.price - a.price : a.price - b.price));
        } else {
            orderList.sort((a, b) => b.price - a.price);
        }
    }
}
