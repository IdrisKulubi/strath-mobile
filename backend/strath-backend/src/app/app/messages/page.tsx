"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

interface Match {
  id: string;
  createdAt: string;
  isNew: boolean;
  sparkScore: number;
  unreadCount: number;
  partner: {
    id: string;
    name: string;
    image?: string;
    lastActive?: string;
    profile: {
      firstName?: string;
      lastName?: string;
      profilePhoto?: string;
      photos?: string[];
      course?: string;
      age?: number;
      interests?: string[];
    } | null;
  };
  lastMessage?: {
    content: string;
    senderId: string;
    createdAt: string;
    status: string;
  } | null;
}

const SearchIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>
  </svg>
);

export default function MessagesPage() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetchMatches();
  }, []);

  const fetchMatches = async () => {
    try {
      const response = await fetch("/api/matches");
      const data = await response.json();
      if (data.success && data.data?.matches) {
        setMatches(data.data.matches || []);
      } else if (data.success && Array.isArray(data.data)) {
        setMatches(data.data);
      } else {
        setMatches([]);
      }
    } catch (error) {
      console.error("Failed to fetch matches:", error);
      setMatches([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Filter to only show conversations (matches with messages)
  const conversations = matches.filter((m) => m.lastMessage);

  const filteredConversations = conversations.filter((match) => {
    const name = match.partner.profile?.firstName || match.partner.name || '';
    return name.toLowerCase().includes(searchQuery.toLowerCase());
  });

  if (isLoading) {
    return (
      <div className="p-4 md:p-6 max-w-4xl mx-auto">
        <Skeleton className="h-8 md:h-10 w-32 md:w-48 mb-4 md:mb-6 bg-white/5" />
        <Skeleton className="h-11 md:h-12 w-full mb-4 md:mb-6 bg-white/5" />
        <div className="space-y-3 md:space-y-4">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-[72px] md:h-20 w-full rounded-xl bg-white/5" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl md:text-3xl font-bold text-white mb-4 md:mb-6">Messages</h1>

      {/* Search */}
      <div className="relative mb-4 md:mb-6">
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
          <SearchIcon />
        </div>
        <Input
          placeholder="Search conversations..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-gray-500 h-11 md:h-12 text-base"
        />
      </div>

      {filteredConversations.length === 0 ? (
        <div className="text-center py-12 md:py-16">
          <div className="w-20 h-20 md:w-24 md:h-24 bg-pink-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-4xl md:text-5xl">💬</span>
          </div>
          <h2 className="text-lg md:text-xl font-semibold text-white mb-2">No messages yet</h2>
          <p className="text-gray-400 max-w-sm mx-auto text-sm md:text-base">
            Start a conversation with one of your matches!
          </p>
          <Link
            href="/app/matches"
            className="inline-block mt-4 px-6 py-2 bg-pink-500 hover:bg-pink-600 text-white rounded-full text-sm font-medium transition-colors"
          >
            View Matches
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredConversations.map((match) => (
            <Link
              key={match.id}
              href={`/app/chat/${match.id}`}
              className="flex items-center gap-3 md:gap-4 p-3 md:p-4 bg-white/5 hover:bg-white/10 active:bg-white/15 rounded-xl transition-colors"
            >
              <div className="relative">
                <div className="w-12 h-12 md:w-14 md:h-14 rounded-full overflow-hidden">
                  {match.partner.profile?.profilePhoto || match.partner.profile?.photos?.[0] || match.partner.image ? (
                    <Image
                      src={match.partner.profile?.profilePhoto || match.partner.profile?.photos?.[0] || match.partner.image || ''}
                      alt={match.partner.profile?.firstName || match.partner.name || 'Match'}
                      width={56}
                      height={56}
                      className="object-cover w-full h-full"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-pink-500 to-purple-500 flex items-center justify-center">
                      <span className="text-xl">👤</span>
                    </div>
                  )}
                </div>
                {match.unreadCount > 0 && (
                  <div className="absolute -top-1 -right-1 w-5 h-5 bg-pink-500 rounded-full flex items-center justify-center">
                    <span className="text-xs font-bold text-white">
                      {match.unreadCount > 9 ? "9+" : match.unreadCount}
                    </span>
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-white text-sm md:text-base">
                    {match.partner.profile?.firstName || match.partner.name?.split(' ')[0] || 'Match'}
                  </h3>
                  <span className="text-xs text-gray-500">
                    {formatTime(match.lastMessage?.createdAt)}
                  </span>
                </div>
                <p className={`text-sm truncate ${match.unreadCount > 0 ? "text-white font-medium" : "text-gray-400"}`}>
                  {match.lastMessage?.content || "Say hello! 👋"}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function formatTime(dateString?: string) {
  if (!dateString) return "";
  
  const date = new Date(dateString);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  
  if (minutes < 1) return "now";
  if (minutes < 60) return `${minutes}m`;
  if (hours < 24) return `${hours}h`;
  if (days < 7) return `${days}d`;
  
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
