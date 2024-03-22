import { $Enums } from "@prisma/client";

export type Twsbinance =
    | {
          method: WS_method;
          params: string[];
          id: number;
      }
    | {
          method: "LIST_SUBSCRIPTIONS";
          id: number;
      };
export type WS_method = "SUBSCRIBE" | "UNSUBSCRIBE";
export type WS_response = { result: null | string[]; id: number } | { s: string; p: string };

export type TPostReq = {
    name: string;
    type: "BUY" | "SELL";
    trigerType: "LIMIT" | "STOP" | "MARKET";
    status: $Enums.OrderStatus;
    price: number;
    quantity: number;
    sl?: number;
    tp?: number;
    TradingAccountId: string;
};

export type orderType = {
    buyLimit: TPostReq[];
    sellLimit: TPostReq[];
    buyStop: TPostReq[];
    sellStop: TPostReq[];
};
