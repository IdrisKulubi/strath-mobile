import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { OnboardingFlow } from "@/components/web/onboarding/onboarding-flow";
import { getProfileAccessState } from "@/lib/services/profile-access";

export default async function OnboardingPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  
  if (!session?.user) {
    redirect("/login");
  }

  const accessState = await getProfileAccessState(session.user.id);
  const profile = accessState.profile;

  if (accessState.hasCompletedProfile) {
    if (accessState.hasVerifiedFace) {
      redirect("/app/discover");
    }

    redirect("/verification");
  }

  return <OnboardingFlow user={session.user} existingProfile={profile ?? null} />;
}
