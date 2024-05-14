import axios from "axios";
import express from "express";
import env from "./env";
import getLTP from "./utils/getLTP";

const router = express.Router();

router.get("/", (req, res) => {
    res.send({ response: "Server is up and running." }).status(200);
});
/** Healthcheck */
router.get("/ping", (req, res, next) => {
    return res.status(200).json({ hello: "world!" });
});
router.get("/curPrice", async (req, res, next) => {
    console.log(req.query);
    if (req.query.symbols) return res.json((await axios.get(env.BINANCE_LTP_URL + "s=" + req.query.symbols)).data);
    if (req.query.symbol) return res.json((await axios.get(env.BINANCE_LTP_URL + "=" + req.query.symbol)).data);
});

/** Error handling */
router.use((req, res, next) => {
    const error = new Error("Not found");

    res.status(404).json({
        message: error.message,
    });
});
export default router;
