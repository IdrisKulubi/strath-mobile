import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { profiles } from "@/db/schema";
import { eq } from "drizzle-orm";
import { OnboardingFlow } from "@/components/web/onboarding/onboarding-flow";

async function getProfile(userId: string) {
  return db.query.profiles.findFirst({
    where: eq(profiles.userId, userId),
  });
}

export default async function OnboardingPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  
  if (!session?.user) {
    redirect("/login");
  }

  // Check if already completed onboarding
  const profile = await getProfile(session.user.id);
  if (profile?.profileCompleted) {
    redirect("/app/discover");
  }

  return <OnboardingFlow user={session.user} existingProfile={profile ?? null} />;
}
