import { verifyDiscordAccessToken, verifyGoogleAccessToken } from './auth';

/**
 * Attempts to verify the token using Discord authentication first.
 * If that fails, it will try Google authentication.
 *
 * @param token - The access token from the client.
 * @returns An object with the trading account id and provider if verification is successful.
 * @throws An error if neither method validates the token.
 */
export async function verifyAuthToken(
    token: string
): Promise<{ id: string; provider: 'discord' | 'google' }> {
    // Try verifying as a Discord token.
    try {
        const discordResult = await verifyDiscordAccessToken(token);
        if (discordResult && discordResult.id) {
            console.log('Authenticated using Discord:', discordResult.id);
            return { id: discordResult.id, provider: 'discord' };
        }
    } catch (discordError) {
        console.warn('Discord authentication failed:', discordError);
    }

    // If the Discord check fails, try verifying as a Google token.
    try {
        const googleResult = await verifyGoogleAccessToken(token);
        if (googleResult && googleResult.id) {
            console.log('Authenticated using Google:', googleResult.id);
            return { id: googleResult.id, provider: 'google' };
        }
    } catch (googleError) {
        console.warn('Google authentication failed:', googleError);
    }

    // If both authentication methods fail, throw an error.
    throw new Error('Invalid access token for both providers');
}
