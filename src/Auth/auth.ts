import axios from 'axios';

// --- Discord Authentication ---
const DISCORD_API_URL = 'https://discord.com/api';

export const verifyDiscordAccessToken = async (accessToken: string) => {
    try {
        const response = await axios.get(`${DISCORD_API_URL}/users/@me`, {
            headers: {
                Authorization: `Bearer ${accessToken}`, // Discord expects the token as a Bearer token
            },
        });

        return { id: response.data.id as string, provider: 'discord' as const };
    } catch (error) {
        throw new Error('Invalid Discord access token');
    }
};

// --- Google Authentication ---

export const verifyGoogleAccessToken = async (accessToken: string) => {
    try {
        const response = await axios.get(
            `https://www.googleapis.com/oauth2/v3/tokeninfo?access_token=${accessToken}`
        );
        return { id: response.data.sub as string, provider: 'google' as const };
    } catch (error) {
        throw new Error('Invalid Google access token');
    }
};
