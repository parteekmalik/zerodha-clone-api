import { PrismaClient } from "@prisma/client";
import axios from "axios";

const DISCORD_API_URL = "https://discord.com/api";
const prisma = new PrismaClient();

// Function to verify the Discord access token
const verifyDiscordAccessToken = async (accessToken: string) => {
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

export default verifyDiscordAccessToken;
