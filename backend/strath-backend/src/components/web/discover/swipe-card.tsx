"use client";

import { useState } from "react";
import Image from "next/image";
import { motion, useMotionValue, useTransform, PanInfo, AnimatePresence } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

// Report reasons
const REPORT_REASONS = [
  { id: "inappropriate_content", label: "Inappropriate content", icon: "🚫" },
  { id: "fake_profile", label: "Fake profile", icon: "🎭" },
  { id: "harassment", label: "Harassment or bullying", icon: "😤" },
  { id: "spam", label: "Spam or scam", icon: "📧" },
  { id: "underage", label: "Underage user", icon: "🔞" },
  { id: "threatening", label: "Threatening behavior", icon: "⚠️" },
  { id: "hate_speech", label: "Hate speech", icon: "🚷" },
  { id: "other", label: "Other", icon: "📝" },
];

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
  height?: string;
  lookingFor?: string;
  religion?: string;
  drinkingPreference?: string;
  smoking?: string;
  instagram?: string;
  spotify?: string;
  snapchat?: string;
  // New personality & lifestyle fields
  loveLanguage?: string;
  communicationStyle?: string;
  sleepingHabits?: string;
  socialMediaUsage?: string;
  workoutFrequency?: string;
  personalityType?: string;
  zodiacSign?: string;
  qualities?: string[];
  prompts?: { promptId: string; response: string }[];
}

// Prompt text lookup
const PROMPT_TEXTS: Record<string, string> = {
  unpopular_opinion: "My most unpopular opinion is...",
  conspiracy: "A conspiracy theory I low-key believe...",
  guilty_pleasure: "My guilty pleasure is...",
  pet_peeve: "My biggest pet peeve is...",
  perfect_sunday: "My perfect Sunday looks like...",
  life_goal: "A life goal of mine is...",
  green_flag: "The biggest green flag in someone is...",
  dealbreaker: "My dating dealbreaker is...",
  useless_talent: "My useless talent is...",
  karaoke: "My go-to karaoke song is...",
  comfort_food: "My comfort food is...",
  tv_binge: "I could rewatch __ forever",
  proud_of: "I'm secretly proud of...",
  change_mind: "Something that changed my mind recently...",
  grateful_for: "I'm most grateful for...",
  teach_me: "I want someone to teach me...",
  ideal_date: "My ideal first date is...",
  love_language: "My love language is...",
  looking_for: "I'm looking for someone who...",
  relationship_rule: "My non-negotiable in a relationship...",
  campus_spot: "My favorite spot on campus is...",
  study_hack: "My best study hack is...",
  class_type: "I'm the type to ____ in class",
};

interface SwipeCardProps {
  profile: Profile;
  onSwipe?: (direction: "left" | "right") => void;
  swipeDirection?: "left" | "right" | null;
}

// Icons
const CloseIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
  </svg>
);

const ChevronDownIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m6 9 6 6 6-6"/>
  </svg>
);

const HeartIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>
  </svg>
);

const InstagramIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect width="20" height="20" x="2" y="2" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/>
  </svg>
);

const SpotifyIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
    <circle cx="12" cy="12" r="10"/>
    <path fill="#000" d="M15.8 16.3c-.2 0-.3-.1-.5-.2-2.2-1.3-4.9-1.4-8.1-.8-.3.1-.6-.2-.7-.5-.1-.3.2-.6.5-.7 3.5-.7 6.5-.4 9 1 .3.2.4.5.2.8-.1.3-.3.4-.4.4zM17 13.3c-.2 0-.4-.1-.5-.2-2.5-1.5-6.2-2-9.1-1.1-.4.1-.7-.1-.8-.5-.1-.4.1-.7.5-.8 3.3-1 7.4-.5 10.3 1.3.3.2.4.6.2 1-.2.2-.4.3-.6.3zM17.3 10.1c-.2 0-.3 0-.5-.1C13.8 8.1 8 8 4.7 9c-.4.1-.8-.2-.9-.6-.1-.4.2-.8.6-.9C8 6.3 14.4 6.5 18.1 8.7c.4.2.5.7.3 1-.2.3-.4.4-.6.4z"/>
  </svg>
);

const SnapchatIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="#FFFC00">
    <path d="M12.206.793c.99 0 4.347.276 5.93 3.821.529 1.193.403 3.219.299 4.847l-.003.06c-.012.18-.022.345-.03.5.071.065.186.129.333.153.162.027.346.018.576-.029.17-.035.39-.061.639-.061.204 0 .491.025.731.135.283.129.49.346.568.546.129.332.015.694-.246.943-.157.15-.385.295-.585.412-.135.079-.25.147-.34.2-.104.063-.18.108-.227.127-.066.024-.111.04-.143.052l.003.007a2.1 2.1 0 0 1-.11.031 5.24 5.24 0 0 1-.156.032c-.024.006-.04.01-.046.013-.017.017-.022.067.003.127.021.054.043.086.065.104.031.024.051.026.068.024l-.004.013c.038.023.067.042.09.056.193.104.383.222.569.344.324.21.631.425.876.711.259.3.455.661.455 1.119 0 .369-.134.675-.325.935-.2.273-.461.486-.728.665-.55.368-1.177.594-1.788.752-.118.03-.203.054-.265.077-.044.016-.131.05-.231.137-.044.038-.09.081-.144.139l-.003.003c-.068.073-.206.222-.344.338-.185.154-.482.349-.878.349-.128 0-.261-.015-.399-.058-.123-.039-.236-.082-.355-.126-.104-.039-.211-.078-.324-.115a1.87 1.87 0 0 0-.543-.065 2.95 2.95 0 0 0-.476.042c-.136.022-.267.056-.38.098-.087.033-.263.102-.526.198-.266.097-.553.213-.842.3a3.25 3.25 0 0 1-.949.161c-.403 0-.7-.197-.883-.35-.135-.113-.268-.256-.334-.328l-.003-.003a2.45 2.45 0 0 0-.136-.134c-.095-.086-.18-.12-.221-.135-.059-.022-.143-.046-.26-.076-.612-.159-1.239-.385-1.789-.753-.267-.179-.528-.392-.728-.665-.191-.26-.325-.566-.325-.935 0-.458.196-.819.455-1.119.245-.286.552-.501.876-.711.186-.122.376-.24.569-.344.023-.014.052-.033.09-.056l-.004-.013c.017.002.037 0 .068-.024.022-.018.044-.05.065-.104.025-.06.02-.11.003-.127-.006-.003-.022-.007-.046-.013a5.24 5.24 0 0 1-.156-.032 2.1 2.1 0 0 1-.11-.031l.003-.007a1.66 1.66 0 0 1-.143-.052 4.05 4.05 0 0 1-.227-.127c-.09-.053-.205-.121-.34-.2-.2-.117-.428-.262-.585-.412-.261-.249-.375-.611-.246-.943.078-.2.285-.417.568-.546.24-.11.527-.135.731-.135.249 0 .469.026.639.061.187.047.371.056.533.029.147-.024.262-.088.333-.153a5.1 5.1 0 0 1-.03-.5l-.003-.06c-.104-1.628-.23-3.654.299-4.847C7.859 1.069 11.216.793 12.206.793"/>
  </svg>
);

