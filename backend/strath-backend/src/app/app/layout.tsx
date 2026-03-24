import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { AppSidebar } from "@/components/web/app-sidebar";
import { MobileNav } from "@/components/web/mobile-nav";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { getProfileAccessState } from "@/lib/services/profile-access";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  
  if (!session?.user) {
    redirect("/login");
  }

  const accessState = await getProfileAccessState(session.user.id);
  const profile = accessState.profile;

  if (!accessState.hasCompletedProfile) {
    redirect("/onboarding");
  }

  if (!accessState.hasVerifiedFace) {
    redirect("/verification");
  }

  return (
    <SidebarProvider>
      {/* Desktop sidebar - hidden on mobile */}
      <div className="hidden md:block">
        <AppSidebar user={session.user} profile={profile} />
      </div>
      
      <SidebarInset className="bg-[#0f0d23]">
        {/* Main content with bottom padding on mobile for nav */}
        <div className="pb-20 md:pb-0">
          {children}
        </div>
        
        {/* Mobile bottom navigation */}
        <MobileNav />
      </SidebarInset>
    </SidebarProvider>
  );
}
