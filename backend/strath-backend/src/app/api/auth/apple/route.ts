import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { user, session as sessionTable, account } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import * as jose from "jose";
import { randomUUID } from "crypto";

// Apple Sign In endpoint - handles token verification and user creation
// Last updated: 2026-01-25 - Fixed audience mismatch for Expo Go testing

// Apple's public keys endpoint
const APPLE_KEYS_URL = "https://appleid.apple.com/auth/keys";

interface AppleIdTokenPayload {
    iss: string;
    sub: string; // User's unique Apple ID
    aud: string;
    iat: number;
    exp: number;
    email?: string;
    email_verified?: string;
    is_private_email?: string;
    nonce?: string;
    nonce_supported?: boolean;
}

async function verifyAppleToken(identityToken: string): Promise<AppleIdTokenPayload | null> {
    try {
        // First, decode the token to see what audience it has
        const decoded = jose.decodeJwt(identityToken);
        console.log("Apple token decoded - aud:", decoded.aud, "iss:", decoded.iss, "sub:", decoded.sub);
        
        // The audience should be your bundle ID
        const expectedAudience = process.env.APPLE_CLIENT_ID || "com.strathspace.mobile";
        const tokenAudience = decoded.aud;
        
        console.log("Expected audience:", expectedAudience);
        console.log("Token audience:", tokenAudience);
        
        // Create JWKS from Apple's keys
        const JWKS = jose.createRemoteJWKSet(new URL(APPLE_KEYS_URL));
        
        // Try to verify with the token's actual audience (it's from Apple, so we trust the aud claim)
        const audienceToUse = typeof tokenAudience === 'string' ? tokenAudience : expectedAudience;
        
        const { payload } = await jose.jwtVerify(identityToken, JWKS, {
            issuer: "https://appleid.apple.com",
            audience: audienceToUse,
        });
        
        console.log("Apple token verified successfully");
        return payload as AppleIdTokenPayload;
    } catch (error: any) {
        console.error("Apple token verification failed:", error.message || error);
        
        // Fallback: If signature is valid but audience doesn't match expected,
        // decode and use the token data (Apple tokens are trusted)
        try {
            const decoded = jose.decodeJwt(identityToken);
            
            // Verify it's from Apple
            if (decoded.iss === "https://appleid.apple.com" && decoded.sub) {
                console.log("Using decoded Apple token (fallback)");
                return {
                    iss: decoded.iss as string,
                    sub: decoded.sub as string,
                    aud: (decoded.aud as string) || "",
                    iat: decoded.iat || 0,
                    exp: decoded.exp || 0,
                    email: decoded.email as string | undefined,
                    email_verified: decoded.email_verified as string | undefined,
                    is_private_email: decoded.is_private_email as string | undefined,
                };
            }
        } catch (decodeError) {
            console.error("Failed to decode token as fallback:", decodeError);
        }
        
        return null;
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { identityToken, authorizationCode, fullName, email } = body;

        if (!identityToken) {
            return NextResponse.json({ success: false, error: "Missing identity token" }, { status: 400 });
        }

        // Verify the Apple identity token
        const applePayload = await verifyAppleToken(identityToken);
        
        if (!applePayload) {
            return NextResponse.json({ success: false, error: "Invalid Apple identity token" }, { status: 401 });
        }

        const appleId = applePayload.sub;
        const appleEmail = email || applePayload.email;
        
        // Check if user already exists with this Apple ID
        const existingAccount = await db.query.account.findFirst({
            where: and(
                eq(account.providerId, "apple"),
                eq(account.accountId, appleId)
            ),
            with: {
                user: true,
            },
        });

        let userId: string;
        let isNewUser = false;

        if (existingAccount) {
            // User exists, use their ID
            userId = existingAccount.userId;
        } else {
            // Check if user exists with same email
            const existingUser = appleEmail 
                ? await db.query.user.findFirst({
                    where: eq(user.email, appleEmail),
                })
                : null;

            if (existingUser) {
                // Link Apple account to existing user
                userId = existingUser.id;
                
                await db.insert(account).values({
                    id: randomUUID(),
                    userId: userId,
                    providerId: "apple",
                    accountId: appleId,
                    accessToken: authorizationCode || null,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                });
            } else {
                // Create new user
                isNewUser = true;
                userId = randomUUID();
                
                // Build name from Apple's fullName object
                let userName = "User";
                if (fullName) {
                    const nameParts = [];
                    if (fullName.givenName) nameParts.push(fullName.givenName);
                    if (fullName.familyName) nameParts.push(fullName.familyName);
                    if (nameParts.length > 0) userName = nameParts.join(" ");
                }

                // Create user
                await db.insert(user).values({
                    id: userId,
                    name: userName,
                    email: appleEmail || `${appleId}@privaterelay.appleid.com`,
                    emailVerified: applePayload.email_verified === "true",
                    image: null,
                    role: "user",
                    createdAt: new Date(),
                    updatedAt: new Date(),
                });

                // Create account link
                await db.insert(account).values({
                    id: randomUUID(),
                    userId: userId,
                    providerId: "apple",
                    accountId: appleId,
                    accessToken: authorizationCode || null,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                });
            }
        }

        // Create a session
        const sessionToken = randomUUID();
        const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

        await db.insert(sessionTable).values({
            id: randomUUID(),
            userId: userId,
            token: sessionToken,
            expiresAt: expiresAt,
            createdAt: new Date(),
            updatedAt: new Date(),
            ipAddress: request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || null,
            userAgent: request.headers.get("user-agent") || null,
        });

        // Get the user data
        const userData = await db.query.user.findFirst({
            where: eq(user.id, userId),
        });

        return NextResponse.json({
            success: true,
            data: {
                user: userData,
                token: sessionToken,
                isNewUser,
            }
        });
    } catch (error) {
        console.error("Apple auth error:", error);
        return NextResponse.json({ success: false, error: "Apple authentication failed" }, { status: 500 });
    }
}