export function SwipeCard({ profile, onSwipe, swipeDirection }: SwipeCardProps) {
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [showFullProfile, setShowFullProfile] = useState(false);

  // Block/Report modal states
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [selectedReportReason, setSelectedReportReason] = useState<string | null>(null);
  const [customReportReason, setCustomReportReason] = useState("");
  const [reportDetails, setReportDetails] = useState("");
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);
  const [isBlocking, setIsBlocking] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const x = useMotionValue(0);
  const rotate = useTransform(x, [-300, 0, 300], [-25, 0, 25]);
  const opacity = useTransform(x, [-300, -100, 0, 100, 300], [0, 1, 1, 1, 0]);

  // Like/Nope indicators
  const likeOpacity = useTransform(x, [0, 100], [0, 1]);
  const nopeOpacity = useTransform(x, [-100, 0], [1, 0]);

  const photos = profile.photos?.length > 0 
    ? profile.photos 
    : profile.profilePhoto 
      ? [profile.profilePhoto] 
      : [];

  const handleDragEnd = (_: unknown, info: PanInfo) => {
    setIsDragging(false);
    
    if (info.offset.x > 100) {
      onSwipe?.("right");
    } else if (info.offset.x < -100) {
      onSwipe?.("left");
    }
  };

  const nextPhoto = () => {
    if (currentPhotoIndex < photos.length - 1) {
      setCurrentPhotoIndex((prev) => prev + 1);
    }
  };

  const prevPhoto = () => {
    if (currentPhotoIndex > 0) {
      setCurrentPhotoIndex((prev) => prev - 1);
    }
  };

  // Handle click on left/right side of image to navigate photos
  const handleImageClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // Only navigate photos if we have multiple and weren't dragging
    const shouldPreventPhotoNavigation = isDragging || showFullProfile || photos.length <= 1;
    if (shouldPreventPhotoNavigation) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const width = rect.width;
    
    // Left 35% = prev photo, Right 35% = next photo, Middle = do nothing
    if (clickX < width * 0.35) {
      e.stopPropagation();
      prevPhoto();
    } else if (clickX > width * 0.65) {
      e.stopPropagation();
      nextPhoto();
    }
  };

  const animationVariants = {
    initial: { scale: 1, x: 0, rotate: 0 },
    exit: swipeDirection === "left" 
      ? { x: -500, rotate: -30, opacity: 0, transition: { duration: 0.3 } }
      : swipeDirection === "right"
      ? { x: 500, rotate: 30, opacity: 0, transition: { duration: 0.3 } }
      : {},
  };

  const getLookingForEmoji = (lookingFor?: string) => {
    switch (lookingFor) {
      case "relationship": return "💕";
      case "casual": return "🎉";
      case "friends": return "👋";
      default: return "🤷";
    }
  };

  const getLookingForLabel = (lookingFor?: string) => {
    switch (lookingFor) {
      case "relationship": return "Relationship";
      case "casual": return "Something Casual";
      case "friends": return "New Friends";
      default: return "Not Sure Yet";
    }
  };

  // Block user handler
  const handleBlock = async () => {
    setIsBlocking(true);
    try {
      const response = await fetch("/api/user/block", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          blockedUserId: profile.userId,
        }),
      });
      const data = await response.json();
      if (data.success) {
        setSuccessMessage("User blocked successfully");
        setShowBlockModal(false);
        // Swipe left to remove the card
        setTimeout(() => {
          onSwipe?.("left");
        }, 1000);
      } else {
        setShowBlockModal(false);
        alert(data.error || "Failed to block user");
      }
    } catch (error) {
      console.error("Failed to block:", error);
      setShowBlockModal(false);
      alert("Failed to block user");
    } finally {
      setIsBlocking(false);
    }
  };

  // Report user handler
  const handleReport = async () => {
    const reason = selectedReportReason === "other" ? customReportReason : selectedReportReason;
    if (!reason) return;

    setIsSubmittingReport(true);
    try {
      const response = await fetch("/api/user/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reportedUserId: profile.userId,
          reason: reason,
          details: reportDetails || undefined,
        }),
      });
      const data = await response.json();
      if (data.success) {
        setSuccessMessage("Report submitted successfully. Our team will review it.");
        setShowReportModal(false);
        setSelectedReportReason(null);
        setCustomReportReason("");
        setReportDetails("");
        setTimeout(() => setSuccessMessage(null), 3000);
      } else {
        alert(data.error || "Failed to submit report");
      }
    } catch (error) {
      console.error("Failed to report:", error);
      alert("Failed to submit report");
    } finally {
      setIsSubmittingReport(false);
    }
  };

  return (
    <motion.div
      className="absolute inset-0 cursor-grab active:cursor-grabbing"
      drag={showFullProfile ? false : "x"}
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.7}
      onDragStart={() => setIsDragging(true)}
      onDragEnd={handleDragEnd}
      style={{ x, rotate, opacity }}
      variants={animationVariants}
      initial="initial"
      animate={swipeDirection ? "exit" : "initial"}
    >
      <div className="relative w-full h-full bg-[#1a1a2e] rounded-3xl overflow-hidden shadow-2xl">
        {/* Photo - the whole card is draggable, click zones only for photo nav */}
        <div 
          className="absolute inset-0"
          onClick={handleImageClick}
        >
          {photos.length > 0 ? (
            <Image
              src={photos[currentPhotoIndex]}
              alt={profile.firstName}
              fill
              className="object-cover pointer-events-none"
              priority
              draggable={false}
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-pink-500/20 to-purple-500/20 flex items-center justify-center">
              <span className="text-6xl">👤</span>
            </div>
          )}
          
          {/* Click zone indicators - show arrows based on available photos */}
          {photos.length > 1 && !isDragging && (
            <>
              {/* Left arrow - show only if there's a previous photo */}
              {currentPhotoIndex > 0 && (
                <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none z-10">
                  <div className="w-9 h-9 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center shadow-lg border border-white/10 animate-pulse">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="m15 18-6-6 6-6"/>
                    </svg>
                  </div>
                </div>
              )}
              {/* Right arrow - show only if there's a next photo */}
              {currentPhotoIndex < photos.length - 1 && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none z-10">
                  <div className="w-9 h-9 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center shadow-lg border border-white/10 animate-pulse">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="m9 18 6-6-6-6"/>
                    </svg>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Photo indicators - enhanced with tap areas */}
        {photos.length > 1 && (
          <div className="absolute top-4 left-4 right-4 flex gap-1.5 z-10">
            {photos.map((_, index) => (
              <button
                key={index}
                onClick={(e) => {
                  e.stopPropagation();
                  setCurrentPhotoIndex(index);
                }}
                className={`h-1 flex-1 rounded-full transition-all ${
                  index === currentPhotoIndex 
                    ? "bg-white shadow-[0_0_8px_rgba(255,255,255,0.5)]" 
                    : "bg-white/30 hover:bg-white/50"
                }`}
              />
            ))}
          </div>
        )}

        {/* Like indicator */}
        <motion.div
          className="absolute top-8 left-8 px-4 py-2 border-4 border-green-500 rounded-lg rotate-[-20deg] z-10"
          style={{ opacity: likeOpacity }}
        >
          <span className="text-3xl font-black text-green-500">LIKE</span>
        </motion.div>

        {/* Nope indicator */}
        <motion.div
          className="absolute top-8 right-8 px-4 py-2 border-4 border-red-500 rounded-lg rotate-[20deg] z-10"
          style={{ opacity: nopeOpacity }}
        >
          <span className="text-3xl font-black text-red-500">NOPE</span>
        </motion.div>

        {/* Gradient overlay - Tinder-style subtle gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 via-30% to-transparent pointer-events-none" />

        {/* Profile info - Tinder-style overlay */}
        <AnimatePresence>
          {!showFullProfile && (
            <motion.div 
              className="absolute bottom-0 left-0 right-0 p-5 md:p-6 text-white z-10"
              initial={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
            >
              {/* Recently Active indicator - small and subtle like Tinder */}
              <div className="flex items-center gap-1.5 mb-1">
                <div className="w-2 h-2 rounded-full bg-green-500" />
                <span className="text-sm text-green-400 font-medium">Recently active</span>
              </div>

              {/* Name and Age - large and bold like Tinder */}
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h2 className="text-3xl md:text-4xl font-bold">
                      {profile.firstName}
                    </h2>
                    <span className="text-3xl md:text-4xl font-light text-white/90">{profile.age}</span>
                    {/* Verified badge like Tinder */}
                    <svg className="w-6 h-6 text-blue-500" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                    </svg>
                  </div>
                  
                  {/* Location/Course - subtle like Tinder's distance */}
                  {profile.course && (
                    <p className="text-white/80 text-base mt-1 flex items-center gap-1">
                      <span>📚</span> {profile.course} {profile.yearOfStudy && `• Year ${profile.yearOfStudy}`}
                    </p>
                  )}
                </div>

                {/* Info button - positioned like Tinder's arrow */}
                <button
                  aria-label="View full profile"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowFullProfile(true);
                  }}
                  className="w-10 h-10 rounded-full border-2 border-white/40 flex items-center justify-center text-white hover:bg-white/10 hover:border-white/60 transition-all ml-3 shrink-0"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m18 15-6-6-6 6"/>
                  </svg>
                </button>
              </div>

              {/* Tap for more - subtle hint */}
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  setShowFullProfile(true);
                }}
                className="flex items-center gap-1 text-white/40 text-sm mt-4 hover:text-white/70 transition-colors mx-auto"
              >
                <span>Tap for more</span>
                <ChevronDownIcon />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Full profile panel */}
        <AnimatePresence>
          {showFullProfile && (
            <motion.div
              className="absolute inset-0 z-20 overflow-hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              {/* Backdrop blur */}
              <motion.div 
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={() => setShowFullProfile(false)}
              />
              
              {/* Full profile content */}
              <motion.div
                className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-[#0f0d23] via-[#0f0d23] to-[#0f0d23]/95 rounded-t-[32px] max-h-[85%] overflow-y-auto"
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ type: "spring", damping: 30, stiffness: 300 }}
              >
                {/* Handle bar */}
                <div className="sticky top-0 pt-3 pb-2 bg-gradient-to-b from-[#0f0d23] to-transparent z-10">
                  <div className="w-12 h-1 bg-white/20 rounded-full mx-auto" />
                </div>

                {/* Close button */}
                <button
                  onClick={() => setShowFullProfile(false)}
                  className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center text-white hover:bg-white/20 transition-all z-20"
                  aria-label="Close profile"
                >
                  <CloseIcon />
                </button>

                <div className="px-6 pb-8">
                  {/* Profile header */}
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-20 h-20 rounded-2xl overflow-hidden border-2 border-pink-500/50 shrink-0">
                      {photos.length > 0 ? (
                        <Image
                          src={photos[0]}
                          alt={profile.firstName}
                          width={80}
                          height={80}
                          className="object-cover w-full h-full"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-pink-500/20 to-purple-500/20 flex items-center justify-center">
                          <span className="text-2xl">👤</span>
                        </div>
                      )}
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-white">
                        {profile.firstName}
                        {profile.lastName ? ` ${profile.lastName}` : ""},{" "}
                        <span className="font-normal text-gray-300">{profile.age}</span>
                      </h2>
                      {profile.course && (
                        <p className="text-gray-400 text-sm mt-0.5">
                          {profile.course} {profile.yearOfStudy && `• Year ${profile.yearOfStudy}`}
                        </p>
                      )}
                      {profile.university && (
                        <p className="text-gray-500 text-xs mt-0.5">{profile.university}</p>
                      )}
                    </div>
                  </div>

                  {/* Looking for */}
                  {profile.lookingFor && (
                    <div className="mb-6">
                      <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-pink-500/20 to-rose-500/20 border border-pink-500/30">
                        <HeartIcon />
                        <span className="text-white text-sm font-medium">
                          Looking for {getLookingForLabel(profile.lookingFor)} {getLookingForEmoji(profile.lookingFor)}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Bio */}
                  {profile.bio && (
                    <div className="mb-6">
                      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">About</h3>
                      <p className="text-gray-200 leading-relaxed">{profile.bio}</p>
                    </div>
                  )}

                  {/* Prompts Section */}
                  {profile.prompts && profile.prompts.length > 0 && (
                    <div className="mb-6 space-y-3">
                      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Get to Know Me</h3>
                      {profile.prompts.map((prompt, idx) => (
                        <div 
                          key={idx}
                          className="bg-gradient-to-br from-pink-500/10 to-purple-500/10 rounded-2xl p-4 border border-white/10"
                        >
                          <p className="text-gray-400 text-sm mb-2 italic">
                            {PROMPT_TEXTS[prompt.promptId] || prompt.promptId}
                          </p>
                          <p className="text-white font-medium">{prompt.response}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Personality & Vibe Section */}
                  {(profile.loveLanguage || profile.communicationStyle || profile.zodiacSign || profile.personalityType) && (
                    <div className="mb-6">
                      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">My Vibe ✨</h3>
                      <div className="grid grid-cols-2 gap-3">
                        {profile.loveLanguage && (
                          <div className="bg-gradient-to-br from-rose-500/10 to-pink-500/10 rounded-xl p-3 border border-pink-500/20">
                            <span className="text-gray-400 text-xs">Love Language</span>
                            <p className="text-white font-medium mt-0.5">💕 {profile.loveLanguage}</p>
                          </div>
                        )}
                        {profile.communicationStyle && (
                          <div className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 rounded-xl p-3 border border-blue-500/20">
                            <span className="text-gray-400 text-xs">Communication</span>
                            <p className="text-white font-medium mt-0.5">💬 {profile.communicationStyle}</p>
                          </div>
                        )}
                        {profile.zodiacSign && (
                          <div className="bg-gradient-to-br from-purple-500/10 to-indigo-500/10 rounded-xl p-3 border border-purple-500/20">
                            <span className="text-gray-400 text-xs">Zodiac</span>
                            <p className="text-white font-medium mt-0.5">⭐ {profile.zodiacSign}</p>
                          </div>
                        )}
                        {profile.personalityType && (
                          <div className="bg-gradient-to-br from-amber-500/10 to-orange-500/10 rounded-xl p-3 border border-amber-500/20">
                            <span className="text-gray-400 text-xs">Personality</span>
                            <p className="text-white font-medium mt-0.5">🧠 {profile.personalityType}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Lifestyle Section */}
                  {(profile.sleepingHabits || profile.workoutFrequency || profile.socialMediaUsage) && (
                    <div className="mb-6">
                      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Lifestyle 🌟</h3>
                      <div className="grid grid-cols-2 gap-3">
                        {profile.sleepingHabits && (
                          <div className="bg-white/5 rounded-xl p-3 border border-white/5">
                            <span className="text-gray-500 text-xs">Sleep Schedule</span>
                            <p className="text-white font-medium mt-0.5">🌙 {profile.sleepingHabits}</p>
                          </div>
                        )}
                        {profile.workoutFrequency && (
                          <div className="bg-white/5 rounded-xl p-3 border border-white/5">
                            <span className="text-gray-500 text-xs">Workout</span>
                            <p className="text-white font-medium mt-0.5">💪 {profile.workoutFrequency}</p>
                          </div>
                        )}
                        {profile.socialMediaUsage && (
                          <div className="bg-white/5 rounded-xl p-3 border border-white/5 col-span-2">
                            <span className="text-gray-500 text-xs">Social Media</span>
                            <p className="text-white font-medium mt-0.5">📱 {profile.socialMediaUsage}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Details grid */}
                  <div className="grid grid-cols-2 gap-3 mb-6">
                    {profile.height && (
                      <div className="bg-white/5 rounded-xl p-3 border border-white/5">
                        <span className="text-gray-500 text-xs">Height</span>
                        <p className="text-white font-medium mt-0.5">📏 {profile.height}</p>
                      </div>
                    )}
                    {profile.religion && (
                      <div className="bg-white/5 rounded-xl p-3 border border-white/5">
                        <span className="text-gray-500 text-xs">Religion</span>
                        <p className="text-white font-medium mt-0.5">🙏 {profile.religion}</p>
                      </div>
                    )}
                    {profile.drinkingPreference && (
                      <div className="bg-white/5 rounded-xl p-3 border border-white/5">
                        <span className="text-gray-500 text-xs">Drinking</span>
                        <p className="text-white font-medium mt-0.5">🍷 {profile.drinkingPreference}</p>
                      </div>
                    )}
                    {profile.smoking && (
                      <div className="bg-white/5 rounded-xl p-3 border border-white/5">
                        <span className="text-gray-500 text-xs">Smoking</span>
                        <p className="text-white font-medium mt-0.5">🚬 {profile.smoking}</p>
                      </div>
                    )}
                  </div>

                  {/* Interests */}
                  {profile.interests?.length > 0 && (
                    <div className="mb-6">
                      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Interests</h3>
                      <div className="flex flex-wrap gap-2">
                        {profile.interests.map((interest) => (
                          <Badge
                            key={interest}
                            variant="secondary"
                            className="bg-gradient-to-r from-pink-500/10 to-purple-500/10 text-white border border-white/10 px-3 py-1"
                          >
                            {interest}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Qualities they value */}
                  {profile.qualities && profile.qualities.length > 0 && (
                    <div className="mb-6">
                      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">What I Value 💎</h3>
                      <div className="flex flex-wrap gap-2">
                        {profile.qualities.map((quality) => (
                          <Badge
                            key={quality}
                            variant="secondary"
                            className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 text-white border border-amber-500/20 px-3 py-1"
                          >
                            {quality}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Social links */}
                  {(profile.instagram || profile.spotify || profile.snapchat) && (
                    <div className="mb-6">
                      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Connect</h3>
                      <div className="flex flex-wrap gap-3">
                        {profile.instagram && (
                          <a
                            href={`https://instagram.com/${encodeURIComponent(profile.instagram)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-white/10 text-white hover:from-purple-500/30 hover:to-pink-500/30 transition-all"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <InstagramIcon />
                            <span className="text-sm font-medium">@{profile.instagram}</span>
                          </a>
                        )}
                        {profile.snapchat && (
                          <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-yellow-400/20 border border-yellow-400/30 text-white">
                            <SnapchatIcon />
                            <span className="text-sm font-medium">{profile.snapchat}</span>
                          </div>
                        )}
                        {profile.spotify && (
                          <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-green-500/20 border border-green-500/30 text-white">
                            <SpotifyIcon />
                            <span className="text-sm font-medium">{profile.spotify}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Photo gallery in full view */}
                  {photos.length > 1 && (
                    <div className="mt-6">
                      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Photos</h3>
                      <div className="grid grid-cols-3 gap-2">
                        {photos.map((photo, index) => (
                          <button
                            key={index}
                            onClick={() => {
                              setCurrentPhotoIndex(index);
                              setShowFullProfile(false);
                            }}
                            className={`aspect-square rounded-xl overflow-hidden border-2 transition-all ${
                              index === currentPhotoIndex 
                                ? "border-pink-500 scale-[1.02]" 
                                : "border-transparent hover:border-white/30"
                            }`}
                          >
                            <Image
                              src={photo}
                              alt={`${profile.firstName} photo ${index + 1}`}
                              width={120}
                              height={120}
                              className="object-cover w-full h-full"
                            />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Block & Report Section */}
                  <div className="mt-8 pt-6 border-t border-white/10">
                    <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Safety</h3>
                    <div className="flex gap-3">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowReportModal(true);
                        }}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-gray-400 hover:text-white hover:bg-white/10 transition-all"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/>
                          <line x1="4" x2="4" y1="22" y2="15"/>
                        </svg>
                        <span className="text-sm font-medium">Report</span>
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowBlockModal(true);
                        }}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 hover:text-red-300 hover:bg-red-500/20 transition-all"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" cy="12" r="10"/>
                          <path d="m4.9 4.9 14.2 14.2"/>
                        </svg>
                        <span className="text-sm font-medium">Block</span>
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Success Message Toast */}
        <AnimatePresence>
          {successMessage && (
            <motion.div
              className="absolute top-4 left-1/2 -translate-x-1/2 z-[100] px-4 py-2 bg-green-500/90 text-white text-sm font-medium rounded-full shadow-lg backdrop-blur-sm"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              {successMessage}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Block Modal */}
        <AnimatePresence>
          {showBlockModal && (
            <motion.div 
              className="absolute inset-0 z-[100] flex items-center justify-center p-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => !isBlocking && setShowBlockModal(false)} />
              <motion.div 
                className="relative bg-[#1a1a2e] rounded-3xl p-6 w-full max-w-sm border border-white/10 shadow-2xl"
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
              >
                <div className="text-center">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/20 flex items-center justify-center">
                    <span className="text-3xl">🚫</span>
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">Block {profile.firstName}?</h3>
                  <p className="text-gray-400 text-sm mb-6">
                    They won&apos;t be able to see your profile or match with you. This action cannot be undone.
                  </p>
                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      className="flex-1 bg-white/5 border-white/10 text-white hover:bg-white/10"
                      onClick={() => setShowBlockModal(false)}
                      disabled={isBlocking}
                    >
                      Cancel
                    </Button>
                    <Button
                      className="flex-1 bg-red-500 hover:bg-red-600"
                      onClick={handleBlock}
                      disabled={isBlocking}
                    >
                      {isBlocking ? (
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          <span>Blocking...</span>
                        </div>
                      ) : (
                        "Block"
                      )}
                    </Button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Report Modal */}
        <AnimatePresence>
          {showReportModal && (
            <motion.div 
              className="absolute inset-0 z-[100] flex items-center justify-center p-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => !isSubmittingReport && setShowReportModal(false)} />
              <motion.div 
                className="relative bg-[#1a1a2e] rounded-3xl w-full max-w-md border border-white/10 shadow-2xl max-h-[90%] overflow-hidden flex flex-col"
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
              >
                {/* Header */}
                <div className="p-6 pb-4 border-b border-white/10">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xl font-bold text-white">Report {profile.firstName}</h3>
                    <button
                      onClick={() => setShowReportModal(false)}
                      className="p-2 hover:bg-white/10 rounded-full transition-colors"
                      disabled={isSubmittingReport}
                    >
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                        <path d="M18 6 6 18" />
                        <path d="m6 6 12 12" />
                      </svg>
                    </button>
                  </div>
                  <p className="text-gray-400 text-sm mt-1">Help us keep Strathspace safe</p>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 pt-4 space-y-4">
                  <p className="text-gray-300 text-sm">Select a reason or type your own:</p>
                  
                  {/* Reason Selection */}
                  <div className="grid gap-2">
                    {REPORT_REASONS.map((reason) => (
                      <button
                        key={reason.id}
                        onClick={() => {
                          setSelectedReportReason(reason.id);
                          if (reason.id !== "other") setCustomReportReason("");
                        }}
                        className={`flex items-center gap-3 p-3 rounded-xl text-left transition-all ${
                          selectedReportReason === reason.id
                            ? "bg-pink-500/20 border-2 border-pink-500"
                            : "bg-white/5 border-2 border-transparent hover:bg-white/10"
                        }`}
                      >
                        <span className="text-xl">{reason.icon}</span>
                        <span className="text-white text-sm font-medium">{reason.label}</span>
                        {selectedReportReason === reason.id && (
                          <svg className="ml-auto text-pink-500" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M20 6L9 17l-5-5" />
                          </svg>
                        )}
                      </button>
                    ))}
                  </div>

                  {/* Custom Reason Input */}
                  {selectedReportReason === "other" && (
                    <div className="space-y-2">
                      <label className="text-gray-300 text-sm">Describe the issue:</label>
                      <Input
                        value={customReportReason}
                        onChange={(e) => setCustomReportReason(e.target.value)}
                        placeholder="Type your reason..."
                        className="bg-white/5 border-white/10 text-white placeholder:text-gray-500"
                      />
                    </div>
                  )}

                  {/* Additional Details */}
                  {selectedReportReason && selectedReportReason !== "other" && (
                    <div className="space-y-2">
                      <label className="text-gray-300 text-sm">Additional details (optional):</label>
                      <Textarea
                        value={reportDetails}
                        onChange={(e) => setReportDetails(e.target.value)}
                        placeholder="Provide more context about this report..."
                        className="bg-white/5 border-white/10 text-white placeholder:text-gray-500 min-h-[80px] resize-none"
                      />
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="p-6 pt-4 border-t border-white/10">
                  <Button
                    className="w-full bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 disabled:opacity-50"
                    onClick={handleReport}
                    disabled={
                      isSubmittingReport ||
                      !selectedReportReason ||
                      (selectedReportReason === "other" && !customReportReason.trim())
                    }
                  >
                    {isSubmittingReport ? (
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>Submitting...</span>
                      </div>
                    ) : (
                      "Submit Report"
                    )}
                  </Button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
