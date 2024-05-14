import axios from "axios";
import env from "../env";

export interface LTPResponse {
    symbol: string;
    price: string;
}

// Function overload for array input
async function getLTP(symbol: string[]): Promise<LTPResponse[]>;

// Function overload for single string input
async function getLTP(symbol: string): Promise<LTPResponse>;

// Implementation
async function getLTP(symbol: string | string[]): Promise<LTPResponse | LTPResponse[]> {
    if (Array.isArray(symbol)) {
        const url = env.BINANCE_LTP_URL + "s=" + symbol;
        const res = (await axios.get(url)).data as LTPResponse[];
        console.log("getLTP " + symbol.join(",") + " -> ", res);
        return res;
    } else {
        const url = env.BINANCE_LTP_URL + "=" + symbol;
        const res = (await axios.get(url)).data as LTPResponse;
        console.log("getLTP " + symbol + " -> ", res);
        return res;
    }
}
export default getLTP;
