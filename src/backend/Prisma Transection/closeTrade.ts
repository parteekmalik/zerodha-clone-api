import { Prisma, PrismaClient } from "@prisma/client";
import { DefaultArgs } from "@prisma/client/runtime/library";
import { TOrder } from "../../utils/types";

// TODO: add logic for limit orders (add lockedBalance)
export default async function closeOrderTranection(
    db: PrismaClient<Prisma.PrismaClientOptions, never, DefaultArgs>,
    trade: TOrder,
    closePrice: number
) {
    const transection = await db.$transaction(async (tx) => {
        const name = trade.name.slice(0, -4).toUpperCase();

        const data = {
            USDT: trade.quantity * closePrice,
            asset: trade.quantity,
        };

        const res = await tx.order.update({
            where: {
                id: trade.id,
            },
            data: {
                status: "COMPLETED",
                price: closePrice,
            },
        });

        await tx.assets.update({
            where: {
                unique_TradingAccountId_name: {
                    TradingAccountId: trade.TradingAccountId,
                    name,
                },
            },
            data: {
                freeAmount: {
                    decrement: data.asset,
                },
            },
        });
        await tx.assets.update({
            where: {
                unique_TradingAccountId_name: {
                    TradingAccountId: trade.TradingAccountId,
                    name: "USDT",
                },
            },
            data: {
                freeAmount: {
                    increment: data.USDT,
                },
                lockedAmount: {
                    decrement: trade.quantity * trade.price,
                },
            },
        });
        return res;
    });
    return transection;
}
