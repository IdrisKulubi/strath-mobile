import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { user, account, profiles, matches, messages, swipes, blocks, reports, profileViews, session, starredProfiles } from "@/db/schema";
import { eq, or, inArray } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { randomUUID } from "crypto";

// Demo account credentials
const DEMO_EMAIL = "demo@strathspace.com";
const DEMO_PASSWORD = "AppleReview2026!";

// Demo match users (pre-created fake users for demo experience)
const DEMO_MATCHES = [
    {
        id: "demo-match-user-1",
        name: "Sarah Johnson",
        email: "sarah.demo@strathspace.com",
        bio: "Computer Science student passionate about AI and coffee ☕",
        course: "Computer Science",
        yearOfStudy: 2,
        interests: ["AI", "Coffee", "Music", "Hiking"],
        photo: "https://api.dicebear.com/7.x/avataaars/png?seed=sarah",
    },
    {
        id: "demo-match-user-2", 
        name: "Michael Chen",
        email: "michael.demo@strathspace.com",
        bio: "Business student and aspiring entrepreneur 🚀",
        course: "Business Administration",
        yearOfStudy: 3,
        interests: ["Startups", "Finance", "Basketball", "Travel"],
        photo: "https://api.dicebear.com/7.x/avataaars/png?seed=michael",
    },
    {
        id: "demo-match-user-3",
        name: "Emma Williams",
        email: "emma.demo@strathspace.com",
        bio: "Design student who loves creating beautiful things ✨",
        course: "Graphic Design",
        yearOfStudy: 4,
        interests: ["Design", "Art", "Photography", "Yoga"],
        photo: "https://api.dicebear.com/7.x/avataaars/png?seed=emma",
    },
];

