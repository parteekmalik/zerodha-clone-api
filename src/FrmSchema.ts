import { z } from "zod";

export const FormSchema = z.object({
    orderType: z.enum(["BUY", "SELL"]),
    trigerType: z.enum(["LIMIT", "STOP", "MARKET"]),
    quantity: z.number().positive(),
    price: z.number().nonnegative(),
    sl: z.number().min(0),
    tp: z.number().min(0),
    symbolName: z.string(),
    marketType: z.enum(["SPOT", "MARGIN"]),
    TradingAccountId: z.string(),
});
export type TFormSchema = {
    orderType: "BUY" | "SELL";
    trigerType: "LIMIT" | "STOP" | "MARKET";
    quantity: number;
    price: number;
    sl: number;
    tp: number;
    symbolName: string;
    marketType: "SPOT" | "MARGIN";
    TradingAccountId: string;
};
