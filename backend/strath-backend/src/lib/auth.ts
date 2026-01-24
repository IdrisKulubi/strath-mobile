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
        apple: {
            clientId: process.env.APPLE_CLIENT_ID!,
            clientSecret: process.env.APPLE_CLIENT_SECRET!,
        },
    },
    plugins: [expo()],
    trustedOrigins: [
        // Mobile app scheme (MUST match app.json and auth-client.ts)
        "strathSpace://",

        // Production backend
        "https://www.strathspace.com",
        "https://strathspace.com",

        // Expo Go development - ADD YOUR CURRENT IP HERE
        "exp://172.20.10.4:8081",
        "exp://172.20.10.4:8082",
        "exp://192.168.100.24:8081",
        "exp://192.168.100.24:8082",
        "exp://localhost:8081",
        "exp://localhost:8082",

        // Web/API development
        "http://172.20.10.4:3000",
        "http://192.168.100.24:3000",
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
            deletedAt: {
                type: "date",
                required: false,
            },
        },
    },
});
