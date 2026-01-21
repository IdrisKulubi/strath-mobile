"use client";

import Image from "next/image";
import { useState, useEffect } from "react";

export default function Home() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="min-h-screen bg-[#0f0d23] text-white overflow-hidden relative">
      {/* Animated gradient background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-to-br from-pink-500/20 via-purple-500/10 to-transparent rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-gradient-to-tl from-blue-500/20 via-cyan-500/10 to-transparent rounded-full blur-3xl animate-pulse" style={{ animationDelay: "1s" }} />
        <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-gradient-to-br from-rose-500/30 to-pink-500/10 rounded-full blur-3xl" style={{ animation: "bounce-slow 8s infinite ease-in-out" }} />
      </div>

      {/* Floating particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {mounted && [...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute w-2 h-2 bg-white/20 rounded-full"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animation: `float ${5 + Math.random() * 10}s infinite ease-in-out`,
              animationDelay: `${Math.random() * 5}s`,
            }}
          />
        ))}
      </div>

      {/* Main content */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-6 py-12">
        {/* Logo */}
        <div className={`transition-all duration-1000 ${mounted ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-10"}`}>
          <div className="relative">
            <div className="w-24 h-24 md:w-32 md:h-32 bg-gradient-to-br from-pink-500 via-rose-500 to-purple-600 rounded-3xl flex items-center justify-center shadow-2xl" style={{ animation: "glow 2s infinite ease-in-out" }}>
                <Image
                src="/logo.png" 
                alt="Strathspace Logo" 
                className="w-16 h-16 md:w-20 md:h-20 object-contain"
                width={80}
                height={80}
                />
            </div>
            <div className="absolute -inset-1 bg-gradient-to-br from-pink-500 via-rose-500 to-purple-600 rounded-3xl blur-xl opacity-50 -z-10 animate-pulse" />
          </div>
        </div>

        {/* Brand name */}
        <h1 className={`mt-8 text-5xl md:text-7xl font-bold bg-gradient-to-r from-white via-pink-200 to-white bg-clip-text text-transparent transition-all duration-1000 ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"}`} style={{ transitionDelay: "200ms" }}>
          Strathspace
        </h1>

        {/* Tagline */}
        <p className={`mt-4 text-xl md:text-2xl text-gray-400 text-center max-w-md transition-all duration-1000 ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"}`} style={{ transitionDelay: "300ms" }}>
          Your Campus Community Hub
        </p>

        {/* Going mobile badge */}
        <div className={`mt-8 transition-all duration-1000 ${mounted ? "opacity-100 scale-100" : "opacity-0 scale-75"}`} style={{ transitionDelay: "400ms" }}>
          <div className="relative inline-flex items-center gap-2 px-6 py-3 bg-white/5 backdrop-blur-xl border border-white/10 rounded-full">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-pink-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-pink-500"></span>
            </span>
            <span className="text-sm font-medium text-gray-300">We&apos;re Going Mobile!</span>
          </div>
        </div>

        {/* Transition message */}
        <div className={`mt-6 max-w-lg text-center transition-all duration-1000 ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"}`} style={{ transitionDelay: "450ms" }}>
          <p className="text-gray-400 text-base md:text-lg leading-relaxed">
            We&apos;re leveling up! 🚀 The web version is taking a quick nap while we bring you an 
            <span className="text-pink-400 font-semibold"> even better mobile experience</span>. 
            Download the app soon on iOS & Android!
          </p>
        </div>

        {/* Phone mockup */}
        <div className={`mt-10 transition-all duration-1000 ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-20"}`} style={{ transitionDelay: "500ms" }}>
          <div className="relative">
            {/* Phone frame */}
            <div className="w-64 h-[500px] md:w-72 md:h-[560px] bg-gradient-to-b from-gray-800 to-gray-900 rounded-[3rem] p-3 shadow-2xl shadow-black/50">
              <div className="w-full h-full bg-gradient-to-b from-[#1a1a2e] to-[#0f0d23] rounded-[2.5rem] overflow-hidden relative">
                {/* Notch */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-7 bg-black rounded-b-2xl z-20" />
                
                {/* Screen content */}
                <div className="p-6 pt-12 h-full flex flex-col">
                  {/* Mini header */}
                  <div className="flex items-center justify-between mb-6">
                    <div className="w-10 h-10 bg-gradient-to-br from-pink-500 to-purple-600 rounded-xl flex items-center justify-center">
                      <span className="text-lg font-bold">S</span>
                    </div>
                    <div className="flex gap-2">
                      <div className="w-8 h-8 bg-white/10 rounded-full" />
                      <div className="w-8 h-8 bg-white/10 rounded-full" />
                    </div>
                  </div>

                  {/* Cards */}
                  <div className="space-y-3 flex-1">
                    <div className="h-32 bg-gradient-to-br from-pink-500/20 to-purple-500/20 rounded-2xl border border-white/10 p-4" style={{ animation: "pulse-slow 3s infinite ease-in-out" }}>
                      <div className="w-16 h-3 bg-white/30 rounded-full mb-2" />
                      <div className="w-24 h-2 bg-white/20 rounded-full" />
                    </div>
                    <div className="h-24 bg-white/5 rounded-2xl border border-white/10 p-4">
                      <div className="w-20 h-3 bg-white/20 rounded-full mb-2" />
                      <div className="w-32 h-2 bg-white/10 rounded-full" />
                    </div>
                    <div className="h-24 bg-white/5 rounded-2xl border border-white/10 p-4">
                      <div className="w-14 h-3 bg-white/20 rounded-full mb-2" />
                      <div className="w-28 h-2 bg-white/10 rounded-full" />
                    </div>
                  </div>

                  {/* Nav bar */}
                  <div className="flex justify-around py-4 border-t border-white/10 mt-4">
                    <div className="w-6 h-6 bg-pink-500 rounded-lg" />
                    <div className="w-6 h-6 bg-white/20 rounded-lg" />
                    <div className="w-6 h-6 bg-white/20 rounded-lg" />
                    <div className="w-6 h-6 bg-white/20 rounded-lg" />
                  </div>
                </div>
              </div>
            </div>

            {/* Glow effect */}
            <div className="absolute inset-0 bg-gradient-to-t from-pink-500/20 via-transparent to-purple-500/20 rounded-[3rem] blur-2xl -z-10" />
          </div>
        </div>

        {/* Features */}
        <div className={`mt-12 grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-8 text-center transition-all duration-1000 ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"}`} style={{ transitionDelay: "700ms" }}>
          {[
            { emoji: "🎓", label: "Campus Events" },
            { emoji: "💼", label: "Opportunities" },
            { emoji: "💬", label: "Connect" },
            { emoji: "🤝", label: "Network" },
          ].map((feature, i) => (
            <div key={i} className="flex flex-col items-center gap-2 p-4">
              <span className="text-3xl md:text-4xl">{feature.emoji}</span>
              <span className="text-sm text-gray-400">{feature.label}</span>
            </div>
          ))}
        </div>

        {/* App Store buttons placeholder */}
        <div className={`mt-10 flex flex-col sm:flex-row gap-4 transition-all duration-1000 ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"}`} style={{ transitionDelay: "800ms" }}>
          <div className="flex items-center gap-3 px-6 py-3 bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl">
            <svg className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor">
              <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
            </svg>
            <div className="text-left">
              <p className="text-xs text-gray-400">Coming soon on</p>
              <p className="text-sm font-semibold">App Store</p>
            </div>
          </div>
          <div className="flex items-center gap-3 px-6 py-3 bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl">
            <svg className="w-7 h-7" viewBox="0 0 24 24" fill="currentColor">
              <path d="M3,20.5V3.5C3,2.91 3.34,2.39 3.84,2.15L13.69,12L3.84,21.85C3.34,21.6 3,21.09 3,20.5M16.81,15.12L6.05,21.34L14.54,12.85L16.81,15.12M20.16,10.81C20.5,11.08 20.75,11.5 20.75,12C20.75,12.5 20.53,12.9 20.18,13.18L17.89,14.5L15.39,12L17.89,9.5L20.16,10.81M6.05,2.66L16.81,8.88L14.54,11.15L6.05,2.66Z"/>
            </svg>
            <div className="text-left">
              <p className="text-xs text-gray-400">Coming soon on</p>
              <p className="text-sm font-semibold">Google Play</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className={`mt-12 text-center text-gray-500 text-sm transition-all duration-1000 ${mounted ? "opacity-100" : "opacity-0"}`} style={{ transitionDelay: "900ms" }}>
          <p className="text-gray-400 mb-2">Same vibes, better experience ✨</p>
          <p>Built for Strathmore University Students 🇰🇪</p>
          <p className="mt-2">© 2026 Strathspace. All rights reserved.</p>
        </div>
      </div>

      {/* Custom animations */}
      <style jsx global>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); opacity: 0.5; }
          50% { transform: translateY(-20px) rotate(180deg); opacity: 1; }
        }
        @keyframes glow {
          0%, 100% { box-shadow: 0 0 30px rgba(236, 72, 153, 0.3), 0 25px 50px -12px rgba(0, 0, 0, 0.25); }
          50% { box-shadow: 0 0 60px rgba(236, 72, 153, 0.6), 0 25px 50px -12px rgba(0, 0, 0, 0.25); }
        }
        @keyframes bounce-slow {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-30px); }
        }
        @keyframes pulse-slow {
          0%, 100% { opacity: 0.5; }
          50% { opacity: 0.8; }
        }
      `}</style>
    </div>
  );
}
