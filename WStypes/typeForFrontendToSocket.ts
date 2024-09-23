import { Order } from "@prisma/client";

export const BACKEND_SERVER_UPDATE = "BACKEND_SERVER_UPDATE";
export type BACKEND_SERVER_UPDATE_PAYLOAD = "connected" | "disconneted";
export const AUTHENTICATION = "AUTHENTICATION";
export type AUTHENTICATION_PAYLOAD = "sucessful" | "unsucessful";
export const NOTIFICATION = "NOTIFICATION";
export type NOTIFICATION_PAYLOAD = Order;
export type SendMessageToClientType =
  | { name: typeof NOTIFICATION; payload: NOTIFICATION_PAYLOAD }
  | {
      name: typeof BACKEND_SERVER_UPDATE;
      payload: BACKEND_SERVER_UPDATE_PAYLOAD;
    };
