import { createAuthClient } from "better-auth/react";
import { expoClient } from "@better-auth/expo/client";
import * as SecureStore from "expo-secure-store";

export const authClient = createAuthClient({
    baseURL: process.env.EXPO_PUBLIC_API_URL || "https://www.strathspace.com",
    plugins: [
        expoClient({
            // MUST match app.json "expo.scheme" (Android intent filters are case-sensitive)
            scheme: "strathspace",
            storagePrefix: "strathspace",
            storage: SecureStore,
        })
    ]
});

export const { signIn, signUp, signOut, useSession } = authClient;
