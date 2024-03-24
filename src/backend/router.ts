import express from "express";
import WSbinance from "./orderExecution";
import { TFormSchema } from "../FrmSchema";

const router = express.Router();
/** Start Socket */
const io = new WSbinance();

router.get("/", (req, res) => {
    res.send({ response: "Server is up and running." }).status(200);
});
/** Healthcheck */
router.get("/ping", (req, res, next) => {
    return res.status(200).json({ hello: "world!" });
});
router.post("/addorder", (req, res, next) => {
    console.log("addrder ->", req.body, typeof req.body);
    const data = req.body as TFormSchema;
    // const data = JSON.parse(req.body.toString()) as TFormSchema[];
    io.addOrder(data);
    return res.status(200).json({ hello: data });
});
/** Error handling */
router.use((req, res, next) => {
    const error = new Error("Not found");

    res.status(404).json({
        message: error.message,
    });
});
export default router;
 