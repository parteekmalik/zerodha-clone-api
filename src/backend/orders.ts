import { $Enums, PrismaClient } from "@prisma/client";
import { TPostReq } from "../utils/types";
import WSbinance from "./Binance";
import superUserSocket from "./superUserSocket";
import OrdersRecord from "./Trades/OrderRecord";
import closeOrderTranection from "./Prisma Transection/closeTrade";
import fillOrderTranection from "./Prisma Transection/FillTrade";
const prisma = new PrismaClient();

export default class OrdersManage {
    private ws;
    public orders = new OrdersRecord();
    public count = 0;
    private SuperWS = new superUserSocket(process.env.BACKEND_URL as string, {
        setAddOrderFunction: (order: TPostReq) => {
            console.log("recived order from server ->", order);
            this.orders.addOrder(order);
            console.log(this.orders.orders);
            this.ws.updateSubscription(this.orders.subscriptions);
        },
    });
    private async PopulateOrdersFromDB() {
        const res = (
            await prisma.trades.findMany({
                where: {
                    OR: [{ status: "PENDING" }, { status: "FILLED" }],
                },
            })
        ).filter((i) => {
            if (i.status === "PENDING") return true;
            if (i.status === "FILLED" && (i.sl > 0 || i.tp > 0)) return true;
        });

        console.log("orders colleed from db ->", res.length, res);
        res.map((item) => {
            this.orders.addOrder(item);
        });
        console.log(this.orders.orders);
        this.ws.updateSubscription(this.orders.subscriptions);
    }
    constructor() {
        this.PopulateOrdersFromDB();
        this.ws = new WSbinance(process.env.BINANCE_WS_URL as string);
        this.ws.setonmessage((msg) => {
            // console.log(msg);
            const matchedOrder = this.orders.matchOrders(msg);
            matchedOrder.MatchedOrders.matchedOrders.forEach((trade) => this.FillTrades(trade));
            matchedOrder.TP_SL_MatchedOrders.sl.forEach((trade) => this.closeTrades(trade, "sl"));
            matchedOrder.TP_SL_MatchedOrders.tp.forEach((trade) => this.closeTrades(trade, "tp"));
            if (matchedOrder.MatchedOrders.left + matchedOrder.TP_SL_MatchedOrders.left === 0) this.ws.updateSubscription(this.orders.subscriptions);
        });
    }
    async FillTrades(order: TPostReq) {
        console.log("orders sent to db ->", order);
        const res = await fillOrderTranection(prisma, order);
        this.SuperWS.sendNotification(res);
        this.count--;
        console.log(res);
    }
    async closeTrades(order: TPostReq, type: "sl" | "tp") {
        console.log("orders sent to db ->", order);
        const res = await closeOrderTranection(prisma, order, order[type]);

        this.SuperWS.sendNotification(res);
        this.count--;
        console.log(res);
    }
}
