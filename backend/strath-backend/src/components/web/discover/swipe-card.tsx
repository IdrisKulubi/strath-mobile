"use client";

import { useState } from "react";
import Image from "next/image";
import { motion, useMotionValue, useTransform, PanInfo } from "framer-motion";
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
}

interface SwipeCardProps {
  profile: Profile;
  onSwipe?: (direction: "left" | "right") => void;
  swipeDirection?: "left" | "right" | null;
}

const ChevronLeftIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m15 18-6-6 6-6"/>
  </svg>
);

const ChevronRightIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m9 18 6-6-6-6"/>
  </svg>
);

export function SwipeCard({ profile, onSwipe, swipeDirection }: SwipeCardProps) {
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

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

  const animationVariants = {
    initial: { scale: 1, x: 0, rotate: 0 },
    exit: swipeDirection === "left" 
      ? { x: -500, rotate: -30, opacity: 0, transition: { duration: 0.3 } }
      : swipeDirection === "right"
      ? { x: 500, rotate: 30, opacity: 0, transition: { duration: 0.3 } }
      : {},
  };

  return (
    <motion.div
      className="absolute inset-0 cursor-grab active:cursor-grabbing"
      drag="x"
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
        {/* Photo */}
        <div className="absolute inset-0">
          {photos.length > 0 ? (
            <Image
              src={photos[currentPhotoIndex]}
              alt={profile.firstName}
              fill
              className="object-cover"
              priority
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-pink-500/20 to-purple-500/20 flex items-center justify-center">
              <span className="text-6xl">👤</span>
            </div>
          )}
        </div>

        {/* Photo indicators */}
        {photos.length > 1 && (
          <div className="absolute top-4 left-4 right-4 flex gap-1">
            {photos.map((_, index) => (
              <div
                key={index}
                className={`h-1 flex-1 rounded-full transition-colors ${
                  index === currentPhotoIndex ? "bg-white" : "bg-white/30"
                }`}
              />
            ))}
          </div>
        )}

        {/* Photo navigation */}
        {photos.length > 1 && !isDragging && (
          <>
            <button
              onClick={(e) => { e.stopPropagation(); prevPhoto(); }}
              className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-black/20 hover:bg-black/40 rounded-full flex items-center justify-center text-white transition-colors"
              disabled={currentPhotoIndex === 0}
            >
              <ChevronLeftIcon />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); nextPhoto(); }}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-black/20 hover:bg-black/40 rounded-full flex items-center justify-center text-white transition-colors"
              disabled={currentPhotoIndex === photos.length - 1}
            >
              <ChevronRightIcon />
            </button>
          </>
        )}

        {/* Like indicator */}
        <motion.div
          className="absolute top-8 left-8 px-4 py-2 border-4 border-green-500 rounded-lg rotate-[-20deg]"
          style={{ opacity: likeOpacity }}
        >
          <span className="text-3xl font-black text-green-500">LIKE</span>
        </motion.div>

        {/* Nope indicator */}
        <motion.div
          className="absolute top-8 right-8 px-4 py-2 border-4 border-red-500 rounded-lg rotate-[20deg]"
          style={{ opacity: nopeOpacity }}
        >
          <span className="text-3xl font-black text-red-500">NOPE</span>
        </motion.div>

        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />

        {/* Profile info */}
        <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
          <div className="flex items-end justify-between">
            <div>
              <h2 className="text-3xl font-bold">
                {profile.firstName}
                {profile.lastName ? ` ${profile.lastName.charAt(0)}.` : ""},{" "}
                <span className="font-normal">{profile.age}</span>
              </h2>
              
              {profile.course && (
                <p className="text-gray-300 mt-1">
                  📚 {profile.course}
                  {profile.yearOfStudy && ` • Year ${profile.yearOfStudy}`}
                </p>
              )}

              {profile.university && (
                <p className="text-gray-400 text-sm mt-1">🏫 {profile.university}</p>
              )}
            </div>
          </div>

          {/* Bio */}
          {profile.bio && (
            <p className="text-gray-300 mt-3 line-clamp-2">{profile.bio}</p>
          )}

          {/* Interests */}
          {profile.interests?.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              {profile.interests.slice(0, 5).map((interest) => (
                <Badge
                  key={interest}
                  variant="secondary"
                  className="bg-white/10 text-white border-0"
                >
                  {interest}
                </Badge>
              ))}
              {profile.interests.length > 5 && (
                <Badge variant="secondary" className="bg-white/10 text-white border-0">
                  +{profile.interests.length - 5}
                </Badge>
              )}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
