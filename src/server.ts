import { PrismaClient } from "@prisma/client";
import cors from "cors";
import express from "express";
import http from "http";
import { Server } from "socket.io";
import env from "./env";
import router from "./router";
import { ServerSocket } from "./socket";
const prisma = new PrismaClient();
// Create a Socket.IO server instance
const port = env.PORT;

const application = express();
application.use(cors());

// application.use(cors());
/** Server Handling */
const httpServer = http.createServer(application);

/** Log the request */
application.use((req, res, next) => {
    if (req.url !== "/ping") {
        console.info(`METHOD: [${req.method}] - URL: [${req.url}] - IP: [${req.socket.remoteAddress}]`);

        res.on("finish", () => {
            console.info(`METHOD: [${req.method}] - URL: [${req.url}] - STATUS: [${res.statusCode}] - IP: [${req.socket.remoteAddress}]`);
        });
    }

    next();
});
/** Parse the body of the request */

/** Rules of our API */
// application.use((req, res, next) => {
//     res.header("Access-Control-Allow-Origin", "*");
//     res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");

//     if (req.method == "OPTIONS") {
//         res.header("Access-Control-Allow-Methods", "PUT, POST, PATCH, DELETE, GET");
//         return res.status(200).json({});
//     }

//     next();
// });

/** Start Socket */
const io = new ServerSocket(httpServer);

setInterval(async () => {
    const res = await prisma.orderMessageQ.count();
    if (res) {
        const messages = await prisma.orderMessageQ.findMany({});
        const orders = await prisma.orders.findMany({
            where: {
                id: {
                    in: messages.map((item) => item.Orders),
                },
            },
        });
        console.log("new messageQ found ->", messages);
        orders.map((item) => {
            const message = messages.filter((i) => i.Orders === item.id)[0];
            const payload = { ...message, item };
            io.SendMessage("message", item.TradingAccountId, payload);
        });
        const res = await prisma.orderMessageQ.deleteMany({
            where: {
                id: {
                    in: messages.map((i) => i.id),
                },
            },
        });
        console.log(res);
    }
}, 1000);

application.use(router);

/** Listen */
httpServer.listen(port, () => console.info(`Server is running`));
console.log(`Socket.IO server running on port ${port}.`);
