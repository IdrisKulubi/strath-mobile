import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { user, account, profiles } from "@/db/schema";
import { eq } from "drizzle-orm";
import { hash } from "bcrypt";

// Demo account credentials
const DEMO_EMAIL = "demo@strathspace.com";
const DEMO_PASSWORD = "AppleReview2026!";
const DEMO_USER_ID = "demo-user-apple-review";

export async function POST(request: NextRequest) {
    try {
        // Check if demo user already exists
        const existingUser = await db
            .select()
            .from(user)
            .where(eq(user.email, DEMO_EMAIL))
            .limit(1);

        if (existingUser.length > 0) {
            return NextResponse.json({
                message: "Demo account already exists",
                email: DEMO_EMAIL
            });
        }

        // Hash the password using bcrypt (should be installed in Next.js projects)
        const hashedPassword = await hash(DEMO_PASSWORD, 10);

        // Create demo user
        await db.insert(user).values({
            id: DEMO_USER_ID,
            name: "Demo User",
            email: DEMO_EMAIL,
            emailVerified: true,
            role: "user",
            image: "https://api.dicebear.com/7.x/avataaars/png?seed=demo",
            profilePhoto: "https://api.dicebear.com/7.x/avataaars/png?seed=demo",
            createdAt: new Date(),
            updatedAt: new Date(),
            lastActive: new Date(),
            isOnline: false,
        });

        // Create credential account for email/password login
        await db.insert(account).values({
            id: `account-${DEMO_USER_ID}`,
            userId: DEMO_USER_ID,
            accountId: DEMO_USER_ID,
            providerId: "credential",
            password: hashedPassword,
            createdAt: new Date(),
            updatedAt: new Date(),
        });

        // Create demo profile
        await db.insert(profiles).values({
            userId: DEMO_USER_ID,
            bio: "Hi! I'm the demo account for Apple reviewers. Feel free to explore the app!",
            course: "Computer Science",
            yearOfStudy: 3,
            interests: ["Technology", "Networking", "Career Development", "Campus Events"],
            photos: [
                "https://api.dicebear.com/7.x/avataaars/png?seed=demo1",
                "https://api.dicebear.com/7.x/avataaars/png?seed=demo2",
            ],
            isComplete: true,
            profileCompleted: true,
            firstName: "Demo",
            lastName: "User",
            createdAt: new Date(),
            updatedAt: new Date(),
        });

        return NextResponse.json({
            success: true,
            message: "Demo account created successfully",
            credentials: {
                email: DEMO_EMAIL,
                password: DEMO_PASSWORD
            }
        });

    } catch (error) {
        console.error("Error creating demo account:", error);
        return NextResponse.json(
            { error: "Failed to create demo account", details: String(error) },
            { status: 500 }
        );
    }
}

// GET method to check if demo account exists
export async function GET() {
    try {
        const existingUser = await db
            .select({ id: user.id, email: user.email })
            .from(user)
            .where(eq(user.email, DEMO_EMAIL))
            .limit(1);

        return NextResponse.json({
            exists: existingUser.length > 0,
            email: DEMO_EMAIL
        });
    } catch (error) {
        return NextResponse.json({ exists: false }, { status: 500 });
    }
}
