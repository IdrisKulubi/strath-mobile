import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { user, account, profiles, matches, messages, swipes, blocks, reports, profileViews, session, starredProfiles, campusEvents, eventRsvps } from "@/db/schema";
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

// Demo events for Apple reviewers to see app functionality
const DEMO_EVENTS = [
    {
        id: "demo-event-1",
        title: "Tech Talk: AI & Machine Learning",
        description: "Join us for an exciting evening exploring the latest trends in AI and Machine Learning. Guest speakers from leading tech companies will share insights on career opportunities and emerging technologies. Free pizza and networking afterwards! 🍕",
        category: "academic" as const,
        coverImage: "https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=800&h=400&fit=crop",
        university: "Strathmore University",
        location: "Auditorium B, Main Campus",
        isVirtual: false,
        organizerName: "Computer Science Club",
        maxAttendees: 150,
        hoursFromNow: 48, // Event in 2 days
    },
    {
        id: "demo-event-2",
        title: "Campus Music Night 🎵",
        description: "An evening of live performances by talented student musicians! Come support your fellow students as they showcase their musical talents. Open mic session at the end - bring your instrument!",
        category: "arts" as const,
        coverImage: "https://images.unsplash.com/photo-1514320291840-2e0a9bf2a9ae?w=800&h=400&fit=crop",
        university: "Strathmore University",
        location: "Student Center Courtyard",
        isVirtual: false,
        organizerName: "Music Society",
        maxAttendees: 200,
        hoursFromNow: 72, // Event in 3 days
    },
    {
        id: "demo-event-3",
        title: "Career Fair 2026",
        description: "Connect with top employers looking to hire Strathmore graduates! Over 50 companies will be present including Google, Microsoft, Safaricom, and more. Bring your CV and dress professionally. 💼",
        category: "career" as const,
        coverImage: "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&h=400&fit=crop",
        university: "Strathmore University",
        location: "Sports Complex",
        isVirtual: false,
        organizerName: "Career Services",
        maxAttendees: 500,
        hoursFromNow: 120, // Event in 5 days
    },
    {
        id: "demo-event-4",
        title: "Basketball Tournament Finals 🏀",
        description: "The moment we've all been waiting for! Watch the championship game between Business School and Engineering. Come cheer for your faculty! Refreshments will be provided.",
        category: "sports" as const,
        coverImage: "https://images.unsplash.com/photo-1546519638-68e109498ffc?w=800&h=400&fit=crop",
        university: "Strathmore University",
        location: "Indoor Sports Arena",
        isVirtual: false,
        organizerName: "Sports Department",
        maxAttendees: 300,
        hoursFromNow: 24, // Event tomorrow
    },
    {
        id: "demo-event-5",
        title: "Game Night: Board Games & Chill",
        description: "Take a break from studying! Join us for a relaxing evening of board games, card games, and video games. We have Monopoly, Uno, FIFA, and more. Bring your friends! 🎮",
        category: "social" as const,
        coverImage: "https://images.unsplash.com/photo-1611371805429-8b5c1b2c34ba?w=800&h=400&fit=crop",
        university: "Strathmore University",
        location: "Common Room, Residence Hall",
        isVirtual: false,
        organizerName: "Social Committee",
        maxAttendees: 50,
        hoursFromNow: 6, // Event tonight
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

            // 7.5. Event RSVPs (delete before events)
            const demoEventIds = DEMO_EVENTS.map(e => e.id);
            await db.delete(eventRsvps).where(inArray(eventRsvps.eventId, demoEventIds));
            
            // 7.6. Campus Events created by demo users
            await db.delete(campusEvents).where(inArray(campusEvents.id, demoEventIds));

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

        // Create demo campus events
        console.log("Creating demo campus events...");
        for (const eventData of DEMO_EVENTS) {
            const startTime = new Date(Date.now() + eventData.hoursFromNow * 3600000);
            const endTime = new Date(startTime.getTime() + 2 * 3600000); // 2 hours duration
            
            await db.insert(campusEvents).values({
                id: eventData.id,
                title: eventData.title,
                description: eventData.description,
                category: eventData.category,
                coverImage: eventData.coverImage,
                university: eventData.university,
                location: eventData.location,
                isVirtual: eventData.isVirtual,
                virtualLink: null, // Explicitly set to null for non-virtual events
                organizerName: eventData.organizerName,
                maxAttendees: eventData.maxAttendees,
                startTime: startTime,
                endTime: endTime,
                creatorId: demoUserId,
                isPublic: true,
                createdAt: new Date(),
                updatedAt: new Date(),
            });

            // Add some RSVPs from demo match users to make it look active
            const rsvpCount = Math.floor(Math.random() * 3) + 1; // 1-3 RSVPs
            for (let i = 0; i < rsvpCount && i < DEMO_MATCHES.length; i++) {
                await db.insert(eventRsvps).values({
                    eventId: eventData.id,
                    userId: DEMO_MATCHES[i].id,
                    status: Math.random() > 0.3 ? "going" : "interested",
                    createdAt: new Date(Date.now() - Math.random() * 86400000), // Random in last day
                });
            }
        }
        console.log(`Created ${DEMO_EVENTS.length} demo events with RSVPs`);

        return NextResponse.json({
            success: true,
            message: "Demo account created with pre-populated matches, conversations, and events",
            credentials: {
                email: DEMO_EMAIL,
                password: DEMO_PASSWORD
            },
            features: {
                matches: DEMO_MATCHES.length,
                messagesPerMatch: 5,
                events: DEMO_EVENTS.length,
                note: "Demo account has 3 matches with active conversations and 5 upcoming campus events"
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
