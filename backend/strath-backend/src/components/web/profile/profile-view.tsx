"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

interface Profile {
  id: string;
  userId: string;
  firstName: string;
  lastName?: string | null;
  age: number | null;
  bio?: string | null;
  profilePhoto?: string | null;
  photos: string[] | null;
  course?: string | null;
  yearOfStudy?: number | string | null;
  interests: string[] | null;
  university?: string | null;
  profileCompleted?: boolean | null;
}

interface User {
  id: string;
  name: string;
  email: string;
  image?: string | null;
}

interface ProfileViewProps {
  user: User;
  profile: Profile;
  isOwnProfile?: boolean;
}

const EditIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/>
  </svg>
);

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

const SettingsIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/>
  </svg>
);

const ChevronRightSmallIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m9 18 6-6-6-6"/>
  </svg>
);

export function ProfileView({ user, profile, isOwnProfile }: ProfileViewProps) {
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);

  // Safely create photos array
  const photos: string[] = profile.photos && profile.photos.length > 0 
    ? profile.photos 
    : profile.profilePhoto 
      ? [profile.profilePhoto] 
      : [];
  
  // Safely get interests array
  const interests: string[] = profile.interests ?? [];

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

  return (
    <div className="max-w-2xl mx-auto p-6">
      {/* Header */}
      {isOwnProfile && (
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-white">My Profile</h1>
          <Link href="/app/profile/edit">
            <Button className="bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600">
              <EditIcon />
              <span className="ml-2">Edit Profile</span>
            </Button>
          </Link>
        </div>
      )}

      {/* Profile Card */}
      <Card className="bg-[#1a1a2e] border-white/10 overflow-hidden">
        {/* Photo Section */}
        <div className="relative aspect-[3/4] max-h-[500px]">
          {photos.length > 0 ? (
            <Image
              src={photos[currentPhotoIndex]}
              alt={profile.firstName}
              fill
              className="object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-pink-500/20 to-purple-500/20 flex items-center justify-center">
              <span className="text-8xl">👤</span>
            </div>
          )}

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
          {photos.length > 1 && (
            <>
              <button
                onClick={prevPhoto}
                className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-black/20 hover:bg-black/40 rounded-full flex items-center justify-center text-white transition-colors"
                disabled={currentPhotoIndex === 0}
              >
                <ChevronLeftIcon />
              </button>
              <button
                onClick={nextPhoto}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-black/20 hover:bg-black/40 rounded-full flex items-center justify-center text-white transition-colors"
                disabled={currentPhotoIndex === photos.length - 1}
              >
                <ChevronRightIcon />
              </button>
            </>
          )}

          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#1a1a2e] via-transparent to-transparent" />
        </div>

        {/* Profile Info */}
        <div className="p-6 -mt-20 relative">
          <div className="flex items-end justify-between mb-4">
            <div>
              <h2 className="text-3xl font-bold text-white">
                {profile.firstName}
                {profile.lastName ? ` ${profile.lastName}` : ""},{" "}
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
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-2">
                About
              </h3>
              <p className="text-gray-200">{profile.bio}</p>
            </div>
          )}

          {/* Interests */}
          {interests.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
                Interests
              </h3>
              <div className="flex flex-wrap gap-2">
                {interests.map((interest) => (
                  <Badge
                    key={interest}
                    variant="secondary"
                    className="bg-white/10 text-white border-0 px-3 py-1"
                  >
                    {interest}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Account Info (only for own profile) */}
      {isOwnProfile && (
        <div className="mt-6 space-y-4">
          <Card className="bg-[#1a1a2e] border-white/10 p-4">
            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
              Account
            </h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Email</span>
                <span className="text-white">{user.email}</span>
              </div>
            </div>
          </Card>

          <Link href="/app/settings" className="block">
            <Card className="bg-[#1a1a2e] border-white/10 p-4 hover:bg-white/5 transition-all cursor-pointer group">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-500/20 to-rose-500/20 flex items-center justify-center text-pink-400 group-hover:from-pink-500/30 group-hover:to-rose-500/30 transition-colors">
                    <SettingsIcon />
                  </div>
                  <div>
                    <span className="text-white font-medium">Settings</span>
                    <p className="text-gray-500 text-xs">Privacy, notifications & more</p>
                  </div>
                </div>
                <ChevronRightSmallIcon />
              </div>
            </Card>
          </Link>
        </div>
      )}
    </div>
  );
}
