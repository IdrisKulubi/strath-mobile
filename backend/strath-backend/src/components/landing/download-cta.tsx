"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";

export function DownloadCTA() {
  return (
    <section className="relative py-20 md:py-32 px-4 overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-pink-500/10 to-pink-500/5" />
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-gradient-to-t from-pink-500/20 via-rose-500/10 to-transparent rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 max-w-3xl mx-auto text-center">
        {/* Emoji */}
        <div className="text-6xl mb-6">💕</div>

        {/* Headline */}
        <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-6">
          Ready to Find{" "}
          <span className="bg-gradient-to-r from-pink-400 to-rose-400 bg-clip-text text-transparent">
            Your Match
          </span>
          ?
        </h2>

        <p className="text-lg text-gray-400 mb-10 max-w-xl mx-auto">
          Join thousands of students already connecting on campus.
          Your next chapter starts with a single swipe.
        </p>

        {/* CTA Button */}
        <Link
          href="/register"
          className="group inline-flex items-center justify-center gap-2 px-10 py-5 bg-gradient-to-r from-pink-500 via-rose-500 to-pink-500 hover:from-pink-600 hover:via-rose-600 hover:to-pink-600 text-white font-semibold text-lg rounded-2xl shadow-xl shadow-pink-500/25 hover:shadow-pink-500/40 transition-all duration-300"
        >
          <span>Start Matching Now</span>
          <ArrowRight
            size={20}
            className="group-hover:translate-x-1 transition-transform"
          />
        </Link>

        {/* App store buttons */}
        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
          <a
            href="#"
            className="group flex items-center gap-3 px-6 py-3 bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl hover:bg-white/10 hover:border-white/20 transition-all relative"
          >
            {/* Coming Soon Badge */}
            <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-2.5 py-1 bg-gradient-to-r from-pink-500 to-rose-500 text-[10px] font-bold rounded-full shadow-lg shadow-pink-500/30 whitespace-nowrap">
              COMING SOON
            </div>
            <svg className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor">
              <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
            </svg>
            <div className="text-left">
              <p className="text-xs text-gray-400">Coming soon on</p>
              <p className="text-sm font-semibold text-white">App Store</p>
            </div>
          </a>

          <a
            href="#"
            className="group flex items-center gap-3 px-6 py-3 bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl hover:bg-white/10 hover:border-white/20 transition-all relative"
          >
            {/* Coming Soon Badge */}
            <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-2.5 py-1 bg-gradient-to-r from-pink-500 to-rose-500 text-[10px] font-bold rounded-full shadow-lg shadow-pink-500/30 whitespace-nowrap">
              COMING SOON
            </div>
            <svg className="w-7 h-7" viewBox="0 0 24 24" fill="currentColor">
              <path d="M3,20.5V3.5C3,2.91 3.34,2.39 3.84,2.15L13.69,12L3.84,21.85C3.34,21.6 3,21.09 3,20.5M16.81,15.12L6.05,21.34L14.54,12.85L16.81,15.12M20.16,10.81C20.5,11.08 20.75,11.5 20.75,12C20.75,12.5 20.53,12.9 20.18,13.18L17.89,14.5L15.39,12L17.89,9.5L20.16,10.81M6.05,2.66L16.81,8.88L14.54,11.15L6.05,2.66Z" />
            </svg>
            <div className="text-left">
              <p className="text-xs text-gray-400">Coming soon on</p>
              <p className="text-sm font-semibold text-white">Google Play</p>
            </div>
          </a>
        </div>

        {/* Trust text */}
        <p className="mt-8 text-sm text-gray-500">
          Free to download • No credit card required
        </p>

       
      </div>
    </section>
  );
}
