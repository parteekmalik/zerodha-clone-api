import { TPostReq, orderType } from "../../utils/types";

export default function completeOrders(data: { s: string; p: string }, Orders: orderType) {
    if (!Orders) return { isleft: false, machedOrders: [] };
    const { BUYLIMIT, SELLLIMIT, BUYSTOP, SELLSTOP } = Orders;
    // console.log(data);
    // TODO: move code to orders class
    const machedOrders = [] as TPostReq[];
    while (BUYLIMIT.length && BUYLIMIT[0].price >= Number(data.p)) {
        // console.log("order matched buyLimit");
        machedOrders.push(BUYLIMIT.shift() as TPostReq);
    }
    while (SELLLIMIT.length && SELLLIMIT[0].price <= Number(data.p)) {
        // console.log("order matched sellLimit");
        machedOrders.push(SELLLIMIT.shift() as TPostReq);
    }
    while (SELLSTOP.length && SELLSTOP[0].price >= Number(data.p)) {
        // console.log("order matched sellStop");
        machedOrders.push(SELLSTOP.shift() as TPostReq);
    }
    while (BUYSTOP.length && BUYSTOP[0].price <= Number(data.p)) {
        // console.log("order matched buyStop");
        machedOrders.push(BUYSTOP.shift() as TPostReq);
    }
    if (machedOrders.length) {
        console.log("order matched", machedOrders);
    }
    if (!BUYLIMIT.length && !BUYSTOP.length && !SELLLIMIT.length && !SELLSTOP.length) return { isleft: true, machedOrders };
    else return { isleft: false, machedOrders };
}
