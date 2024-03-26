import { PrismaClient } from "@prisma/client";
import { TPostReq, orderType } from "../utils/types";
const prisma = new PrismaClient();
export default class Orders {
    private getOrderList(name: string) {
        if (!this.orders[name]) this.orders[name] = { BUYLIMIT: [], SELLLIMIT: [], BUYSTOP: [], SELLSTOP: [] };
        return this.orders[name];
    }
    private async updateOrders(orders: TPostReq | TPostReq[]) {
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
        this.count -= orders.length;
        console.log(res);
        return res;
    }
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

        res.map((item) => this.getOrderList(item.name)[(item.type + item.triggerType) as keyof orderType].push(item));
    }
    completeOrders(data: { s: string; p: string }) {
        if (!this.orders[data.s]) return;
        const { BUYLIMIT, SELLLIMIT, BUYSTOP, SELLSTOP } = this.orders[data.s];
        // console.log(data);
        // TODO: move code to orders class
        const orders = [] as TPostReq[];
        while (BUYLIMIT.length && BUYLIMIT[0].price >= Number(data.p)) {
            // console.log("order matched buyLimit");
            orders.push(BUYLIMIT.shift() as TPostReq);
        }
        while (SELLLIMIT.length && SELLLIMIT[0].price <= Number(data.p)) {
            // console.log("order matched sellLimit");
            orders.push(SELLLIMIT.shift() as TPostReq);
        }
        while (SELLSTOP.length && SELLSTOP[0].price >= Number(data.p)) {
            // console.log("order matched sellStop");
            orders.push(SELLSTOP.shift() as TPostReq);
        }
        while (BUYSTOP.length && BUYSTOP[0].price <= Number(data.p)) {
            // console.log("order matched buyStop");
            orders.push(BUYSTOP.shift() as TPostReq);
        }
        if (orders.length) {
            console.log("order matched", orders);
            this.updateOrders(orders);
        }
        if (!BUYLIMIT.length && !BUYSTOP.length && !SELLLIMIT.length && !SELLSTOP.length) return true;
    }
    async addOrders(data: TPostReq) {
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
