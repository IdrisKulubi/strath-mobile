"use client";

import { useState, useEffect, useCallback } from "react";
import { AnimatePresence } from "framer-motion";
import { SwipeCard } from "@/components/web/discover/swipe-card";
import { MatchModal } from "@/components/web/discover/match-modal";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/custom-toast";

interface Profile {
  id: string;
  userId: string;
  firstName: string;
  lastName?: string;
  age: number;
  bio?: string;
  profilePhoto?: string;
  photos: string[];
  course?: string;
  yearOfStudy?: string;
  interests: string[];
  university?: string;
}

interface Match {
  matchId: string;
  profile: Profile;
}

interface CurrentUser {
  id: string;
  name?: string;
  image?: string;
  profile?: {
    profilePhoto?: string;
    photos?: string[];
  };
}

// Icons
const XIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
  </svg>
);

const HeartIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
    <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>
  </svg>
);

const UndoIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 7v6h6"/><path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"/>
  </svg>
);

export default function DiscoverPage() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [matchedProfile, setMatchedProfile] = useState<Match | null>(null);
  const [swipeDirection, setSwipeDirection] = useState<"left" | "right" | null>(null);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);

  useEffect(() => {
    fetchProfiles();
    fetchCurrentUser();
  }, []);

  const fetchCurrentUser = async () => {
    try {
      const response = await fetch("/api/user/me");
      const data = await response.json();
      if (data.success) {
        setCurrentUser(data.data);
      }
    } catch (error) {
      console.error("Failed to fetch current user:", error);
    }
  };

  const fetchProfiles = async () => {
    try {
      const response = await fetch("/api/discover");
      const data = await response.json();
      if (data.success) {
        setProfiles(data.data?.profiles || []);
      }
    } catch (error) {
      console.error("Failed to fetch profiles:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSwipe = useCallback(async (direction: "left" | "right") => {
    if (currentIndex >= profiles.length) return;

    const currentProfile = profiles[currentIndex];
    setSwipeDirection(direction);

    try {
      const response = await fetch("/api/swipe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetUserId: currentProfile.userId,
          action: direction === "right" ? "like" : "pass",
        }),
      });

      const data = await response.json();
      
      if (data.success && data.data?.isMatch) {
        // Show match modal and toast
        toast.match(currentProfile.firstName);
        setMatchedProfile({
          matchId: data.data.match?.id,
          profile: currentProfile,
        });
      }
    } catch (error) {
      console.error("Swipe error:", error);
      toast.error("Swipe failed", "Please try again");
    }

    // Move to next profile after animation
    setTimeout(() => {
      setCurrentIndex((prev) => prev + 1);
      setSwipeDirection(null);
    }, 300);
  }, [currentIndex, profiles]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === "ArrowLeft") {
      handleSwipe("left");
    } else if (e.key === "ArrowRight") {
      handleSwipe("right");
    }
  }, [handleSwipe]);

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  const currentProfile = profiles[currentIndex];
  const nextProfile = profiles[currentIndex + 1];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen px-4">
        <div className="w-full max-w-md space-y-4">
          <Skeleton className="h-[70vh] md:h-[600px] w-full rounded-3xl bg-white/5" />
        </div>
      </div>
    );
  }

  if (!currentProfile) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen text-center p-6">
        <div className="w-24 h-24 bg-linear-to-br from-pink-500/20 to-rose-500/20 rounded-full flex items-center justify-center mb-6">
          <HeartIcon />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">No more profiles</h2>
        <p className="text-gray-400 mb-6 max-w-sm">
          You&apos;ve seen everyone! Check back later for new people.
        </p>
        <Button 
          onClick={() => {
            setCurrentIndex(0);
            fetchProfiles();
          }}
          className="bg-linear-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600"
        >
          Refresh
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-5rem)] md:h-auto md:min-h-[calc(100vh-4rem)] px-3 pt-2 md:p-6 md:items-center md:justify-center">
      {/* Logo Header - visible on mobile, Tinder-style */}
      <div className="w-full max-w-[400px] mx-auto mb-2 md:hidden">
        <h1 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-rose-500">
          strathspace
        </h1>
      </div>

      {/* Card Stack - takes remaining space on mobile, fixed height on desktop */}
      <div className="relative w-full max-w-[400px] mx-auto flex-1 min-h-0 md:flex-none md:h-[550px]">
        {/* Next card (behind) */}
        {nextProfile && (
          <div className="absolute inset-0 scale-[0.96] opacity-60 -translate-y-2">
            <SwipeCard profile={nextProfile} />
          </div>
        )}

        {/* Current card */}
        <AnimatePresence mode="wait">
          <SwipeCard
            key={currentProfile.userId}
            profile={currentProfile}
            onSwipe={handleSwipe}
            swipeDirection={swipeDirection}
          />
        </AnimatePresence>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-center gap-4 md:gap-5 py-3 md:mt-6">
        {/* Pass Button */}
        <Button
          variant="outline"
          size="icon"
          className="w-14 h-14 md:w-16 md:h-16 rounded-full border-2 border-red-500/60 bg-white/5 hover:bg-red-500/10 active:bg-red-500/20 text-red-500 transition-all active:scale-90 shadow-lg hover:shadow-red-500/20"
          onClick={() => handleSwipe("left")}
        >
          <XIcon />
        </Button>

        {/* Undo Button */}
        <Button
          variant="outline"
          size="icon"
          className="w-10 h-10 md:w-12 md:h-12 rounded-full border-2 border-amber-500/60 bg-white/5 hover:bg-amber-500/10 active:bg-amber-500/20 text-amber-500 transition-all active:scale-90 shadow-lg disabled:opacity-30"
          onClick={() => {
            if (currentIndex > 0) {
              setCurrentIndex((prev) => prev - 1);
            }
          }}
          disabled={currentIndex === 0}
        >
          <UndoIcon />
        </Button>

        {/* Like Button */}
        <Button
          variant="outline"
          size="icon"
          className="w-14 h-14 md:w-16 md:h-16 rounded-full border-2 border-green-500/60 bg-white/5 hover:bg-green-500/10 active:bg-green-500/20 text-green-500 transition-all active:scale-90 shadow-lg hover:shadow-green-500/20"
          onClick={() => handleSwipe("right")}
        >
          <HeartIcon />
        </Button>
      </div>

      {/* Keyboard hints - hidden on mobile */}
      <p className="hidden md:block text-gray-500 text-sm mt-4 text-center">
        Use <kbd className="px-2 py-1 bg-white/10 rounded text-xs">←</kbd> and{" "}
        <kbd className="px-2 py-1 bg-white/10 rounded text-xs">→</kbd> keys to swipe
      </p>

      {/* Match Modal */}
      <MatchModal
        match={matchedProfile}
        currentUserPhoto={currentUser?.profile?.profilePhoto || currentUser?.profile?.photos?.[0] || currentUser?.image}
        onClose={() => setMatchedProfile(null)}
      />
    </div>
  );
}
