import { Order } from "@prisma/client";

export const UPDATE_OR_ADD_ORDER = "UPDATE_OR_ADD_ORDER";
export type UPDATE_OR_ADD_ORDER_PAYLOAD = Order;