"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useNotificationCounts } from "@/hooks/use-notification-counts";

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

interface Message {
  id: string;
  content: string;
  senderId: string;
  createdAt: string;
  read: boolean;
}

interface PartnerProfile {
  firstName?: string;
  lastName?: string;
  profilePhoto?: string;
  photos?: string[];
  course?: string;
  age?: number;
  bio?: string;
  university?: string;
  yearOfStudy?: number;
  interests?: string[];
  lookingFor?: string;
  height?: string;
  zodiacSign?: string;
  smoking?: string;
  workoutFrequency?: string;
  instagram?: string;
  spotify?: string;
  qualities?: string[];
  prompts?: { promptId: string; response: string }[];
}

interface Partner {
  id: string;
  name?: string;
  image?: string;
  profile?: PartnerProfile;
}

interface MatchData {
  id: string;
  partner?: Partner;
  profile?: PartnerProfile & { userId: string };
  messages?: Message[];
  lastMessage?: Message | null;
  createdAt?: string;
}

export default function ChatPage() {
  const params = useParams();
  const router = useRouter();
  const matchId = params.matchId as string;

  const [matchData, setMatchData] = useState<MatchData | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string>("");
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [showMobileProfile, setShowMobileProfile] = useState(false);
  
  // Modal states
  const [showUnmatchModal, setShowUnmatchModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [selectedReportReason, setSelectedReportReason] = useState<string | null>(null);
  const [customReportReason, setCustomReportReason] = useState("");
  const [reportDetails, setReportDetails] = useState("");
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);
  const [isUnmatching, setIsUnmatching] = useState(false);
  const [isBlocking, setIsBlocking] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const fetchCurrentUser = useCallback(async () => {
    try {
      const response = await fetch("/api/user/me");
      const data = await response.json();
      if (data.success) {
        setCurrentUserId(data.data.user.id);
      }
    } catch (error) {
      console.error("Failed to fetch user:", error);
    }
  }, []);

  const fetchMatchData = useCallback(async () => {
    try {
      const response = await fetch(`/api/matches/${matchId}`);
      const data = await response.json();
      if (data.success) {
        const matchInfo = data.data?.match || data.data;
        setMatchData(matchInfo);
        setMessages(matchInfo?.messages || []);
      }
    } catch (error) {
      console.error("Failed to fetch match:", error);
    } finally {
      setIsLoading(false);
    }
  }, [matchId]);

  const fetchMessages = useCallback(async () => {
    try {
      const response = await fetch(`/api/messages/${matchId}`);
      const data = await response.json();
      if (data.success) {
        setMessages(data.data || []);
      }
    } catch (error) {
      console.error("Failed to fetch messages:", error);
    }
  }, [matchId]);

  // Get the invalidate function from notification counts hook
  const { invalidate: invalidateNotificationCounts } = useNotificationCounts();

  // Track if we've already marked as read (to prevent infinite loops)
  const hasMarkedAsRead = useRef(false);

  // Mark messages as read and match as opened when chat loads (only once)
  useEffect(() => {
    if (hasMarkedAsRead.current) return;
    hasMarkedAsRead.current = true;

    const markAsReadAndOpened = async () => {
      try {
        // Mark messages as read
        await fetch(`/api/messages/${matchId}/read`, { method: "PATCH" });
        // Mark match as opened
        await fetch(`/api/matches/${matchId}/opened`, { method: "PATCH" });
        // Invalidate notification counts to update badges
        invalidateNotificationCounts();
      } catch (error) {
        console.error("Failed to mark as read/opened:", error);
      }
    };

    markAsReadAndOpened();
  }, [matchId, invalidateNotificationCounts]);

  useEffect(() => {
    fetchMatchData();
    fetchCurrentUser();
    const interval = setInterval(fetchMessages, 3000);
    return () => clearInterval(interval);
  }, [matchId, fetchMatchData, fetchCurrentUser, fetchMessages]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || isSending) return;

    setIsSending(true);
    try {
      const response = await fetch(`/api/messages/${matchId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: newMessage.trim() }),
      });
      const data = await response.json();
      if (data.success) {
        setMessages((prev) => [...prev, data.data]);
        setNewMessage("");
      }
    } catch (error) {
      console.error("Failed to send message:", error);
    } finally {
      setIsSending(false);
    }
  };

  const handleUnmatch = async () => {
    setIsUnmatching(true);
    try {
      const response = await fetch(`/api/matches/${matchId}`, { method: "DELETE" });
      const data = await response.json();
      if (data.success) {
        setSuccessMessage("Successfully unmatched");
        setTimeout(() => {
          router.push("/app/matches");
        }, 1500);
      } else {
        setShowUnmatchModal(false);
        alert(data.error || "Failed to unmatch");
      }
    } catch (error) {
      console.error("Failed to unmatch:", error);
      setShowUnmatchModal(false);
    } finally {
      setIsUnmatching(false);
    }
  };

  const getPartnerId = () => {
    return matchData?.partner?.id || matchData?.profile?.userId || "";
  };

  const handleReport = async () => {
    const reason = selectedReportReason === "other" ? customReportReason : selectedReportReason;
    if (!reason) return;

    setIsSubmittingReport(true);
    try {
      const response = await fetch("/api/user/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reportedUserId: getPartnerId(),
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

  const handleBlock = async () => {
    setIsBlocking(true);
    try {
      const response = await fetch("/api/user/block", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          blockedUserId: getPartnerId(),
        }),
      });
      const data = await response.json();
      if (data.success) {
        setSuccessMessage("User blocked successfully");
        setTimeout(() => {
          router.push("/app/matches");
        }, 1500);
      } else {
        setShowBlockModal(false);
        alert(data.error || "Failed to block user");
      }
    } catch (error) {
      console.error("Failed to block:", error);
      setShowBlockModal(false);
    } finally {
      setIsBlocking(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-screen bg-[#0f0d23]">
        <div className="flex-1 flex flex-col">
          <div className="p-4 border-b border-white/10">
            <Skeleton className="h-10 w-48 bg-white/10" />
          </div>
          <div className="flex-1 p-4 space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton
                key={i}
                className={`h-16 ${i % 2 === 0 ? "w-2/3" : "w-1/2 ml-auto"} bg-white/10 rounded-2xl`}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!matchData) {
    return (
      <div className="flex h-screen bg-[#0f0d23] items-center justify-center">
        <div className="text-center">
          <p className="text-white text-lg mb-4">Match not found</p>
          <Button
            onClick={() => router.push("/app/matches")}
            className="bg-pink-500 hover:bg-pink-600"
          >
            Back to Matches
          </Button>
        </div>
      </div>
    );
  }

  // Extract partner info
  const partnerProfile = matchData.partner?.profile || matchData.profile;
  const partnerName = partnerProfile?.firstName || matchData.partner?.name || "Match";
  const partnerFullName = `${partnerProfile?.firstName || ""} ${partnerProfile?.lastName || ""}`.trim() || partnerName;
  const profilePhoto = partnerProfile?.profilePhoto || matchData.partner?.image;
  const partnerAge = partnerProfile?.age;
  const partnerBio = partnerProfile?.bio;
  const partnerCourse = partnerProfile?.course;
  const partnerUniversity = partnerProfile?.university;
  const partnerYearOfStudy = partnerProfile?.yearOfStudy;
  const partnerInterests = partnerProfile?.interests || [];
  const partnerLookingFor = partnerProfile?.lookingFor;
  const partnerHeight = partnerProfile?.height;
  const partnerZodiac = partnerProfile?.zodiacSign;
  const partnerSmoking = partnerProfile?.smoking;
  const partnerWorkout = partnerProfile?.workoutFrequency;
  const partnerInstagram = partnerProfile?.instagram;
  const partnerSpotify = partnerProfile?.spotify;
  const partnerQualities = partnerProfile?.qualities || [];
  const partnerPrompts = partnerProfile?.prompts || [];
  const allPhotos = partnerProfile?.photos || (profilePhoto ? [profilePhoto] : []);
  const matchDate = matchData.createdAt
    ? new Date(matchData.createdAt).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      })
    : "";

  const nextPhoto = () => {
    if (allPhotos.length > 0) {
      setCurrentPhotoIndex((prev) => (prev + 1) % allPhotos.length);
    }
  };

  const prevPhoto = () => {
    if (allPhotos.length > 0) {
      setCurrentPhotoIndex((prev) => (prev - 1 + allPhotos.length) % allPhotos.length);
    }
  };

  return (
    <div className="flex h-screen bg-[#0f0d23] overflow-hidden">
      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="shrink-0 flex items-center justify-between p-3 md:p-4 border-b border-white/10 bg-[#1a1a2e]/80 backdrop-blur-lg">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="text-gray-400 hover:text-white w-10 h-10"
              onClick={() => router.push("/app/matches")}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="m12 19-7-7 7-7" />
                <path d="M19 12H5" />
              </svg>
            </Button>

            <button
              onClick={() => setShowMobileProfile(true)}
              className="flex items-center gap-3"
            >
              <div className="w-10 h-10 rounded-full overflow-hidden ring-2 ring-pink-500/30">
                {profilePhoto ? (
                  <Image
                    src={profilePhoto}
                    alt={partnerName}
                    width={40}
                    height={40}
                    className="object-cover w-full h-full"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-pink-500 to-purple-500 flex items-center justify-center">
                    <span className="text-lg">👤</span>
                  </div>
                )}
              </div>
              <div className="text-left">
                <h2 className="font-semibold text-white text-sm md:text-base">{partnerName}</h2>
                <p className="text-xs text-gray-400">
                  {matchDate ? `Matched ${matchDate}` : partnerCourse || ""}
                </p>
              </div>
            </button>
          </div>

          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden text-gray-400 hover:text-white w-10 h-10"
              onClick={() => setShowMobileProfile(true)}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="text-gray-400 hover:text-white w-10 h-10">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="1" />
                    <circle cx="12" cy="5" r="1" />
                    <circle cx="12" cy="19" r="1" />
                  </svg>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-[#1a1a2e] border-white/10">
                <DropdownMenuItem
                  className="text-gray-300 focus:text-white focus:bg-white/10"
                  onClick={() => setShowUnmatchModal(true)}
                >
                  💔 Unmatch
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="text-gray-300 focus:text-white focus:bg-white/10"
                  onClick={() => setShowBlockModal(true)}
                >
                  🚫 Block
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-white/10" />
                <DropdownMenuItem 
                  className="text-red-400 focus:text-red-300 focus:bg-white/10"
                  onClick={() => setShowReportModal(true)}
                >
                  ⚠️ Report
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Messages Area - This scrolls */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Match Header */}
          <div className="flex flex-col items-center py-8">
            <div className="w-20 h-20 rounded-full overflow-hidden ring-4 ring-pink-500/30 mb-4">
              {profilePhoto ? (
                <Image
                  src={profilePhoto}
                  alt={partnerName}
                  width={80}
                  height={80}
                  className="object-cover w-full h-full"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-pink-500 to-purple-500 flex items-center justify-center">
                  <span className="text-3xl">👤</span>
                </div>
              )}
            </div>
            <h3 className="text-lg font-semibold text-white mb-1">
              You matched with {partnerName}!
            </h3>
            <p className="text-sm text-gray-400">{matchDate || "Start the conversation 💬"}</p>
          </div>

          {/* Message Bubbles */}
          {messages.map((message, idx) => {
            const isOwn = message.senderId === currentUserId;
            const showDate =
              idx === 0 ||
              new Date(message.createdAt).toDateString() !==
                new Date(messages[idx - 1].createdAt).toDateString();

            return (
              <div key={message.id}>
                {showDate && (
                  <div className="text-center my-4">
                    <span className="text-xs text-gray-500 bg-white/5 px-3 py-1 rounded-full">
                      {formatDate(message.createdAt)}
                    </span>
                  </div>
                )}
                <div className={`flex ${isOwn ? "justify-end" : "justify-start"} items-end gap-2`}>
                  {!isOwn && (
                    <div className="w-7 h-7 rounded-full overflow-hidden shrink-0">
                      {profilePhoto ? (
                        <Image
                          src={profilePhoto}
                          alt={partnerName}
                          width={28}
                          height={28}
                          className="object-cover w-full h-full"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-pink-500 to-purple-500 flex items-center justify-center text-xs">
                          👤
                        </div>
                      )}
                    </div>
                  )}
                  <div
                    className={`max-w-[75%] px-4 py-2.5 rounded-2xl ${
                      isOwn
                        ? "bg-gradient-to-r from-pink-500 to-rose-500 text-white rounded-br-md"
                        : "bg-white/10 text-white rounded-bl-md"
                    }`}
                  >
                    <p className="text-sm leading-relaxed">{message.content}</p>
                    <p className={`text-[10px] mt-1 ${isOwn ? "text-pink-100 text-right" : "text-gray-500"}`}>
                      {formatTime(message.createdAt)}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        {/* Message Input - Fixed at bottom */}
        <div className="shrink-0 p-3 md:p-4 border-t border-white/10 bg-[#1a1a2e]/80 backdrop-blur-lg">
          <form onSubmit={sendMessage} className="flex items-center gap-3">
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type a message..."
              className="flex-1 bg-white/5 border-white/10 text-white placeholder:text-gray-500 h-11 rounded-full px-5"
            />
            <Button
              type="submit"
              disabled={!newMessage.trim() || isSending}
              className="h-11 px-6 rounded-full bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 disabled:opacity-50 font-semibold"
            >
              Send
            </Button>
          </form>
        </div>
      </div>

      {/* Desktop Profile Sidebar - Scrolls independently */}
      <aside className="hidden lg:flex flex-col w-[380px] xl:w-[420px] h-screen border-l border-white/10 bg-[#0f0d23]">
        {/* Fixed Header */}
        <div className="shrink-0 p-4 border-b border-white/10">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-white">{partnerFullName}</h2>
            {partnerAge && <span className="text-xl text-white">{partnerAge}</span>}
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto">
          {/* Photo Carousel */}
          <div className="relative aspect-[3/4] bg-black">
            {allPhotos.length > 0 ? (
              <>
                <Image
                  src={allPhotos[currentPhotoIndex] || profilePhoto || ""}
                  alt={partnerName}
                  fill
                  className="object-cover"
                />
                {allPhotos.length > 1 && (
                  <>
                    <div className="absolute top-3 left-0 right-0 flex justify-center gap-1 px-4">
                      {allPhotos.map((_, idx) => (
                        <div
                          key={idx}
                          className={`h-1 flex-1 max-w-12 rounded-full transition-all ${
                            idx === currentPhotoIndex ? "bg-white" : "bg-white/40"
                          }`}
                        />
                      ))}
                    </div>
                    <button
                      onClick={prevPhoto}
                      className="absolute left-0 top-0 bottom-0 w-1/3 flex items-center pl-2"
                    >
                      <div className="w-8 h-8 rounded-full bg-black/30 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                          <path d="m15 18-6-6 6-6" />
                        </svg>
                      </div>
                    </button>
                    <button
                      onClick={nextPhoto}
                      className="absolute right-0 top-0 bottom-0 w-1/3 flex items-center justify-end pr-2"
                    >
                      <div className="w-8 h-8 rounded-full bg-black/30 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                          <path d="m9 18 6-6-6-6" />
                        </svg>
                      </div>
                    </button>
                  </>
                )}
              </>
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-pink-500 to-purple-500 flex items-center justify-center">
                <span className="text-6xl">👤</span>
              </div>
            )}
          </div>

          {/* Profile Info */}
          <div className="p-4 space-y-6 pb-8">
            {partnerLookingFor && (
              <div className="space-y-2">
                <p className="text-gray-400 text-sm">Looking for</p>
                <div className="flex items-center gap-2 bg-white/5 rounded-xl p-3">
                  <span className="text-xl">🥰</span>
                  <span className="text-white font-medium">{partnerLookingFor}</span>
                </div>
              </div>
            )}

            <div className="space-y-3">
              <p className="text-gray-400 text-sm">Essentials</p>
              <div className="flex flex-wrap gap-2">
                {partnerUniversity && (
                  <span className="px-3 py-1.5 bg-white/5 rounded-full text-sm text-white">
                    🎓 {partnerUniversity}
                  </span>
                )}
                {partnerCourse && (
                  <span className="px-3 py-1.5 bg-white/5 rounded-full text-sm text-white">
                    📚 {partnerCourse}
                  </span>
                )}
                {partnerYearOfStudy && (
                  <span className="px-3 py-1.5 bg-white/5 rounded-full text-sm text-white">
                    📅 Year {partnerYearOfStudy}
                  </span>
                )}
                {partnerHeight && (
                  <span className="px-3 py-1.5 bg-white/5 rounded-full text-sm text-white">
                    📏 {partnerHeight}
                  </span>
                )}
                {partnerZodiac && (
                  <span className="px-3 py-1.5 bg-white/5 rounded-full text-sm text-white">
                    ♈ {partnerZodiac}
                  </span>
                )}
              </div>
            </div>

            {(partnerSmoking || partnerWorkout) && (
              <div className="space-y-3">
                <p className="text-gray-400 text-sm">Lifestyle</p>
                <div className="flex flex-wrap gap-2">
                  {partnerSmoking && (
                    <span className="px-3 py-1.5 bg-white/5 rounded-full text-sm text-white">
                      🚬 {partnerSmoking === "no" ? "Non-smoker" : partnerSmoking === "yes" ? "Smoker" : "Social smoker"}
                    </span>
                  )}
                  {partnerWorkout && (
                    <span className="px-3 py-1.5 bg-white/5 rounded-full text-sm text-white">
                      💪 {partnerWorkout}
                    </span>
                  )}
                </div>
              </div>
            )}

            {partnerBio && (
              <div className="space-y-2">
                <p className="text-gray-400 text-sm">About</p>
                <p className="text-white text-sm leading-relaxed">{partnerBio}</p>
              </div>
            )}

            {partnerQualities.length > 0 && (
              <div className="space-y-3">
                <p className="text-gray-400 text-sm">My qualities</p>
                <div className="flex flex-wrap gap-2">
                  {partnerQualities.map((quality, idx) => (
                    <span
                      key={idx}
                      className="px-3 py-1.5 bg-pink-500/20 border border-pink-500/30 rounded-full text-sm text-pink-300"
                    >
                      {quality}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {partnerInterests.length > 0 && (
              <div className="space-y-3">
                <p className="text-gray-400 text-sm">Interests</p>
                <div className="flex flex-wrap gap-2">
                  {partnerInterests.map((interest, idx) => (
                    <span
                      key={idx}
                      className="px-3 py-1.5 bg-purple-500/20 border border-purple-500/30 rounded-full text-sm text-purple-300"
                    >
                      {interest}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {partnerPrompts.length > 0 && (
              <div className="space-y-4">
                {partnerPrompts.map((prompt, idx) => (
                  <div key={idx} className="bg-white/5 rounded-xl p-4">
                    <p className="text-gray-400 text-sm mb-2">{prompt.promptId}</p>
                    <p className="text-white">{prompt.response}</p>
                  </div>
                ))}
              </div>
            )}

            {(partnerInstagram || partnerSpotify) && (
              <div className="space-y-3">
                <p className="text-gray-400 text-sm">Socials</p>
                <div className="flex gap-3">
                  {partnerInstagram && (
                    <a
                      href={`https://instagram.com/${partnerInstagram}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl text-white text-sm hover:opacity-90 transition-opacity"
                    >
                      📸 Instagram
                    </a>
                  )}
                  {partnerSpotify && (
                    <a
                      href={partnerSpotify}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 px-4 py-2 bg-[#1DB954] rounded-xl text-white text-sm hover:opacity-90 transition-opacity"
                    >
                      🎵 Spotify
                    </a>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Mobile Profile Overlay */}
      {showMobileProfile && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowMobileProfile(false)}
          />
          <div className="absolute right-0 top-0 bottom-0 w-full max-w-md bg-[#0f0d23] flex flex-col">
            {/* Fixed Header */}
            <div className="shrink-0 p-4 border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-white">{partnerFullName}</h2>
                {partnerAge && <span className="text-xl text-white">{partnerAge}</span>}
              </div>
              <button
                onClick={() => setShowMobileProfile(false)}
                className="p-2 hover:bg-white/10 rounded-full"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                  <path d="M18 6 6 18" />
                  <path d="m6 6 12 12" />
                </svg>
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto">
              {/* Photo Carousel */}
              <div className="relative aspect-[3/4] bg-black">
                {allPhotos.length > 0 ? (
                  <>
                    <Image
                      src={allPhotos[currentPhotoIndex] || profilePhoto || ""}
                      alt={partnerName}
                      fill
                      className="object-cover"
                    />
                    {allPhotos.length > 1 && (
                      <>
                        <div className="absolute top-3 left-0 right-0 flex justify-center gap-1 px-4">
                          {allPhotos.map((_, idx) => (
                            <div
                              key={idx}
                              className={`h-1 flex-1 max-w-12 rounded-full transition-all ${
                                idx === currentPhotoIndex ? "bg-white" : "bg-white/40"
                              }`}
                            />
                          ))}
                        </div>
                        <button
                          onClick={prevPhoto}
                          className="absolute left-0 top-0 bottom-0 w-1/3 flex items-center pl-2"
                        >
                          <div className="w-8 h-8 rounded-full bg-black/30 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                              <path d="m15 18-6-6 6-6" />
                            </svg>
                          </div>
                        </button>
                        <button
                          onClick={nextPhoto}
                          className="absolute right-0 top-0 bottom-0 w-1/3 flex items-center justify-end pr-2"
                        >
                          <div className="w-8 h-8 rounded-full bg-black/30 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                              <path d="m9 18 6-6-6-6" />
                            </svg>
                          </div>
                        </button>
                      </>
                    )}
                  </>
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-pink-500 to-purple-500 flex items-center justify-center">
                    <span className="text-6xl">👤</span>
                  </div>
                )}
              </div>

              {/* Profile Info */}
              <div className="p-4 space-y-6 pb-8">
                {partnerLookingFor && (
                  <div className="space-y-2">
                    <p className="text-gray-400 text-sm">Looking for</p>
                    <div className="flex items-center gap-2 bg-white/5 rounded-xl p-3">
                      <span className="text-xl">🥰</span>
                      <span className="text-white font-medium">{partnerLookingFor}</span>
                    </div>
                  </div>
                )}

                <div className="space-y-3">
                  <p className="text-gray-400 text-sm">Essentials</p>
                  <div className="flex flex-wrap gap-2">
                    {partnerUniversity && (
                      <span className="px-3 py-1.5 bg-white/5 rounded-full text-sm text-white">
                        🎓 {partnerUniversity}
                      </span>
                    )}
                    {partnerCourse && (
                      <span className="px-3 py-1.5 bg-white/5 rounded-full text-sm text-white">
                        📚 {partnerCourse}
                      </span>
                    )}
                    {partnerYearOfStudy && (
                      <span className="px-3 py-1.5 bg-white/5 rounded-full text-sm text-white">
                        📅 Year {partnerYearOfStudy}
                      </span>
                    )}
                    {partnerHeight && (
                      <span className="px-3 py-1.5 bg-white/5 rounded-full text-sm text-white">
                        📏 {partnerHeight}
                      </span>
                    )}
                    {partnerZodiac && (
                      <span className="px-3 py-1.5 bg-white/5 rounded-full text-sm text-white">
                        ♈ {partnerZodiac}
                      </span>
                    )}
                  </div>
                </div>

                {(partnerSmoking || partnerWorkout) && (
                  <div className="space-y-3">
                    <p className="text-gray-400 text-sm">Lifestyle</p>
                    <div className="flex flex-wrap gap-2">
                      {partnerSmoking && (
                        <span className="px-3 py-1.5 bg-white/5 rounded-full text-sm text-white">
                          🚬 {partnerSmoking === "no" ? "Non-smoker" : partnerSmoking === "yes" ? "Smoker" : "Social smoker"}
                        </span>
                      )}
                      {partnerWorkout && (
                        <span className="px-3 py-1.5 bg-white/5 rounded-full text-sm text-white">
                          💪 {partnerWorkout}
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {partnerBio && (
                  <div className="space-y-2">
                    <p className="text-gray-400 text-sm">About</p>
                    <p className="text-white text-sm leading-relaxed">{partnerBio}</p>
                  </div>
                )}

                {partnerQualities.length > 0 && (
                  <div className="space-y-3">
                    <p className="text-gray-400 text-sm">My qualities</p>
                    <div className="flex flex-wrap gap-2">
                      {partnerQualities.map((quality, idx) => (
                        <span
                          key={idx}
                          className="px-3 py-1.5 bg-pink-500/20 border border-pink-500/30 rounded-full text-sm text-pink-300"
                        >
                          {quality}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {partnerInterests.length > 0 && (
                  <div className="space-y-3">
                    <p className="text-gray-400 text-sm">Interests</p>
                    <div className="flex flex-wrap gap-2">
                      {partnerInterests.map((interest, idx) => (
                        <span
                          key={idx}
                          className="px-3 py-1.5 bg-purple-500/20 border border-purple-500/30 rounded-full text-sm text-purple-300"
                        >
                          {interest}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {partnerPrompts.length > 0 && (
                  <div className="space-y-4">
                    {partnerPrompts.map((prompt, idx) => (
                      <div key={idx} className="bg-white/5 rounded-xl p-4">
                        <p className="text-gray-400 text-sm mb-2">{prompt.promptId}</p>
                        <p className="text-white">{prompt.response}</p>
                      </div>
                    ))}
                  </div>
                )}

                {(partnerInstagram || partnerSpotify) && (
                  <div className="space-y-3">
                    <p className="text-gray-400 text-sm">Socials</p>
                    <div className="flex gap-3">
                      {partnerInstagram && (
                        <a
                          href={`https://instagram.com/${partnerInstagram}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl text-white text-sm hover:opacity-90 transition-opacity"
                        >
                          📸 Instagram
                        </a>
                      )}
                      {partnerSpotify && (
                        <a
                          href={partnerSpotify}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 px-4 py-2 bg-[#1DB954] rounded-xl text-white text-sm hover:opacity-90 transition-opacity"
                        >
                          🎵 Spotify
                        </a>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Success Toast */}
      {successMessage && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="bg-green-500/90 backdrop-blur-lg text-white px-6 py-3 rounded-full shadow-lg flex items-center gap-2">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20 6L9 17l-5-5" />
            </svg>
            <span className="font-medium">{successMessage}</span>
          </div>
        </div>
      )}

      {/* Unmatch Modal */}
      {showUnmatchModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => !isUnmatching && setShowUnmatchModal(false)} />
          <div className="relative bg-[#1a1a2e] rounded-3xl p-6 w-full max-w-sm border border-white/10 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-pink-500/20 flex items-center justify-center">
                <span className="text-3xl">💔</span>
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Unmatch {partnerName}?</h3>
              <p className="text-gray-400 text-sm mb-6">
                This will remove your match and delete all messages. This action cannot be undone.
              </p>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1 bg-white/5 border-white/10 text-white hover:bg-white/10"
                  onClick={() => setShowUnmatchModal(false)}
                  disabled={isUnmatching}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1 bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600"
                  onClick={handleUnmatch}
                  disabled={isUnmatching}
                >
                  {isUnmatching ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Unmatching...</span>
                    </div>
                  ) : (
                    "Unmatch"
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Block Modal */}
      {showBlockModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => !isBlocking && setShowBlockModal(false)} />
          <div className="relative bg-[#1a1a2e] rounded-3xl p-6 w-full max-w-sm border border-white/10 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/20 flex items-center justify-center">
                <span className="text-3xl">🚫</span>
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Block {partnerName}?</h3>
              <p className="text-gray-400 text-sm mb-6">
                They won&apos;t be able to see your profile or message you. Your match will also be removed.
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
          </div>
        </div>
      )}

      {/* Report Modal */}
      {showReportModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => !isSubmittingReport && setShowReportModal(false)} />
          <div className="relative bg-[#1a1a2e] rounded-3xl w-full max-w-md border border-white/10 shadow-2xl animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="p-6 pb-4 border-b border-white/10">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-white">Report {partnerName}</h3>
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
                <div className="space-y-2 animate-in slide-in-from-top-2 duration-200">
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
                <div className="space-y-2 animate-in slide-in-from-top-2 duration-200">
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
          </div>
        </div>
      )}
    </div>
  );
}

function formatTime(dateString: string) {
  return new Date(dateString).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function formatDate(dateString: string) {
  const date = new Date(dateString);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.toDateString() === today.toDateString()) return "Today";
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