export async function POST(request: NextRequest) {
    try {
        // Collect all demo user IDs (main demo user + demo match users)
        const allDemoEmails = [DEMO_EMAIL, ...DEMO_MATCHES.map(m => m.email)];
        const allDemoUserIds: string[] = [];

        // Find all existing demo users
        for (const email of allDemoEmails) {
            const existing = await db.select({ id: user.id }).from(user).where(eq(user.email, email)).limit(1);
            if (existing.length > 0) {
                allDemoUserIds.push(existing[0].id);
            }
        }

        // Also add the hardcoded demo match IDs in case they exist with different emails
        for (const matchUser of DEMO_MATCHES) {
            if (!allDemoUserIds.includes(matchUser.id)) {
                const existing = await db.select({ id: user.id }).from(user).where(eq(user.id, matchUser.id)).limit(1);
                if (existing.length > 0) {
                    allDemoUserIds.push(matchUser.id);
                }
            }
        }

        let demoUserId: string;

        // If any demo users exist, clean them up completely
        if (allDemoUserIds.length > 0) {
            console.log("Cleaning up existing demo users:", allDemoUserIds);

            // Get all match IDs involving demo users to delete their messages
            const demoMatches = await db.select({ id: matches.id }).from(matches).where(
                or(
                    inArray(matches.user1Id, allDemoUserIds),
                    inArray(matches.user2Id, allDemoUserIds)
                )
            );
            const matchIds = demoMatches.map(m => m.id);

            // Delete in correct order to respect foreign key constraints
            // 1. Messages (references matches and users)
            if (matchIds.length > 0) {
                await db.delete(messages).where(inArray(messages.matchId, matchIds));
            }

            // 2. Matches (references users)
            await db.delete(matches).where(
                or(
                    inArray(matches.user1Id, allDemoUserIds),
                    inArray(matches.user2Id, allDemoUserIds)
                )
            );

            // 3. Swipes (references users)
            await db.delete(swipes).where(
                or(
                    inArray(swipes.swiperId, allDemoUserIds),
                    inArray(swipes.swipedId, allDemoUserIds)
                )
            );

            // 4. Blocks (references users)
            await db.delete(blocks).where(
                or(
                    inArray(blocks.blockerId, allDemoUserIds),
                    inArray(blocks.blockedId, allDemoUserIds)
                )
            );

            // 5. Reports (references users)
            await db.delete(reports).where(
                or(
                    inArray(reports.reporterId, allDemoUserIds),
                    inArray(reports.reportedUserId, allDemoUserIds)
                )
            );

            // 6. Profile views (references users)
            await db.delete(profileViews).where(
                or(
                    inArray(profileViews.viewerId, allDemoUserIds),
                    inArray(profileViews.viewedId, allDemoUserIds)
                )
            );

            // 7. Starred profiles (has cascade but delete explicitly to be safe)
            await db.delete(starredProfiles).where(
                or(
                    inArray(starredProfiles.userId, allDemoUserIds),
                    inArray(starredProfiles.starredId, allDemoUserIds)
                )
            );

            // 8. Sessions (has cascade but delete explicitly to be safe)
            await db.delete(session).where(inArray(session.userId, allDemoUserIds));

            // 8. Profiles (has cascade but delete explicitly)
            await db.delete(profiles).where(inArray(profiles.userId, allDemoUserIds));

            // 9. Accounts (has cascade but delete explicitly)
            await db.delete(account).where(inArray(account.userId, allDemoUserIds));

            // 10. Finally delete the users
            await db.delete(user).where(inArray(user.id, allDemoUserIds));

            console.log("Successfully deleted all demo users and related data");
        }

        // Use Better Auth's signUpEmail API to create the user properly
        // This ensures the password is hashed correctly with Better Auth's algorithm
        const signUpResult = await auth.api.signUpEmail({
            body: {
                email: DEMO_EMAIL,
                password: DEMO_PASSWORD,
                name: "Demo User",
            }
        });

        if (!signUpResult?.user) {
            throw new Error("Failed to create user via Better Auth");
        }

        demoUserId = signUpResult.user.id;

        // Update the user with additional fields
        await db.update(user)
            .set({
                emailVerified: true,
                role: "user",
                image: "https://api.dicebear.com/7.x/avataaars/png?seed=demo",
                profilePhoto: "https://api.dicebear.com/7.x/avataaars/png?seed=demo",
                lastActive: new Date(),
                isOnline: false,
            })
            .where(eq(user.id, demoUserId));

        // Create demo profile
        await db.insert(profiles).values({
            userId: demoUserId,
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

        // Create demo match users with profiles
        for (const matchData of DEMO_MATCHES) {
            // Create user
            await db.insert(user).values({
                id: matchData.id,
                email: matchData.email,
                name: matchData.name,
                emailVerified: true,
                role: "user",
                image: matchData.photo,
                profilePhoto: matchData.photo,
                lastActive: new Date(Date.now() - Math.random() * 3600000), // Random time in last hour
                isOnline: Math.random() > 0.5, // Randomly online
                createdAt: new Date(),
                updatedAt: new Date(),
            });

            // Create profile
            await db.insert(profiles).values({
                userId: matchData.id,
                bio: matchData.bio,
                course: matchData.course,
                yearOfStudy: matchData.yearOfStudy,
                interests: matchData.interests,
                photos: [matchData.photo],
                isComplete: true,
                profileCompleted: true,
                firstName: matchData.name.split(' ')[0],
                lastName: matchData.name.split(' ')[1] || '',
                createdAt: new Date(),
                updatedAt: new Date(),
            });

            // Create mutual match
            const matchId = randomUUID();
            await db.insert(matches).values({
                id: matchId,
                user1Id: demoUserId,
                user2Id: matchData.id,
                user1Opened: true,
                user2Opened: true,
                lastMessageAt: new Date(Date.now() - Math.random() * 1800000), // Random in last 30 min
                createdAt: new Date(Date.now() - 86400000), // 1 day ago
                updatedAt: new Date(),
            });

            // Add sample messages to conversation
            const messageTemplates = [
                { from: 'match', text: `Hey! Nice to match with you! 👋`, hoursAgo: 3 },
                { from: 'demo', text: `Hi! Great to meet you too! What are you studying?`, hoursAgo: 2.5 },
                { from: 'match', text: `I'm studying ${matchData.course}. How about you?`, hoursAgo: 2 },
                { from: 'demo', text: `That's cool! I'm in Computer Science. What got you interested in ${matchData.interests[0]}?`, hoursAgo: 1.5 },
                { from: 'match', text: `I've been into it since high school! We should grab coffee sometime ☕`, hoursAgo: 0.5 },
            ];

            for (const msg of messageTemplates) {
                await db.insert(messages).values({
                    id: randomUUID(),
                    matchId: matchId,
                    senderId: msg.from === 'demo' ? demoUserId : matchData.id,
                    content: msg.text,
                    status: msg.hoursAgo > 1 ? 'read' : 'delivered',
                    createdAt: new Date(Date.now() - msg.hoursAgo * 3600000),
                    updatedAt: new Date(Date.now() - msg.hoursAgo * 3600000),
                });
            }
        }

        return NextResponse.json({
            success: true,
            message: "Demo account created with pre-populated matches and conversations",
            credentials: {
                email: DEMO_EMAIL,
                password: DEMO_PASSWORD
            },
            features: {
                matches: DEMO_MATCHES.length,
                messagesPerMatch: 5,
                note: "Demo account has 3 matches with active conversations"
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
            email: DEMO_EMAIL,
            password: DEMO_PASSWORD,
            note: "Use these credentials in App Store Connect Review Information"
        });
    } catch (error) {
        return NextResponse.json({ exists: false }, { status: 500 });
    }
}
