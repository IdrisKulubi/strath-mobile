"use client";

import {
  ValentineBanner,
  FloatingHearts,
  HeroSection,
  FeaturesSection,
  HowItWorks,
  StatsSection,
  DownloadCTA,
  Footer,
} from "@/components/landing";

export default function Home() {
  return (
    <div className="min-h-screen bg-[#0f0d23] text-white overflow-x-hidden">
      {/* Valentine's Banner - Remove after Feb 14 */}
      <ValentineBanner />

      {/* Floating 3D hearts background */}
      <FloatingHearts />

      {/* Main content */}
      <main className="relative z-10">
        <HeroSection />
        <StatsSection />
        <FeaturesSection />
        <HowItWorks />
        <DownloadCTA />
      </main>

      <Footer />

      {/* Global animations */}
      <style jsx global>{`
        @keyframes float-3d {
          0%, 100% {
            transform: translateY(0) translateZ(0) rotateX(0deg);
            opacity: 0.6;
          }
          25% {
            transform: translateY(-15px) translateZ(20px) rotateX(10deg);
          }
          50% {
            transform: translateY(-25px) translateZ(40px) rotateX(0deg);
            opacity: 1;
          }
          75% {
            transform: translateY(-15px) translateZ(20px) rotateX(-10deg);
          }
        }
        
        @keyframes float-slow {
          0%, 100% {
            transform: translateY(0);
            opacity: 0.3;
          }
          50% {
            transform: translateY(-10px);
            opacity: 0.6;
          }
        }
        
        @keyframes fade-in-up {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .animate-fade-in-up {
          animation: fade-in-up 0.8s ease-out forwards;
          opacity: 0;
        }
        
        .animate-float-slow {
          animation: float-slow 4s ease-in-out infinite;
        }
        
        /* Smooth scroll */
        html {
          scroll-behavior: smooth;
        }
        
        /* Custom scrollbar */
        ::-webkit-scrollbar {
          width: 8px;
        }
        ::-webkit-scrollbar-track {
          background: #0f0d23;
        }
        ::-webkit-scrollbar-thumb {
          background: linear-gradient(to bottom, #ec4899, #f43f5e);
          border-radius: 4px;
        }
        ::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(to bottom, #db2777, #e11d48);
        }
      `}</style>
    </div>
  );
}
