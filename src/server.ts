import WSbinance from "./webSocket";
import express from "express";
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

type orderType = {
    asks: { price: number }[];
    bids: { price: number }[];
};
const orders: Record<string, orderType> = { BTCUSDT: { asks: [{ price: 70000 }], bids: [{ price: 70600 }] } };
const ws = new WSbinance("wss://stream.binance.com:9443/ws", {
    onmessage(data) {
        const { asks, bids } = orders[data.s];
        // console.log(data, SymbolOrders);
        if (asks.length && asks[0].price >= Number(data.p)) {
            console.log("asks matched");
            while (asks.length && asks[0].price >= Number(data.p)) {
                console.log("order complete");
                asks.shift();
            }
        } else if (bids.length && bids[0].price <= Number(data.p)) {
            console.log("bids matched");
            while (bids.length && bids[0].price <= Number(data.p)) {
                console.log("order complete");
                bids.shift();
            }
        }
    },
});

const app = express();
const port = 3000;

app.get("/", (req, res) => {
    res.send("geeting pending orders");
});
app.post("/new", (req, res) => {
    res.send("creating order");
});

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`);
});
