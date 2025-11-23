import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { user } from "@/db/schema";

export async function GET() {
    try {
        const allUsers = await db.select().from(user).limit(3);
        return NextResponse.json({ success: true, users: allUsers });
    } catch (error) {
        console.error("DB Test Error:", error);
        return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
    }
}
