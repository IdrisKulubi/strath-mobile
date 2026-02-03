"use client";

import { useState } from "react";
import Image from "next/image";
import { motion, useMotionValue, useTransform, PanInfo, AnimatePresence } from "framer-motion";
import { Badge } from "@/components/ui/badge";

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
}

interface SwipeCardProps {
  profile: Profile;
  onSwipe?: (direction: "left" | "right") => void;
  swipeDirection?: "left" | "right" | null;
}

// Icons
const InfoIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>
  </svg>
);

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

export function SwipeCard({ profile, onSwipe, swipeDirection }: SwipeCardProps) {
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [showFullProfile, setShowFullProfile] = useState(false);

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

                  {/* Social links */}
                  {(profile.instagram || profile.spotify) && (
                    <div>
                      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Connect</h3>
                      <div className="flex gap-3">
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
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
