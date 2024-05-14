import { Prisma, PrismaClient } from "@prisma/client";
import { DefaultArgs } from "@prisma/client/runtime/library";
import { TPostReq } from "../../utils/types";

// TODO: add logic for limit orders (add lockedBalance)
export default async function closeOrderTranection(db: PrismaClient<Prisma.PrismaClientOptions, never, DefaultArgs>, trade: TPostReq, closePrice: number) {
    const transection = await db.$transaction(async (tx) => {
        const name = trade.name.slice(0, -4).toUpperCase();

        const data = {
            USDT: trade.quantity * closePrice,
            asset: trade.quantity,
        };

        const res = await tx.trades.update({
            where: {
                id: trade.id,
            },
            data: {
                status: "CLOSED",
                closePrice: closePrice,
            },
        });

        await tx.tradeAssets.update({
            where: {
                unique_TradingAccountId_name: {
                    TradingAccountId: trade.TradingAccountId,
                    name,
                },
                TradingAccountId: trade.TradingAccountId,
                name,
            },
            data: {
                freeAmount: {
                    decrement: data.asset,
                },
            },
        });
        await tx.tradingAccount.update({
            where: {
                id: trade.TradingAccountId,
            },
            data: {
                USDT_Free_balance: {
                    increment: data.USDT,
                },
            },
        });
        return res;
    });
    return transection;
}
