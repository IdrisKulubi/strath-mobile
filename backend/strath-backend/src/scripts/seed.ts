import { db } from "../lib/db";
import { users, profiles } from "../db/schema";
import { v4 as uuidv4 } from "uuid";

async function main() {
    console.log("Seeding database...");

    // Create some dummy users
    const dummyUsers = Array.from({ length: 10 }).map((_, i) => ({
        id: uuidv4(),
        name: `User ${i + 1}`,
        email: `user${i + 1}@example.com`,
        role: "user" as const,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastActive: new Date(),
    }));

    await db.insert(users).values(dummyUsers);

    // Create profiles for them
    const dummyProfiles = dummyUsers.map((user, i) => ({
        userId: user.id,
        firstName: `User`,
        lastName: `${i + 1}`,
        bio: `This is the bio for User ${i + 1}`,
        age: 20 + (i % 5),
        gender: i % 2 === 0 ? "male" : "female",
        university: "Strathmore University",
        interests: ["Coding", "Music", "Travel"],
        isVisible: true,
        profileCompleted: true,
        createdAt: new Date(),
        updatedAt: new Date(),
    }));

    await db.insert(profiles).values(dummyProfiles);

    console.log("Seeding complete!");
    process.exit(0);
}

main().catch((err) => {
    console.error("Seeding failed:", err);
    process.exit(1);
});
