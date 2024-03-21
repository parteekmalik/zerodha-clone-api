const env = {
    DATABASE_URL: process.env.DATABASE_URL as string,
    DATABASE_TYPE: process.env.DATABASE_TYPE as string,
    NODE_ENV: process.env.NODE_ENV as string,
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET as string,
    NEXTAUTH_URL: process.env.NEXTAUTH_URL as string,
    DISCORD_CLIENT_ID: process.env.DISCORD_CLIENT_ID as string,
    DISCORD_CLIENT_SECRET: process.env.DISCORD_CLIENT_SECRET as string,
};
export default env;