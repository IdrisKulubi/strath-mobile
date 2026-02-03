"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useNotificationCounts, formatBadgeCount } from "@/hooks/use-notification-counts";

// Icons
const CompassIcon = ({ active }: { active?: boolean }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/>
    <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/>
  </svg>
);

const HeartIcon = ({ active }: { active?: boolean }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>
  </svg>
);

const ChatIcon = ({ active }: { active?: boolean }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/>
  </svg>
);

const UserIcon = ({ active }: { active?: boolean }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="8" r="5"/>
    <path d="M20 21a8 8 0 0 0-16 0"/>
  </svg>
);

const navItems = [
  { href: "/app/discover", label: "Discover", Icon: CompassIcon, badge: null as "matches" | "messages" | null },
  { href: "/app/matches", label: "Matches", Icon: HeartIcon, badge: "matches" as const },
  { href: "/app/messages", label: "Messages", Icon: ChatIcon, badge: "messages" as const },
  { href: "/app/profile", label: "Profile", Icon: UserIcon, badge: null },
];

export function MobileNav() {
  const pathname = usePathname();
  const { unopenedMatches, unreadMessages } = useNotificationCounts({ pollingInterval: 10000 });

  // Don't show nav on chat pages (full screen experience)
  if (pathname.includes("/app/chat/")) {
    return null;
  }

  const getBadgeCount = (badge: "matches" | "messages" | null) => {
    if (badge === "matches") return unopenedMatches;
    if (badge === "messages") return unreadMessages;
    return 0;
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden">
      {/* Gradient blur backdrop */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#0f0d23] via-[#0f0d23]/95 to-transparent backdrop-blur-xl" />
      
      {/* Safe area padding for iOS */}
      <div className="relative px-2 pt-2 safe-area-bottom">
        <div className="flex items-center justify-around pb-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
            const badgeCount = getBadgeCount(item.badge);
            const badgeText = formatBadgeCount(badgeCount);
            
            return (
              <Link
                key={item.href}
                href={item.href}
                className="relative flex flex-col items-center py-2 px-4 min-w-[64px] active:scale-90 transition-transform"
              >
                {/* Active indicator */}
                {isActive && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute -top-1 w-12 h-1 bg-gradient-to-r from-pink-500 to-rose-500 rounded-full"
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  />
                )}
                
                {/* Icon with Badge */}
                <div className="relative">
                  <div className={`transition-colors ${isActive ? "text-pink-500" : "text-gray-400"}`}>
                    <item.Icon active={isActive} />
                  </div>
                  
                  {/* Notification Badge */}
                  <AnimatePresence>
                    {badgeText && (
                      <motion.div
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0, opacity: 0 }}
                        transition={{ type: "spring", stiffness: 500, damping: 30 }}
                        className="absolute -top-1.5 -right-2.5 min-w-[18px] h-[18px] px-1 flex items-center justify-center bg-gradient-to-r from-pink-500 to-rose-500 text-white text-[10px] font-bold rounded-full shadow-lg"
                      >
                        {badgeText}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
                
                {/* Label */}
                <span className={`text-[10px] mt-1 font-medium transition-colors ${
                  isActive ? "text-pink-500" : "text-gray-500"
                }`}>
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
