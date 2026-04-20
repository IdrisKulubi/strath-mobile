import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { expo } from "@better-auth/expo";
import { db } from "./db";
import * as schema from "../db/schema";
import { WEB_CORS_ORIGINS } from "./web-cors-origins";

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
        apple: {
            clientId: process.env.APPLE_CLIENT_ID!,
            clientSecret: process.env.APPLE_CLIENT_SECRET!,
        },
    },
    plugins: [expo()],
    // Long-lived sessions for the native app. The token is persisted in SecureStore
    // on the device, so effectively the user stays logged in until they explicitly
    // sign out, their session is revoked server-side, or 90 days of inactivity pass.
    session: {
        expiresIn: 60 * 60 * 24 * 90, // 90 days
        updateAge: 60 * 60 * 24, // refresh the expiry once per day of activity
    },
    trustedOrigins: [
        ...WEB_CORS_ORIGINS,

        // Mobile app scheme (MUST match app.json "expo.scheme" and expoClient.scheme)
        "strathspace://",
        "strathspace://*",
        // Older app binaries may still use this casing from a previous auth-client config
        "strathSpace://",
        "strathSpace://*",

        // Expo Go development - ADD YOUR CURRENT IP HERE
        "exp://172.20.10.4:8081",
        "exp://172.20.10.4:8082",
        "exp://192.168.100.24:8081",
        "exp://192.168.100.24:8082",
        "exp://localhost:8081",
        "exp://localhost:8082",
    ],
    user: {
        additionalFields: {
            role: {
                type: "string",
                defaultValue: "user",
            },
            deletedAt: {
                type: "date",
                required: false,
            },
        },
    },
});
