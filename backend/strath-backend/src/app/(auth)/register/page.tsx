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

const CheckIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
);

export default function RegisterPage() {
  const [agreeToTerms, setAgreeToTerms] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleGoogleRegister = async () => {
    if (!agreeToTerms) {
      toast.error("Terms required", "Please agree to the terms to continue");
      return;
    }

    setIsLoading(true);

    try {
      await authClient.signIn.social({
        provider: "google",
        callbackURL: "/onboarding",
      });
    } catch {
      toast.error("Sign up failed", "Please try again");
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
            <div className="mx-auto w-20 h-20 rounded-3xl flex items-center justify-center mb-6 overflow-hidden">
            <img src="/logo.png" alt="Strathspace" className="w-full h-full object-cover" />
            </div>
          <h1 className="text-3xl font-bold text-white mb-2">strathspace</h1>
          <p className="text-gray-400 text-sm">Find your match on campus</p>
        </div>

        {/* Main Card */}
        <div className="bg-[#1a1a2e]/80 backdrop-blur-xl rounded-3xl border border-white/10 p-8 shadow-2xl">
          <div className="text-center mb-6">
            <h2 className="text-xl font-semibold text-white mb-1">Create account</h2>
            <p className="text-gray-400 text-sm">Join the campus community</p>
          </div>

          {/* Features list */}
          <div className="space-y-3 mb-6">
            <div className="flex items-center gap-3 text-sm text-gray-300">
              <div className="w-5 h-5 rounded-full bg-pink-500/20 flex items-center justify-center flex-shrink-0">
                <span className="text-pink-400 text-xs">✓</span>
              </div>
              <span>Verified university students only</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-gray-300">
              <div className="w-5 h-5 rounded-full bg-pink-500/20 flex items-center justify-center flex-shrink-0">
                <span className="text-pink-400 text-xs">✓</span>
              </div>
              <span>Safe & secure campus dating</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-gray-300">
              <div className="w-5 h-5 rounded-full bg-pink-500/20 flex items-center justify-center flex-shrink-0">
                <span className="text-pink-400 text-xs">✓</span>
              </div>
              <span>Match with students near you</span>
            </div>
          </div>

          {/* Terms checkbox */}
          <button
            onClick={() => setAgreeToTerms(!agreeToTerms)}
            className="w-full flex items-start gap-3 p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors mb-6 text-left"
          >
            <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-all ${
              agreeToTerms 
                ? "bg-pink-500 border-pink-500" 
                : "border-white/30 hover:border-white/50"
            }`}>
              {agreeToTerms && <CheckIcon />}
            </div>
            <span className="text-sm text-gray-300 leading-relaxed">
              I agree to the{" "}
              <Link href="/terms" className="text-pink-400 hover:text-pink-300 underline" onClick={(e) => e.stopPropagation()}>
                Terms of Service
              </Link>{" "}
              and{" "}
              <Link href="/privacy" className="text-pink-400 hover:text-pink-300 underline" onClick={(e) => e.stopPropagation()}>
                Privacy Policy
              </Link>
            </span>
          </button>

          {/* Google Sign Up Button */}
          <button
            onClick={handleGoogleRegister}
            disabled={isLoading || !agreeToTerms}
            className={`w-full flex items-center justify-center gap-3 font-medium h-12 rounded-xl transition-all shadow-lg active:scale-[0.98] ${
              agreeToTerms 
                ? "bg-white hover:bg-gray-50 active:bg-gray-100 text-gray-800 hover:shadow-xl" 
                : "bg-white/50 text-gray-500 cursor-not-allowed"
            }`}
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

          {/* Info text */}
          <p className="text-center text-gray-500 text-xs mt-4">
            Use your <span className="text-pink-400">@school.edu</span> email
          </p>
        </div>

        {/* Sign in link */}
        <p className="text-center mt-8 text-gray-400 text-sm">
          Already have an account?{" "}
          <Link href="/login" className="text-pink-400 hover:text-pink-300 font-medium">
            Sign in
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
