import { cn } from "@/lib/utils";
import { getVibeMeta, type OpsPairUser } from "./types";

interface PairAvatarsProps {
    userA: OpsPairUser;
    userB: OpsPairUser;
    vibe?: string | null;
    size?: "sm" | "md" | "lg";
    className?: string;
}

const SIZE_MAP = {
    sm: { avatar: "size-9 text-xs", bridge: "size-7 text-sm", overlap: "-ml-2" },
    md: { avatar: "size-12 text-sm", bridge: "size-9 text-base", overlap: "-ml-2.5" },
    lg: { avatar: "size-16 text-lg", bridge: "size-11 text-xl", overlap: "-ml-3" },
} as const;

export function PairAvatars({ userA, userB, vibe, size = "md", className }: PairAvatarsProps) {
    const vibeMeta = getVibeMeta(vibe);
    const s = SIZE_MAP[size];

    return (
        <div className={cn("flex items-center", className)}>
            <div
                className={cn(
                    "relative flex items-center justify-center rounded-full bg-gradient-to-br font-semibold text-white ring-2 shadow-lg",
                    s.avatar,
                    vibeMeta.gradient,
                    vibeMeta.ring,
                    "bg-gradient-to-br from-purple-500/40 to-fuchsia-500/40"
                )}
                aria-label={userA.firstName}
            >
                {userA.firstName.charAt(0).toUpperCase()}
            </div>

            <div
                className={cn(
                    "relative z-10 flex items-center justify-center rounded-full bg-[#0a0a14] ring-2 shadow-lg",
                    s.bridge,
                    s.overlap,
                    vibeMeta.ring,
                )}
                title={vibeMeta.label}
            >
                <span className="leading-none">{vibeMeta.emoji}</span>
            </div>

            <div
                className={cn(
                    "relative flex items-center justify-center rounded-full bg-gradient-to-br font-semibold text-white ring-2 shadow-lg",
                    s.avatar,
                    s.overlap,
                    vibeMeta.gradient,
                    vibeMeta.ring,
                    "bg-gradient-to-br from-pink-500/40 to-rose-500/40"
                )}
                aria-label={userB.firstName}
            >
                {userB.firstName.charAt(0).toUpperCase()}
            </div>
        </div>
    );
}
