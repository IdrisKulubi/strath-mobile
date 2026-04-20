import { cn } from "@/lib/utils";
import { Sparkles } from "lucide-react";

interface PushPreviewCardProps {
    recipientName: string;
    partnerName: string;
    venueName?: string;
    venueAddress?: string;
    whenLabel?: string;
    className?: string;
}

export function PushPreviewCard({
    recipientName,
    partnerName,
    venueName,
    venueAddress,
    whenLabel,
    className,
}: PushPreviewCardProps) {
    const title = `Your date with ${partnerName} is set! 📍`;
    const body =
        venueName && venueAddress && whenLabel
            ? `${venueName}, ${venueAddress} — ${whenLabel}`
            : "Open the app for details";

    return (
        <div
            className={cn(
                "relative overflow-hidden rounded-2xl border border-white/[0.08] bg-gradient-to-br from-white/[0.04] to-white/[0.02] p-3",
                className
            )}
        >
            <p className="mb-2 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-white/40">
                <Sparkles className="size-2.5" /> Push preview · for {recipientName}
            </p>

            <div className="rounded-2xl bg-[#1c1c1e]/95 p-3 shadow-lg ring-1 ring-inset ring-white/[0.04]">
                <div className="flex items-start gap-2.5">
                    <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-pink-500 to-rose-500 text-base">
                        💖
                    </div>
                    <div className="min-w-0 flex-1">
                        <div className="flex items-baseline justify-between gap-2">
                            <p className="text-[11px] font-semibold uppercase tracking-wide text-white/90">
                                Strathspace
                            </p>
                            <p className="text-[10px] text-white/40">now</p>
                        </div>
                        <p className="mt-0.5 text-[13px] font-semibold leading-snug text-white">{title}</p>
                        <p className="mt-0.5 text-[12px] leading-snug text-white/70">{body}</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
