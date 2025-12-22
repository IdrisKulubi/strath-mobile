import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { expo } from "@better-auth/expo";
import { db } from "./db";
import * as schema from "../db/schema";

export const auth = betterAuth({
    database: drizzleAdapter(db, {
        provider: "pg",
        schema: schema,
    }),
    emailAndPassword: {
        enabled: true,
    },
    socialProviders: {
        google: {
            clientId: process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
        },
    },
    plugins: [expo()],
    trustedOrigins: [
        "strathmobile://",
        "http://192.168.100.24:3000",
        "https://strath-mobile-j9lv.vercel.app",
        // Expo Go development - needs to be trusted even when API is in production
        "exp://192.168.100.24:8081",
        "exp://192.168.100.24:8082",
        "exp://localhost:8081",
        "exp://localhost:8082",
        // Web development
        "http://localhost:8081",
        "http://localhost:8082",
        "http://localhost:3000",
    ],
    user: {
        additionalFields: {
            role: {
                type: "string",
                defaultValue: "user",
            },
        },
    },
});
