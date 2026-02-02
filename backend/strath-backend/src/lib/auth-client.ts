import { createAuthClient } from "better-auth/react";

// Web auth client - uses cookies by default
export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_APP_URL || "https://www.strathspace.com",
});

export const { signIn, signUp, signOut, useSession } = authClient;
