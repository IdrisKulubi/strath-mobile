"use client";

import { useState } from "react";
import Link from "next/link";
import { authClient } from "@/lib/auth-client";
import { toast } from "@/components/ui/custom-toast";
import { FloatingHearts } from "@/components/web/auth/floating-hearts";

// Icons
const HeartIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="currentColor" className="text-white">
    <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>
  </svg>
);

const GoogleIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24">
    <path
      fill="#4285F4"
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
    />
    <path
      fill="#34A853"
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
    />
    <path
      fill="#FBBC05"
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
    />
    <path
      fill="#EA4335"
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
    />
  </svg>
);

const LoaderIcon = () => (
  <svg className="animate-spin h-5 w-5 text-gray-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
  </svg>
);

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false);

  const handleGoogleLogin = async () => {
    setIsLoading(true);

    try {
      await authClient.signIn.social({
        provider: "google",
        callbackURL: "/onboarding",
      });
    } catch {
      toast.error("Sign in failed", "Please try again");
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-12 bg-[#0f0d23]">
      {/* Valentine themed floating hearts background */}
      <FloatingHearts />

      <div className="relative z-10 w-full max-w-sm">
        {/* Logo & Branding */}
        <div className="text-center mb-10">
            <div className="mx-auto w-20 h-20 rounded-3xl flex items-center justify-center shadow-2xl shadow-pink-500/30 mb-6 overflow-hidden">
            <img src="/logo.png" alt="Strathspace" className="w-full h-full object-cover" />
            </div>
          <h1 className="text-3xl font-bold text-white mb-2">strathspace</h1>
          <p className="text-gray-400 text-sm">Connect with students on campus</p>
        </div>

        {/* Main Card */}
        <div className="bg-[#1a1a2e]/80 backdrop-blur-xl rounded-3xl border border-white/10 p-8 shadow-2xl">
          <div className="text-center mb-8">
            <h2 className="text-xl font-semibold text-white mb-1">Welcome back</h2>
            <p className="text-gray-400 text-sm">Sign in to continue</p>
          </div>

          {/* Google Sign In Button */}
          <button
            onClick={handleGoogleLogin}
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-3 bg-white hover:bg-gray-50 active:bg-gray-100 text-gray-800 font-medium h-12 rounded-xl transition-all disabled:opacity-70 disabled:cursor-not-allowed shadow-lg hover:shadow-xl active:scale-[0.98]"
          >
            {isLoading ? (
              <LoaderIcon />
            ) : (
              <>
                <GoogleIcon />
                <span>Continue with Google</span>
              </>
            )}
          </button>

          {/* Divider */}
          <div className="my-6 flex items-center gap-3">
            <div className="flex-1 h-px bg-white/10" />
            <span className="text-xs text-gray-500">University email required</span>
            <div className="flex-1 h-px bg-white/10" />
          </div>

          {/* Info text */}
          <p className="text-center text-gray-400 text-xs leading-relaxed">
            Sign in with your <span className="text-pink-400">@school.edu</span> Google account to access Strathspace
          </p>
        </div>

        {/* Sign up link */}
        <p className="text-center mt-8 text-gray-400 text-sm">
          New to Strathspace?{" "}
          <Link href="/register" className="text-pink-400 hover:text-pink-300 font-medium">
            Create account
          </Link>
        </p>

        {/* Footer links */}
        <div className="flex items-center justify-center gap-4 mt-6">
          <Link href="/terms" className="text-xs text-gray-500 hover:text-gray-400">
            Terms
          </Link>
          <span className="text-gray-700">•</span>
          <Link href="/privacy" className="text-xs text-gray-500 hover:text-gray-400">
            Privacy
          </Link>
          <span className="text-gray-700">•</span>
          <Link href="/support" className="text-xs text-gray-500 hover:text-gray-400">
            Help
          </Link>
        </div>
      </div>
    </div>
  );
}
