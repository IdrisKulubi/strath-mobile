import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { VerificationFlow } from "@/components/web/verification/verification-flow";
import { getProfileAccessState } from "@/lib/services/profile-access";

type VerificationStatus =
  | "not_started"
  | "pending_capture"
  | "processing"
  | "verified"
  | "retry_required"
  | "manual_review"
  | "failed"
  | "blocked";

export default async function VerificationPage() {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session?.user) {
    redirect("/login");
  }

  const accessState = await getProfileAccessState(session.user.id);
  const profile = accessState.profile;

  if (!profile) {
    redirect("/onboarding");
  }

  if (!accessState.hasCompletedProfile) {
    redirect("/onboarding");
  }

  if (accessState.hasVerifiedFace) {
    redirect("/app/discover");
  }

  return (
    <VerificationFlow
      profilePhotos={(profile.photos ?? []).filter((photo): photo is string => !!photo)}
      initialStatus={(profile.faceVerificationStatus as VerificationStatus) ?? "not_started"}
    />
  );
}
