import { PrismaClient } from "@prisma/client";
import { TOrder } from "../utils/types";
import WSbinance from "./Binance";
import closeOrderTranection from "./Prisma Transection/closeTrade";
import superUserSocket from "./superUserSocket";
import OrdersRecord from "./Trades/OrderRecord";
import env from "../env";
const prisma = new PrismaClient();

export default class OrdersManager {
    private ws;
    public OrderRecords = new OrdersRecord();
    private SuperWS = new superUserSocket(`http://localhost:${env.PORT}`, {
        setUpdateOrderFunction: (order: TOrder) => {
            console.log("recived order from server ->", order);
            this.OrderRecords.updateOrder([order]);
            // console.log(this.OrderRecords.orders);
            this.ws.updateSubscription(this.OrderRecords.getSubsriptions());
        },
    });
    constructor() {
        this.PopulateOrdersFromDB();
        this.ws = new WSbinance(env.BINANCE_WS_URL);
        this.ws.setonmessage((msg) => {
            console.log(msg.s,msg.p);
            const matchedOrder = this.OrderRecords.matchOrders(msg);
            console.log(matchedOrder);
            matchedOrder.matchedOrders.forEach((trade) => this.closeTrades(trade, Number(msg.p)));
            if (matchedOrder.left === 0) this.ws.updateSubscription(this.OrderRecords.getSubsriptions());
        });
    }
    private async PopulateOrdersFromDB() {
        const res = await prisma.order.findMany({
            where: {
                status: "OPEN",
            },
        });
        console.log("orders colleed from db ->", res.length);
        this.OrderRecords.updateOrder(res);
        // console.log(this.OrderRecords.orders);
        this.ws.updateSubscription(this.OrderRecords.getSubsriptions());
    }
    async closeTrades(order: TOrder, price: number) {
        console.log("orders sent to db ->", order);
        try {
            const res = await closeOrderTranection(prisma, order, price);
            this.SuperWS.sendNotification(res);
        } catch {
            console.log("didnt update trade");
        }
    }
}
