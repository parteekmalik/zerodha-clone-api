import cors from "cors";
import express from "express";
import http from "http";
import env from "./env";
import router from "./Routers/router";
import { ServerSocket } from "./Routers/socket";
// Create a Socket.IO server instance
const port = env.PORT;

const application = express();
application.use(cors());

// application.use(cors());
/** Server Handling */
const httpServer = http.createServer(application);

application.use((req, res, next) => {
    console.log(req.url);
    next();
});

/** Parse the body of the request */
application.use(router);
new ServerSocket(httpServer);
/** Listen */
 httpServer.listen(port, () => console.info(`Server is running on port ${port}.`));
