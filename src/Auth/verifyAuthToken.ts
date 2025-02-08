import { PrismaClient } from '@prisma/client';
import { verifyDiscordAccessToken, verifyGoogleAccessToken } from './auth';
const prisma = new PrismaClient();

/**
 * Attempts to verify the token using Discord authentication first.
 * If that fails, it will try Google authentication.
 *
 * @param token - The access token from the client.
 * @returns An object with the trading account id and provider if verification is successful.
 * @throws An error if neither method validates the token.
 */
export async function verifyAuthToken(token: string) {
    // Try verifying as a Discord token.
    try {
        const discordResult = await verifyDiscordAccessToken(token);
        return getaccountId(discordResult);
    } catch (discordError) {
        console.warn('Discord authentication failed:', discordError);
    }

    // If the Discord check fails, try verifying as a Google token.
    try {
        const googleResult = await verifyGoogleAccessToken(token);
        return getaccountId(googleResult);
    } catch (googleError) {
        console.warn('Google authentication failed:', googleError);
    }

    // If both authentication methods fail, throw an error.
    throw new Error('Invalid access token for both providers');
}

async function getaccountId(data: { id: string; provider: 'discord' | 'google' }) {
    const userId = (
        await prisma.account.findUnique({
            where: {
                provider_providerAccountId: {
                    provider: data.provider,
                    providerAccountId: data.id,
                },
            },
        })
    )?.userId;
    // Return user data if the token is valid
    return (
        await prisma.tradingAccount.findUnique({
            where: {
                userId,
            },
            select: {
                id: true,
            },
        })
    )?.id;
}
