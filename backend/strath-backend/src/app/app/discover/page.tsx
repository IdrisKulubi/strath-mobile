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

  useEffect(() => {
    fetchProfiles();
  }, []);

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
    <div className="flex flex-col items-center justify-center min-h-screen p-4 md:p-6">
      {/* Card Stack - responsive height */}
      <div className="relative w-full max-w-md h-[65vh] md:h-[600px]">
        {/* Next card (behind) */}
        {nextProfile && (
          <div className="absolute inset-0 scale-95 opacity-50">
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

      {/* Action Buttons - larger touch targets on mobile */}
      <div className="flex items-center justify-center gap-4 md:gap-6 mt-6 md:mt-8">
        <Button
          variant="outline"
          size="icon"
          className="w-16 h-16 md:w-14 md:h-14 rounded-full border-2 border-red-500 bg-transparent hover:bg-red-500/10 active:bg-red-500/20 text-red-500 transition-all active:scale-95"
          onClick={() => handleSwipe("left")}
        >
          <XIcon />
        </Button>

        <Button
          variant="outline"
          size="icon"
          className="w-12 h-12 rounded-full border-2 border-yellow-500 bg-transparent hover:bg-yellow-500/10 active:bg-yellow-500/20 text-yellow-500 transition-all active:scale-95"
          onClick={() => {
            if (currentIndex > 0) {
              setCurrentIndex((prev) => prev - 1);
            }
          }}
          disabled={currentIndex === 0}
        >
          <UndoIcon />
        </Button>

        <Button
          variant="outline"
          size="icon"
          className="w-16 h-16 md:w-14 md:h-14 rounded-full border-2 border-green-500 bg-transparent hover:bg-green-500/10 active:bg-green-500/20 text-green-500 transition-all active:scale-95"
          onClick={() => handleSwipe("right")}
        >
          <HeartIcon />
        </Button>
      </div>

      {/* Keyboard hints - hidden on mobile */}
      <p className="hidden md:block text-gray-500 text-sm mt-4">
        Use <kbd className="px-2 py-1 bg-white/10 rounded text-xs">←</kbd> and{" "}
        <kbd className="px-2 py-1 bg-white/10 rounded text-xs">→</kbd> keys to swipe
      </p>

      {/* Match Modal */}
      <MatchModal
        match={matchedProfile}
        onClose={() => setMatchedProfile(null)}
      />
    </div>
  );
}
