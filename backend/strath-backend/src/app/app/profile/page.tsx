import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { profiles } from "@/db/schema";
import { eq } from "drizzle-orm";
import { ProfileView } from "@/components/web/profile/profile-view";

async function getProfile(userId: string) {
  return db.query.profiles.findFirst({
    where: eq(profiles.userId, userId),
  });
}

export default async function ProfilePage() {
  const session = await auth.api.getSession({ headers: await headers() });
  
  if (!session?.user) {
    redirect("/login");
  }

  const profile = await getProfile(session.user.id);
  
  if (!profile) {
    redirect("/onboarding");
  }

  return <ProfileView user={session.user} profile={profile} isOwnProfile />;
}
