import { auth } from "@/lib/auth";

// Extend Better Auth's user type to include our custom fields
declare module "better-auth" {
    interface User {
        role?: "user" | "admin";
        deletedAt?: Date | null;
        lastActive?: Date;
        isOnline?: boolean;
        profilePhoto?: string | null;
        phoneNumber?: string | null;
        pushToken?: string | null;
    }

    interface Session {
        user: User;
    }
}

// Export the auth type for use in API routes
export type Auth = typeof auth;
export type AuthSession = Awaited<ReturnType<typeof auth.api.getSession>>;
