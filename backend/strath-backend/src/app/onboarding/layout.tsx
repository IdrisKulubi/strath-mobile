import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Complete Your Profile - Strathspace",
  description: "Set up your Strathspace profile to start matching",
};

export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#0f0d23] relative overflow-hidden">
      {/* Animated gradient background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-to-br from-pink-500/10 via-purple-500/5 to-transparent rounded-full blur-3xl" />
        <div className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-gradient-to-tl from-blue-500/10 via-cyan-500/5 to-transparent rounded-full blur-3xl" />
      </div>
      
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
}
