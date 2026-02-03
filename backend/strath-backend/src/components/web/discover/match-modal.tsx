"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent ,DialogTitle} from "@/components/ui/dialog";
import { toast } from "@/components/ui/custom-toast";

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
  currentUserPhoto?: string | null;
  onClose: () => void;
}

// Valentine's themed confetti with hearts
function generateConfettiData() {
  return [...Array(50)].map((_, i) => ({
    id: i,
    x: Math.random() * 400 - 200,
    scale: Math.random() * 0.6 + 0.4,
    rotate: Math.random() * 720 - 360,
    duration: 3 + Math.random() * 2,
    delay: Math.random() * 0.8,
    type: Math.random() > 0.6 ? "heart" : "confetti",
    backgroundColor: ["#ec4899", "#f43f5e", "#ff6b9d", "#ff85a1", "#ffc2d1", "#ff4d6d"][Math.floor(Math.random() * 6)],
    size: Math.random() * 8 + 6,
  }));
}

// Floating hearts animation data
function generateFloatingHearts() {
  return [...Array(12)].map((_, i) => ({
    id: i,
    x: Math.random() * 300 - 150,
    delay: Math.random() * 2,
    duration: 3 + Math.random() * 2,
    size: Math.random() * 16 + 12,
    opacity: Math.random() * 0.4 + 0.2,
  }));
}

// Quick message suggestions
const quickMessages = [
  "Hey cutie! 💕",
  "You caught my eye 👀✨",
  "Let's grab coffee? ☕",
  "Hi there! 😊",
  "Finally matched! 🎉",
];

