"use client";

import { Copy, Mail, MapPin, Phone } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "@/components/ui/custom-toast";
import type { OpsPairUser } from "./types";

interface ContactRowProps {
    user: OpsPairUser;
    compact?: boolean;
    className?: string;
}

export function ContactRow({ user, compact, className }: ContactRowProps) {
    const handleCopy = async (label: string, value: string) => {
        try {
            await navigator.clipboard.writeText(value);
            toast.success(`${label} copied`);
        } catch {
            toast.error("Couldn't copy");
        }
    };

    return (
        <div className={cn("space-y-1.5", className)}>
            <p className="text-[13px] font-medium text-white/90">{user.firstName}</p>
            <div className={cn("space-y-1", compact && "text-xs")}>
                <ContactLine
                    icon={<Phone className="size-3.5 text-white/40" strokeWidth={1.75} />}
                    value={user.phone ?? null}
                    missingLabel="No phone"
                    onCopy={(v) => handleCopy("Phone", v)}
                />
                <ContactLine
                    icon={<Mail className="size-3.5 text-white/40" strokeWidth={1.75} />}
                    value={user.email ?? null}
                    missingLabel="No email"
                    onCopy={(v) => handleCopy("Email", v)}
                />
                {user.location && (
                    <div className="flex items-center gap-1.5 text-[12px] text-white/50">
                        <MapPin className="size-3.5 text-white/40" strokeWidth={1.75} />
                        <span className="truncate">{user.location}</span>
                    </div>
                )}
            </div>
        </div>
    );
}

function ContactLine({
    icon,
    value,
    missingLabel,
    onCopy,
}: {
    icon: React.ReactNode;
    value: string | null;
    missingLabel: string;
    onCopy: (value: string) => void;
}) {
    if (!value?.trim()) {
        return (
            <div className="flex items-center gap-1.5 text-[12px] text-amber-300/70">
                {icon}
                <span>{missingLabel}</span>
            </div>
        );
    }
    return (
        <button
            type="button"
            onClick={() => onCopy(value)}
            className="group/line flex w-full items-center gap-1.5 rounded-md py-0.5 text-left text-[12px] text-white/70 transition-colors hover:text-white"
        >
            {icon}
            <span className="min-w-0 flex-1 truncate">{value}</span>
            <Copy className="size-3 text-white/30 opacity-0 transition-opacity group-hover/line:opacity-100" />
        </button>
    );
}
