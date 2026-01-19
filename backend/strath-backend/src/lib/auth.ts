import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { expo } from "@better-auth/expo";
import { db } from "./db";
import * as schema from "../db/schema";
import { eq, isNull } from "drizzle-orm";

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
        // Mobile app scheme (MUST match app.json and auth-client.ts)
        "strathSpace://",

        // Production backend
        "https://strath-mobile-j9lv.vercel.app",

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
    hooks: {
        before: [
            {
                matcher: (context) => context.path === "/sign-in/email",
                handler: async (context) => {
                    // Check if user account is deleted before allowing sign in
                    const body = context.body as { email?: string } | undefined;
                    if (body?.email) {
                        const existingUser = await db.query.user.findFirst({
                            where: eq(schema.user.email, body.email),
                        });
                        
                        if (existingUser?.deletedAt) {
                            throw new Error("This account has been deleted. Please create a new account.");
                        }
                    }
                },
            },
        ],
        after: [
            {
                matcher: (context) => context.path.startsWith("/sign-in"),
                handler: async (context) => {
                    // After successful sign in, check if account is deleted
                    const response = context.response;
                    if (response && context.context?.session?.userId) {
                        const userId = context.context.session.userId;
                        const userRecord = await db.query.user.findFirst({
                            where: eq(schema.user.id, userId),
                        });
                        
                        if (userRecord?.deletedAt) {
                            // Delete the session that was just created
                            await db.delete(schema.session)
                                .where(eq(schema.session.userId, userId));
                            
                            throw new Error("This account has been deleted. Please create a new account.");
                        }
                    }
                },
            },
        ],
    },
});
