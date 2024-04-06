import { TPostReq, orderType } from "../../utils/types";

export default function completeOrders(data: { s: string; p: string }, Orders: orderType) {
    if (!Orders) return { isleft: false, machedOrders: [] };
    const { UPPER, LOWER } = Orders;
    // console.log(data);
    // TODO: move code to orders class
    const machedOrders = [] as TPostReq[];
    while (LOWER.length && LOWER[0].price >= Number(data.p)) {
        // console.log("order matched LOWER");
        machedOrders.push(LOWER.shift() as TPostReq);
    }
    while (UPPER.length && UPPER[0].price <= Number(data.p)) {
        // console.log("order matched UPPER");
        machedOrders.push(UPPER.shift() as TPostReq);
    }
    if (machedOrders.length) {
        console.log("order matched", machedOrders.length);
    }
    if (!UPPER.length && !LOWER.length) return { isleft: true, machedOrders };
    else return { isleft: false, machedOrders };
}
