import dotenv from "dotenv";
dotenv.config();

export default {
    DATABASE_URL: process.env.DATABASE_URL as string,
    PORT: Number(process.env.PORT) as number,
    DATABASE_TYPE: process.env.DATABASE_TYPE as string,
    NODE_ENV: process.env.NODE_ENV as string,
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET as string,
    NEXTAUTH_URL: process.env.NEXTAUTH_URL as string,
    DISCORD_CLIENT_ID: process.env.DISCORD_CLIENT_ID as string,
    DISCORD_CLIENT_SECRET: process.env.DISCORD_CLIENT_SECRET as string,
    BACKEND_URL: process.env.BACKEND_URL as string,
    BINANCE_WS_URL: process.env.BINANCE_WS_URL as string,
    BINANCE_LTP_URL: process.env.BINANCE_LTP_URL as string,
    BACKEND_SECRET_CODE: process.env.BACKEND_SECRET_CODE as string,
    DB_TIME_INTERVAL: Number(process.env.DB_TIME_INTERVAL) as number,
};
