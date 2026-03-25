import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { user } from "@/db/schema";
import { isDebugRouteEnabled, requireAdminApiSession } from "@/lib/security";

export async function GET(request: NextRequest) {
    try {
        if (!isDebugRouteEnabled()) {
            return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
        }

        const session = await requireAdminApiSession(request);
        if (!session?.user?.id) {
            return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
        }

        const allUsers = await db.select().from(user).limit(3);
        return NextResponse.json({ success: true, users: allUsers });
    } catch (error) {
        console.error("DB Test Error:", error);
        return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
    }
}
