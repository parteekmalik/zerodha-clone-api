import axios from "axios";

async function getLTP(symbol: string) {
    const url = "https://api.binance.com/api/v3/ticker/price?symbol=" + symbol;
    const res = (await axios.get(url)).data as { symbol: string; price: string };
    console.log("getLTP " + symbol + " -> ", res);
    return Number(res.price);
}
export default getLTP;
