"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Message {
  id: string;
  content: string;
  senderId: string;
  createdAt: string;
  read: boolean;
}

interface MatchProfile {
  userId: string;
  firstName: string;
  lastName?: string;
  profilePhoto?: string;
  photos: string[];
  course?: string;
  age: number;
}

interface MatchData {
  id: string;
  profile: MatchProfile;
  messages: Message[];
}

// Icons
const ArrowLeftIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m12 19-7-7 7-7"/><path d="M19 12H5"/>
  </svg>
);

const MoreVerticalIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/>
  </svg>
);

const SendIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/>
  </svg>
);

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
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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
        setMatchData(data.data);
        setMessages(data.data.messages || []);
      }
    } catch (error) {
      console.error("Failed to fetch match:", error);
    } finally {
      setIsLoading(false);
    }
  }, [matchId]);

  const fetchMessages = useCallback(async () => {
    try {
      const response = await fetch(`/api/matches/${matchId}/messages`);
      const data = await response.json();
      if (data.success) {
        setMessages(data.data || []);
      }
    } catch (error) {
      console.error("Failed to fetch messages:", error);
    }
  }, [matchId]);

  useEffect(() => {
    fetchMatchData();
    fetchCurrentUser();
    
    // Poll for new messages every 3 seconds
    const interval = setInterval(fetchMessages, 3000);
    return () => clearInterval(interval);
  }, [matchId, fetchMatchData, fetchCurrentUser, fetchMessages]);

  useEffect(() => {
    // Scroll to bottom when messages change
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || isSending) return;

    setIsSending(true);
    const messageContent = newMessage.trim();
    setNewMessage("");

    // Optimistic update
    const tempMessage: Message = {
      id: `temp-${Date.now()}`,
      content: messageContent,
      senderId: currentUserId,
      createdAt: new Date().toISOString(),
      read: false,
    };
    setMessages((prev) => [...prev, tempMessage]);

    try {
      const response = await fetch(`/api/matches/${matchId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: messageContent }),
      });

      const data = await response.json();
      if (!data.success) {
        // Remove optimistic message on error
        setMessages((prev) => prev.filter((m) => m.id !== tempMessage.id));
      }
    } catch (error) {
      console.error("Failed to send message:", error);
      setMessages((prev) => prev.filter((m) => m.id !== tempMessage.id));
    } finally {
      setIsSending(false);
    }
  };

  const handleUnmatch = async () => {
    if (!confirm("Are you sure you want to unmatch? This cannot be undone.")) return;

    try {
      await fetch(`/api/matches/${matchId}/unmatch`, { method: "POST" });
      router.push("/app/matches");
    } catch (error) {
      console.error("Failed to unmatch:", error);
    }
  };

  const handleBlock = async () => {
    if (!confirm("Are you sure you want to block this user? They won't be able to see your profile.")) return;

    try {
      await fetch("/api/block", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ blockedUserId: matchData?.profile.userId }),
      });
      router.push("/app/matches");
    } catch (error) {
      console.error("Failed to block:", error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col h-screen">
        <div className="flex items-center gap-4 p-4 border-b border-white/10">
          <Skeleton className="w-12 h-12 rounded-full bg-white/5" />
          <Skeleton className="h-6 w-32 bg-white/5" />
        </div>
        <div className="flex-1 p-4 space-y-4">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className={`h-12 ${i % 2 ? "w-1/2 ml-auto" : "w-2/3"} rounded-2xl bg-white/5`} />
          ))}
        </div>
      </div>
    );
  }

  if (!matchData) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-white mb-2">Match not found</h2>
          <Link href="/app/matches" className="text-pink-400 hover:text-pink-300">
            Go back to matches
          </Link>
        </div>
      </div>
    );
  }

  const profilePhoto = matchData.profile.profilePhoto || matchData.profile.photos?.[0];

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <header className="flex items-center justify-between p-4 border-b border-white/10 bg-[#1a1a2e]/50 backdrop-blur-sm">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            className="text-gray-400 hover:text-white"
            onClick={() => router.push("/app/matches")}
          >
            <ArrowLeftIcon />
          </Button>
          
          <Link href={`/app/profile/${matchData.profile.userId}`} className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full overflow-hidden">
              {profilePhoto ? (
                <Image
                  src={profilePhoto}
                  alt={matchData.profile.firstName}
                  width={40}
                  height={40}
                  className="object-cover w-full h-full"
                />
              ) : (
                <div className="w-full h-full bg-linear-to-br from-pink-500 to-purple-500 flex items-center justify-center">
                  <span className="text-lg">👤</span>
                </div>
              )}
            </div>
            <div>
              <h2 className="font-semibold text-white">
                {matchData.profile.firstName}
              </h2>
              <p className="text-xs text-gray-400">
                {matchData.profile.course || "Strathmore University"}
              </p>
            </div>
          </Link>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="text-gray-400 hover:text-white">
              <MoreVerticalIcon />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-[#1a1a2e] border-white/10">
            <DropdownMenuItem 
              className="text-gray-300 focus:text-white focus:bg-white/10"
              onClick={handleUnmatch}
            >
              Unmatch
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-white/10" />
            <DropdownMenuItem 
              className="text-red-400 focus:text-red-300 focus:bg-red-500/10"
              onClick={handleBlock}
            >
              Block & Report
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </header>

      {/* Messages */}
      <ScrollArea ref={scrollRef} className="flex-1 p-4">
        <div className="space-y-4 max-w-2xl mx-auto">
          {/* Match notification */}
          <div className="text-center py-8">
            <div className="w-20 h-20 rounded-full overflow-hidden mx-auto mb-4 ring-2 ring-pink-500 ring-offset-2 ring-offset-[#0f0d23]">
              {profilePhoto ? (
                <Image
                  src={profilePhoto}
                  alt={matchData.profile.firstName}
                  width={80}
                  height={80}
                  className="object-cover w-full h-full"
                />
              ) : (
                <div className="w-full h-full bg-linear-to-br from-pink-500 to-purple-500 flex items-center justify-center">
                  <span className="text-3xl">👤</span>
                </div>
              )}
            </div>
            <h3 className="text-lg font-semibold text-white mb-1">
              You matched with {matchData.profile.firstName}!
            </h3>
            <p className="text-sm text-gray-400">
              Start the conversation 💬
            </p>
          </div>

          {/* Message bubbles */}
          {messages.map((message) => {
            const isOwn = message.senderId === currentUserId;
            return (
              <div
                key={message.id}
                className={`flex ${isOwn ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[70%] px-4 py-3 rounded-2xl ${
                    isOwn
                      ? "bg-linear-to-r from-pink-500 to-rose-500 text-white rounded-br-md"
                      : "bg-white/10 text-white rounded-bl-md"
                  }`}
                >
                  <p className="text-sm">{message.content}</p>
                  <p className={`text-xs mt-1 ${isOwn ? "text-pink-100" : "text-gray-500"}`}>
                    {formatTime(message.createdAt)}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>

      {/* Message Input */}
      <div className="p-4 border-t border-white/10 bg-[#1a1a2e]/50">
        <form onSubmit={sendMessage} className="flex items-center gap-3 max-w-2xl mx-auto">
          <Input
            ref={inputRef}
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 bg-white/5 border-white/10 text-white placeholder:text-gray-500 h-12 rounded-full px-5"
          />
          <Button
            type="submit"
            size="icon"
            disabled={!newMessage.trim() || isSending}
            className="w-12 h-12 rounded-full bg-linear-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 disabled:opacity-50"
          >
            <SendIcon />
          </Button>
        </form>
      </div>
    </div>
  );
}

function formatTime(dateString: string) {
  const date = new Date(dateString);
  return date.toLocaleTimeString("en-US", { 
    hour: "numeric", 
    minute: "2-digit",
    hour12: true 
  });
}
