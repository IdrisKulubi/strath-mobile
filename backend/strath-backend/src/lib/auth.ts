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
        " https://kind-moles-occur.loca.lt",
        // Development mode - Expo's exp:// scheme
        ...(process.env.NODE_ENV === "development" ? [
            "exp://192.168.100.24:8081",
            "exp://*/*",
            "exp://192.168.*.*:*/*",
        ] : [])
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
