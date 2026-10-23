import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface EmptyStateProps {
    icon: LucideIcon;
    title: string;
    description?: string;
    className?: string;
}

export function EmptyState({ icon: Icon, title, description, className }: EmptyStateProps) {
    return (
        <div
            className={cn(
                "flex flex-col items-center justify-center rounded-3xl border border-white/[0.06] bg-white/[0.02] px-8 py-20 text-center",
                className
            )}
        >
            <div className="mb-5 flex size-14 items-center justify-center rounded-2xl bg-white/[0.04] ring-1 ring-inset ring-white/[0.06]">
                <Icon className="size-6 text-white/40" strokeWidth={1.5} />
            </div>
            <p className="text-[15px] font-medium text-white/90">{title}</p>
            {description && (
                <p className="mt-1.5 max-w-sm text-[13px] leading-relaxed text-white/45">{description}</p>
            )}
        </div>
    );
}
