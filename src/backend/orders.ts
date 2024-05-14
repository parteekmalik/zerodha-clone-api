import { $Enums, PrismaClient } from "@prisma/client";
import { TPostReq } from "../utils/types";
import WSbinance from "./Binance";
import superUserSocket from "./superUserSocket";
import OrdersRecord from "./Trades/OrderRecord";
const prisma = new PrismaClient();

export default class OrdersManage {
    private ws;
    public orders = new OrdersRecord();
    public count = 0;
    private SuperWS = new superUserSocket(process.env.BACKEND_URL as string, {
        setAddOrderFunction: (order: TPostReq) => {
            console.log("recived order from server ->")
            this.orders.addOrder(order);
            this.ws.updateSubscription(this.orders.subscriptions);
        },
        setDeleteOrderFunction: async (ordersid: number | number[]) => {
            if (!Array.isArray(ordersid)) ordersid = [ordersid];
            const orders = await prisma.trades.findMany({
                where: { id: { in: ordersid } },
            });
            console.log("order recieved ->", orders);
            this.orders.deleteOrders(orders);
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
            this.FillTrades(matchedOrder.MatchedOrders.matchedOrders);
            this.closeTrades(matchedOrder.TP_SL_MatchedOrders.sl, "sl");
            this.closeTrades(matchedOrder.TP_SL_MatchedOrders.tp, "tp");
            if (matchedOrder.MatchedOrders.left + matchedOrder.TP_SL_MatchedOrders.left === 0) this.ws.updateSubscription(this.orders.subscriptions);
        });
    }
    async FillTrades(order: TPostReq[]) {
        if (!order.length) return "no orders sent";
        console.log("orders sent to db ->", order);
        try {
            const res = await prisma.trades.updateMany({
                where: {
                    id: { in: order.map((i) => i.id) },
                },
                data: { status: "FILLED" },
            });
            this.SuperWS.sendNotification(
                order.map((item) => {
                    return { ...item, status: "FILLED" as $Enums.TradeStatus };
                })
            );
            this.count -= order.length;
            console.log(res);
            return res;
        } catch {
            console.log("error in updating orders");
        }
    }
    async closeTrades(order: TPostReq[], type: "sl" | "tp") {
        if (!order.length) return "no orders sent";
        console.log("orders sent to db ->", order);
        try {
            let res = order.map(async (trade) => {
                return await prisma.trades.update({
                    where: {
                        id: trade.id,
                    },
                    data: { status: "CLOSED", closePrice: trade[type] },
                });
            });
            const ClosedTrades = await Promise.all(res);

            this.SuperWS.sendNotification(ClosedTrades);
            this.count -= order.length;
            console.log(ClosedTrades);
            return ClosedTrades;
        } catch {
            console.log("error in updating orders");
        }
    }
}
