"use client";

import { useEffect, useMemo } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";

interface Profile {
  id: string;
  userId: string;
  firstName: string;
  profilePhoto?: string;
  photos: string[];
}

interface Match {
  matchId: string;
  profile: Profile;
}

interface MatchModalProps {
  match: Match | null;
  onClose: () => void;
}

// Pre-generate confetti data to avoid Math.random during render
function generateConfettiData() {
  return [...Array(20)].map((_, i) => ({
    id: i,
    x: Math.random() * 300 - 150,
    scale: Math.random() * 0.5 + 0.5,
    rotate: Math.random() * 360,
    duration: 2 + Math.random(),
    delay: Math.random() * 0.5,
    backgroundColor: ["#ec4899", "#f43f5e", "#8b5cf6", "#3b82f6"][Math.floor(Math.random() * 4)],
    borderRadius: Math.random() > 0.5 ? "50%" : "0",
  }));
}

export function MatchModal({ match, onClose }: MatchModalProps) {
  const router = useRouter();
  
  // Generate confetti data once and memoize it
  const confettiData = useMemo(() => generateConfettiData(), []);

  useEffect(() => {
    if (match) {
      // Play a sound or haptic feedback here if desired
    }
  }, [match]);

  if (!match) return null;

  const profilePhoto = match.profile.photos?.[0] || match.profile.profilePhoto;

  const handleSendMessage = () => {
    router.push(`/app/chat/${match.matchId}`);
    onClose();
  };

  return (
    <Dialog open={!!match} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="bg-transparent border-0 shadow-none max-w-md">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.8, opacity: 0 }}
          className="bg-gradient-to-b from-[#1a1a2e] to-[#0f0d23] rounded-3xl p-8 text-center"
        >
          {/* Confetti effect */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {confettiData.map((confetti) => (
              <motion.div
                key={confetti.id}
                initial={{ 
                  y: -20, 
                  x: confetti.x,
                  opacity: 1,
                  scale: confetti.scale
                }}
                animate={{ 
                  y: 400,
                  opacity: 0,
                  rotate: confetti.rotate
                }}
                transition={{ 
                  duration: confetti.duration,
                  delay: confetti.delay,
                  ease: "easeOut"
                }}
                className="absolute top-0 left-1/2"
                style={{
                  width: 10,
                  height: 10,
                  backgroundColor: confetti.backgroundColor,
                  borderRadius: confetti.borderRadius,
                }}
              />
            ))}
          </div>

          {/* Match hearts animation */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", delay: 0.2 }}
            className="relative w-32 h-32 mx-auto mb-6"
          >
            <motion.div
              animate={{ 
                scale: [1, 1.2, 1],
              }}
              transition={{ 
                repeat: Infinity,
                duration: 1.5,
              }}
              className="absolute inset-0 flex items-center justify-center"
            >
              <span className="text-6xl">💕</span>
            </motion.div>
          </motion.div>

          {/* Title */}
          <motion.h2
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-3xl font-bold bg-gradient-to-r from-pink-500 to-rose-500 bg-clip-text text-transparent mb-2"
          >
            It&apos;s a Match!
          </motion.h2>

          <motion.p
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="text-gray-400 mb-8"
          >
            You and {match.profile.firstName} liked each other
          </motion.p>

          {/* Profile photo */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="relative w-24 h-24 mx-auto mb-8 rounded-full overflow-hidden ring-4 ring-pink-500/50"
          >
            {profilePhoto ? (
              <Image
                src={profilePhoto}
                alt={match.profile.firstName}
                fill
                className="object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-pink-500 to-purple-500 flex items-center justify-center">
                <span className="text-3xl">👤</span>
              </div>
            )}
          </motion.div>

          {/* Buttons */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="space-y-3"
          >
            <Button
              onClick={handleSendMessage}
              className="w-full h-12 bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white font-semibold"
            >
              Send a Message
            </Button>
            <Button
              variant="ghost"
              onClick={onClose}
              className="w-full h-12 text-gray-400 hover:text-white hover:bg-white/5"
            >
              Keep Swiping
            </Button>
          </motion.div>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
}
