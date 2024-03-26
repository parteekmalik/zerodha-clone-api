import axios from "axios";
import env from "../env";

async function getLTP(symbol: string) {
    const url = env.BINANCE_LTP_URL + symbol;
    const res = (await axios.get(url)).data as { symbol: string; price: string };
    console.log("getLTP " + symbol + " -> ", res);
    return Number(res.price);
}
export default getLTP;
