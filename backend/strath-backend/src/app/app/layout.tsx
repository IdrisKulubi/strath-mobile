import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { profiles } from "@/db/schema";
import { eq } from "drizzle-orm";
import { AppSidebar } from "@/components/web/app-sidebar";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";

async function getProfile(userId: string) {
  return db.query.profiles.findFirst({
    where: eq(profiles.userId, userId),
  });
}

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  
  if (!session?.user) {
    redirect("/login");
  }

  // Check if user has completed onboarding
  const profile = await getProfile(session.user.id);
  if (!profile?.profileCompleted) {
    redirect("/onboarding");
  }

  return (
    <SidebarProvider>
      <AppSidebar user={session.user} profile={profile} />
      <SidebarInset className="bg-[#0f0d23]">
        {children}
      </SidebarInset>
    </SidebarProvider>
  );
}
