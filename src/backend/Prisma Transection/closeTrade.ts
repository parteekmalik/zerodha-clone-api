import { Prisma, PrismaClient } from "@prisma/client";
import { DefaultArgs } from "@prisma/client/runtime/library";
import { TOrder } from "../../utils/types";

export default async function closeOrderTransaction(db: PrismaClient<Prisma.PrismaClientOptions, never, DefaultArgs>, trade: TOrder, closePrice: number) {
    const isBuyOrder = trade.type === "BUY";
    const baseAssetName = trade.name.slice(0, -4).toUpperCase();
    const usdtAmount = trade.quantity * closePrice;

    const baseAssetData = isBuyOrder ? { freeAmount: { increment: trade.quantity } } : { lockedAmount: { decrement: trade.quantity } };

    const usdtAssetData = isBuyOrder ? { lockedAmount: { decrement: usdtAmount } } : { freeAmount: { increment: usdtAmount } };

    const transaction = await db.$transaction(async (tx) => {
        // Update base asset (e.g., BTC/ETH)
        await tx.assets.update({
            where: {
                unique_TradingAccountId_name: {
                    TradingAccountId: trade.TradingAccountId,
                    name: baseAssetName,
                },
            },
            data: baseAssetData,
        });

        // Update USDT asset
        await tx.assets.update({
            where: {
                unique_TradingAccountId_name: {
                    TradingAccountId: trade.TradingAccountId,
                    name: "USDT",
                },
            },
            data: usdtAssetData,
        });

        // Update order status to COMPLETED
        return await tx.order.update({
            where: { id: trade.id },
            data: { status: "COMPLETED" },
        });
    });

    return transaction;
}
