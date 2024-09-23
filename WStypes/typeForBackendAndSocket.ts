import { Order } from "@prisma/client";

export const UPDATE_ORDER = "UPDATE_ORDER";
export const NOTIFY_USER = "NOTIFY_USER";
export type NOTIFY_USER_PAYLOAD = Order;
export type UPDATE_ORDER_PAYLOAD = Order;
export type SendMessageToSuperUserType = {
  name: typeof UPDATE_ORDER;
  payload: UPDATE_ORDER_PAYLOAD;
};
