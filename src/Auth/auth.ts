import { PrismaClient } from "@prisma/client";
import axios from "axios";

const prisma = new PrismaClient();

// --- Discord Authentication ---
const DISCORD_API_URL = "https://discord.com/api";

export const verifyDiscordAccessToken = async (accessToken: string) => {
    try {
        const response = await axios.get(`${DISCORD_API_URL}/users/@me`, {
            headers: {
                Authorization: `Bearer ${accessToken}`, // Discord expects the token as a Bearer token
            },
        });

        const userId = (await prisma.account.findUnique({
            where: {
                provider_providerAccountId: {
                    provider: "discord",
                    providerAccountId: response.data.id,
                },
            },
        }))?.userId
        // Return user data if the token is valid
        return await prisma.tradingAccount.findUnique({
            where: {
                userId,
            },
            select: {
                id: true,
            },
        });
    } catch (error) {
        throw new Error("Invalid access token");
    }
};

// --- Google Authentication ---

// Helper function to get the Google token info via axios
const verifyGoogleAccessTokenInfo = async (accessToken: string) => {
    const response = await axios.get(
        `https://www.googleapis.com/oauth2/v3/tokeninfo?access_token=${accessToken}`
    );
    return response.data;
};

export const verifyGoogleAccessToken = async (accessToken: string) => {
    try {
        const response = await verifyGoogleAccessTokenInfo(accessToken);
        console.log(response);
        const userId = (
            await prisma.account.findUnique({
                where: {
                    provider_providerAccountId: {
                        provider: "google",
                        providerAccountId: response.sub,
                    },
                },
            })
        )?.userId;

        // Return trading account data if the token is valid
        return await prisma.tradingAccount.findUnique({
            where: { userId },
            select: { id: true },
        });
    } catch (error) {
        throw new Error("Invalid Google access token");
    }
};
