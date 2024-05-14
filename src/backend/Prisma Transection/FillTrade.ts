import { Prisma, PrismaClient } from "@prisma/client";
import { DefaultArgs } from "@prisma/client/runtime/library";
import { TPostReq } from "../../utils/types";

// TODO: add logic for limit orders (add lockedBalance)
export default async function fillOrderTranection(db: PrismaClient<Prisma.PrismaClientOptions, never, DefaultArgs>, Trade: TPostReq) {
    const transection = await db.$transaction(async (tx) => {
        // TODO: cal amount to be released and store in variable

        const usdt_to_be_freed = Trade.quantity * Trade.openPrice;

        //complete transection
        const res = await tx.trades.update({
            where: {
                id: Trade.id,
            },
            data: {
                status: "FILLED",
            },
        });

        await tx.tradingAccount.update({
            where: {
                id: Trade.TradingAccountId,
            },
            data: {
                USDT_Locked_balance: {
                    decrement: usdt_to_be_freed,
                },
            },
        });
        return res;
    });
    return transection;
}
