import { Order } from "@prisma/client";

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

export type TOrder = Order;

export type orderType = {
    UPPER: TOrder[];
    LOWER: TOrder[];
};
