import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export async function requireAdmin() {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) redirect("/login");
    if ((session.user as any).role !== "admin") redirect("/app/discover");
    return session;
}

export async function getAdminSession() {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) return null;
    if ((session.user as any).role !== "admin") return null;
    return session;
}
