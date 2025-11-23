import { createAuthClient } from "better-auth/react";
import * as SecureStore from "expo-secure-store";

export const authClient = createAuthClient({
    baseURL: process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000",
    fetchOptions: {
        headers: {
            Origin: "strathmobile://",
        },
    },
    storage: {
        getItem: async (key: string) => {
            return await SecureStore.getItemAsync(key);
        },
        setItem: async (key: string, value: string) => {
            return await SecureStore.setItemAsync(key, value);
        },
        removeItem: async (key: string) => {
            return await SecureStore.deleteItemAsync(key);
        },
    },
});

export const { signIn, signUp, signOut, useSession } = authClient;
