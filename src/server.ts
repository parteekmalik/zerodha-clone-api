import { PrismaClient } from "@prisma/client";
import express from "express";
import http from "http";
import { ServerSocket } from "./socket";
const prisma = new PrismaClient();

// Create a Socket.IO server instance
const port = 3002;

const application = express();

/** Server Handling */
const httpServer = http.createServer(application);

/** Start Socket */
new ServerSocket(httpServer);

/** Log the request */
application.use((req, res, next) => {
    console.info(`METHOD: [${req.method}] - URL: [${req.url}] - IP: [${req.socket.remoteAddress}]`);

    res.on("finish", () => {
        console.info(`METHOD: [${req.method}] - URL: [${req.url}] - STATUS: [${res.statusCode}] - IP: [${req.socket.remoteAddress}]`);
    });

    next();
});
/** Parse the body of the request */

/** Rules of our API */
application.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");

    if (req.method == "OPTIONS") {
        res.header("Access-Control-Allow-Methods", "PUT, POST, PATCH, DELETE, GET");
        return res.status(200).json({});
    }

    next();
});

/** Healthcheck */
application.get("/ping", (req, res, next) => {
    return res.status(200).json({ hello: "world!" });
});

/** Socket Information */
application.get("/status", (req, res, next) => {
    return res.status(200).json({ users: ServerSocket.instance.usersToID });
});

/** Error handling */
application.use((req, res, next) => {
    const error = new Error("Not found");

    res.status(404).json({
        message: error.message,
    });
});

/** Listen */
httpServer.listen(port, () => console.info(`Server is running`));
console.log(`Socket.IO server running on port ${port}.`);
