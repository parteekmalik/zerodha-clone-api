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
    id: string;
    createdAt: Date;
    name: string;
    type: $Enums.OrderType;
    price: number;
    quantity: number;
    status: $Enums.OrderStatus;
    triggerType: $Enums.EtriggerType;
    sl: number;
    tp: number;
    TradingAccountId: string;
};

export type orderType = {
    UPPER: TPostReq[];
    LOWER: TPostReq[];
};