export function MatchModal({ match, currentUserPhoto, onClose }: MatchModalProps) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [showInput, setShowInput] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  
  // Generate animation data once
  const confettiData = useMemo(() => generateConfettiData(), []);
  const floatingHearts = useMemo(() => generateFloatingHearts(), []);

  useEffect(() => {
    if (match) {
      // Vibration feedback on supported devices
      if (navigator.vibrate) {
        navigator.vibrate([100, 50, 100, 50, 200]);
      }
    }
  }, [match]);

  useEffect(() => {
    if (showInput && inputRef.current) {
      inputRef.current.focus();
    }
  }, [showInput]);

  if (!match) return null;

  const profilePhoto = match.profile.photos?.[0] || match.profile.profilePhoto;

  const handleSendMessage = async (text?: string) => {
    const messageToSend = text || message.trim();
    if (!messageToSend) {
      setShowInput(true);
      return;
    }

    setIsSending(true);
    try {
      const response = await fetch(`/api/messages/${match.matchId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: messageToSend }),
      });

      if (response.ok) {
        toast.success("Message sent!", `Your message to ${match.profile.firstName} was delivered 💌`);
        router.push(`/app/chat/${match.matchId}`);
        onClose();
      } else {
        throw new Error("Failed to send");
      }
    } catch {
      toast.error("Couldn't send message", "Don't worry, you can message them from chat!");
      router.push(`/app/chat/${match.matchId}`);
      onClose();
    } finally {
      setIsSending(false);
    }
  };

  const handleGoToChat = () => {
    router.push(`/app/chat/${match.matchId}`);
    onClose();
  };

  return (
    <Dialog open={!!match} onOpenChange={(open) => !open && onClose()}>
      <DialogTitle></DialogTitle>
      <DialogContent className="bg-transparent border-0 shadow-none p-0 max-w-[95vw] md:max-w-lg overflow-visible">
        <motion.div
          initial={{ scale: 0.5, opacity: 0, y: 50 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.8, opacity: 0, y: -20 }}
          transition={{ type: "spring", damping: 20, stiffness: 300 }}
          className="relative bg-gradient-to-b from-[#1f1035] via-[#1a1a2e] to-[#0f0d23] rounded-3xl p-4 md:p-8 text-center overflow-hidden"
        >
          {/* Animated gradient background */}
          <motion.div
            className="absolute inset-0 opacity-30"
            animate={{
              background: [
                "radial-gradient(circle at 20% 20%, #ec4899 0%, transparent 50%)",
                "radial-gradient(circle at 80% 80%, #f43f5e 0%, transparent 50%)",
                "radial-gradient(circle at 50% 50%, #ec4899 0%, transparent 50%)",
                "radial-gradient(circle at 20% 20%, #ec4899 0%, transparent 50%)",
              ],
            }}
            transition={{ duration: 5, repeat: Infinity, ease: "linear" }}
          />

          {/* Sparkle particles */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {[...Array(20)].map((_, i) => (
              <motion.div
                key={`sparkle-${i}`}
                className="absolute w-1 h-1 bg-white rounded-full"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                }}
                animate={{
                  opacity: [0, 1, 0],
                  scale: [0, 1.5, 0],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  delay: Math.random() * 2,
                }}
              />
            ))}
          </div>

          {/* Confetti explosion */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {confettiData.map((item) => (
              <motion.div
                key={item.id}
                initial={{ 
                  y: "50%", 
                  x: "50%",
                  opacity: 1,
                  scale: 0
                }}
                animate={{ 
                  y: [0, -100, 400],
                  x: item.x,
                  opacity: [1, 1, 0],
                  scale: item.scale,
                  rotate: item.rotate
                }}
                transition={{ 
                  duration: item.duration,
                  delay: item.delay,
                  ease: [0.25, 0.46, 0.45, 0.94]
                }}
                className="absolute left-1/2 top-1/2"
                style={{
                  width: item.size,
                  height: item.size,
                  backgroundColor: item.type === "confetti" ? item.backgroundColor : "transparent",
                  borderRadius: item.type === "confetti" ? "2px" : "0",
                }}
              >
                {item.type === "heart" && (
                  <span style={{ fontSize: item.size, color: item.backgroundColor }}>💗</span>
                )}
              </motion.div>
            ))}
          </div>

          {/* Floating hearts background */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {floatingHearts.map((heart) => (
              <motion.div
                key={`float-${heart.id}`}
                className="absolute text-pink-500"
                style={{
                  left: `${50 + heart.x / 3}%`,
                  fontSize: heart.size,
                  opacity: heart.opacity,
                }}
                initial={{ y: "100%", opacity: 0 }}
                animate={{ 
                  y: "-100%", 
                  opacity: [0, heart.opacity, heart.opacity, 0],
                  x: [0, heart.x / 4, -heart.x / 4, 0]
                }}
                transition={{
                  duration: heart.duration,
                  delay: heart.delay,
                  repeat: Infinity,
                  ease: "linear"
                }}
              >
                💕
              </motion.div>
            ))}
          </div>

          {/* Close button */}
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            onClick={onClose}
            className="absolute top-3 right-3 md:top-4 md:right-4 w-8 h-8 md:w-10 md:h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors z-20 active:scale-95"
          >
            <svg className="w-4 h-4 md:w-5 md:h-5 text-white/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </motion.button>

          {/* Main content */}
          <div className="relative z-10">
            {/* Two profile photos with overlap */}
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", damping: 15, stiffness: 200, delay: 0.1 }}
              className="flex items-center justify-center mb-4 md:mb-6"
            >
              <div className="flex items-center -space-x-6 md:-space-x-8">
                {/* Current user photo */}
                <motion.div
                  initial={{ x: -50, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.3, type: "spring" }}
                  className="relative w-20 h-20 md:w-28 md:h-28 rounded-full overflow-hidden ring-4 ring-pink-500 shadow-lg shadow-pink-500/30 z-10"
                >
                  {currentUserPhoto ? (
                    <Image
                      src={currentUserPhoto}
                      alt="You"
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                      <span className="text-2xl md:text-3xl">😊</span>
                    </div>
                  )}
                </motion.div>

                {/* Heart connector */}
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: [0, 1.3, 1] }}
                  transition={{ delay: 0.5, duration: 0.5 }}
                  className="absolute left-1/2 -translate-x-1/2 z-20 bg-gradient-to-r from-pink-500 to-rose-500 rounded-full p-2 md:p-3 shadow-lg"
                >
                  <motion.span
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ repeat: Infinity, duration: 0.8 }}
                    className="text-lg md:text-2xl block"
                  >
                    💘
                  </motion.span>
                </motion.div>

                {/* Match photo */}
                <motion.div
                  initial={{ x: 50, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.3, type: "spring" }}
                  className="relative w-20 h-20 md:w-28 md:h-28 rounded-full overflow-hidden ring-4 ring-rose-500 shadow-lg shadow-rose-500/30"
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
                      <span className="text-2xl md:text-3xl">{match.profile.firstName[0]}</span>
                    </div>
                  )}
                </motion.div>
              </div>
            </motion.div>

            {/* Title with glow */}
            <motion.div
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.4, type: "spring" }}
              className="mb-2"
            >
              <h2 className="text-3xl md:text-4xl font-black">
                <span className="bg-gradient-to-r from-pink-400 via-rose-400 to-pink-400 bg-clip-text text-transparent drop-shadow-[0_0_25px_rgba(236,72,153,0.5)]">
                  It&apos;s a Match!
                </span>
              </h2>
              <motion.div
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ repeat: Infinity, duration: 2 }}
                className="flex justify-center gap-1 mt-1"
              >
                <span>✨</span>
                <span>💕</span>
                <span>✨</span>
              </motion.div>
            </motion.div>

            <motion.p
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="text-gray-300 mb-4 md:mb-6 text-sm md:text-base"
            >
              You and <span className="text-pink-400 font-semibold">{match.profile.firstName}</span> both swiped right! 💗
            </motion.p>

            {/* Quick message input */}
            <AnimatePresence mode="wait">
              {showInput ? (
                <motion.div
                  key="input"
                  initial={{ opacity: 0, y: 20, height: 0 }}
                  animate={{ opacity: 1, y: 0, height: "auto" }}
                  exit={{ opacity: 0, y: -10, height: 0 }}
                  className="mb-4"
                >
                  <div className="relative">
                    <input
                      ref={inputRef}
                      type="text"
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
                      placeholder="Type a sweet message..."
                      className="w-full px-4 py-3 md:py-4 bg-white/10 border border-pink-500/30 rounded-2xl text-white placeholder:text-gray-400 focus:outline-none focus:border-pink-500 focus:ring-2 focus:ring-pink-500/20 text-sm md:text-base"
                      disabled={isSending}
                    />
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => handleSendMessage()}
                      disabled={isSending || !message.trim()}
                      className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 md:w-10 md:h-10 rounded-full bg-gradient-to-r from-pink-500 to-rose-500 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isSending ? (
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                          className="w-4 h-4 border-2 border-white border-t-transparent rounded-full"
                        />
                      ) : (
                        <svg className="w-4 h-4 md:w-5 md:h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                        </svg>
                      )}
                    </motion.button>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="suggestions"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ delay: 0.6 }}
                  className="mb-4 md:mb-6"
                >
                  <p className="text-gray-400 text-xs md:text-sm mb-2 md:mb-3">Send a quick message to break the ice 💬</p>
                  <div className="flex flex-wrap justify-center gap-1.5 md:gap-2">
                    {quickMessages.map((msg, i) => (
                      <motion.button
                        key={msg}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.7 + i * 0.1 }}
                        whileHover={{ scale: 1.05, y: -2 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handleSendMessage(msg)}
                        disabled={isSending}
                        className="px-3 py-1.5 md:px-4 md:py-2 bg-white/10 hover:bg-pink-500/20 border border-pink-500/30 hover:border-pink-500/50 rounded-full text-xs md:text-sm text-white transition-all disabled:opacity-50"
                      >
                        {msg}
                      </motion.button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Action buttons */}
            <motion.div
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.8 }}
              className="space-y-2 md:space-y-3"
            >
              {!showInput && (
                <Button
                  onClick={() => setShowInput(true)}
                  className="w-full h-11 md:h-14 bg-gradient-to-r from-pink-500 via-rose-500 to-pink-500 hover:from-pink-600 hover:via-rose-600 hover:to-pink-600 text-white font-bold text-sm md:text-base rounded-2xl shadow-lg shadow-pink-500/30 active:scale-[0.98] transition-transform"
                >
                  <span className="mr-2">✉️</span>
                  Write Custom Message
                </Button>
              )}
              
              <Button
                onClick={handleGoToChat}
                variant={showInput ? "default" : "ghost"}
                className={`w-full h-10 md:h-12 font-semibold text-sm md:text-base rounded-2xl active:scale-[0.98] transition-transform ${
                  showInput 
                    ? "bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white" 
                    : "text-gray-300 hover:text-white hover:bg-white/10"
                }`}
              >
                {showInput ? (
                  <>
                    <span className="mr-2">💬</span>
                    Go to Chat
                  </>
                ) : (
                  <>
                    <span className="mr-2">💬</span>
                    Open Chat
                  </>
                )}
              </Button>

              <Button
                variant="ghost"
                onClick={onClose}
                className="w-full h-9 md:h-10 text-gray-400 hover:text-white hover:bg-white/5 text-xs md:text-sm rounded-xl"
              >
                Keep Exploring 🔥
              </Button>
            </motion.div>
          </div>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
}
