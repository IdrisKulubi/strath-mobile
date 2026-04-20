"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { ArrowLeft, ArrowRight, CalendarCheck2, MapPin, Send } from "lucide-react";

import { cn } from "@/lib/utils";
import { toast } from "@/components/ui/custom-toast";
import { scheduleDate } from "@/lib/actions/admin";
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet";

import { PairAvatars } from "./pair-avatars";
import { LocationPickerGrid } from "./location-picker-grid";
import { QuickTimePicker } from "./quick-time-picker";
import { PushPreviewCard } from "./push-preview-card";
import { getVibeMeta, type OpsLocation, type OpsPairUser } from "./types";

interface ScheduleDateSheetProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    matchId: string;
    userA: OpsPairUser;
    userB: OpsPairUser;
    vibe?: string | null;
    locations: OpsLocation[];
    isDemo?: boolean;
    onScheduled?: (payload: { locationId: string; scheduledAt: string; venueName: string; venueAddress: string }) => void;
}

type Step = 1 | 2 | 3;

export function ScheduleDateSheet({
    open,
    onOpenChange,
    matchId,
    userA,
    userB,
    vibe,
    locations,
    isDemo,
    onScheduled,
}: ScheduleDateSheetProps) {
    const [step, setStep] = useState<Step>(1);
    const [locationId, setLocationId] = useState<string | null>(null);
    const [scheduledAt, setScheduledAt] = useState<string | null>(null);
    const [isPending, startTransition] = useTransition();
    const vibeMeta = getVibeMeta(vibe);

    useEffect(() => {
        if (!open) {
            setStep(1);
            setLocationId(null);
            setScheduledAt(null);
        }
    }, [open]);

    const selectedLocation = useMemo(
        () => locations.find((l) => l.id === locationId) ?? null,
        [locations, locationId]
    );

    const whenLabel = scheduledAt
        ? new Date(scheduledAt).toLocaleString("en-KE", {
              weekday: "short",
              month: "short",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
          })
        : undefined;

    const handleSubmit = () => {
        if (!locationId || !scheduledAt || !selectedLocation) return;

        if (isDemo) {
            onScheduled?.({
                locationId,
                scheduledAt,
                venueName: selectedLocation.name,
                venueAddress: selectedLocation.address,
            });
            toast.success(
                `Demo · Date scheduled`,
                `${userA.firstName} × ${userB.firstName} · ${whenLabel}`
            );
            onOpenChange(false);
            return;
        }

        const formData = new FormData();
        formData.set("matchId", matchId);
        formData.set("locationId", locationId);
        formData.set("scheduledAt", scheduledAt);

        startTransition(async () => {
            try {
                await scheduleDate(formData);
                toast.success(
                    `Date scheduled`,
                    `${userA.firstName} × ${userB.firstName} · ${whenLabel}`
                );
                onScheduled?.({
                    locationId,
                    scheduledAt,
                    venueName: selectedLocation.name,
                    venueAddress: selectedLocation.address,
                });
                onOpenChange(false);
            } catch (err) {
                toast.error("Couldn't schedule date", (err as Error)?.message);
            }
        });
    };

    const canNextFrom1 = !!locationId;
    const canNextFrom2 = !!scheduledAt;

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent
                side="right"
                className="w-full border-white/[0.08] bg-[#0a0a14]/98 text-white backdrop-blur-xl sm:max-w-md"
            >
                <SheetHeader className="relative border-b border-white/[0.06] px-6 pt-6 pb-5">
                    <div
                        className={cn(
                            "pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b opacity-40",
                            vibeMeta.gradient
                        )}
                        aria-hidden
                    />
                    <div className="relative flex items-center gap-3">
                        <PairAvatars userA={userA} userB={userB} vibe={vibe} size="md" />
                        <div className="min-w-0">
                            <SheetTitle className="text-lg font-semibold tracking-tight text-white">
                                Schedule date
                            </SheetTitle>
                            <SheetDescription className="text-[12px] text-white/50">
                                {userA.firstName} × {userB.firstName} · {vibeMeta.label}
                            </SheetDescription>
                        </div>
                    </div>

                    <StepProgress step={step} className="mt-5" />
                </SheetHeader>

                <div className="flex-1 overflow-y-auto px-6 pb-6">
                    {step === 1 && (
                        <section>
                            <SectionHeading
                                eyebrow="Step 1 of 3"
                                title="Pick a venue"
                                description={vibe ? `Matches for ${vibeMeta.label} dates are suggested first.` : "Choose a saved location."}
                            />
                            <LocationPickerGrid
                                locations={locations}
                                selectedId={locationId}
                                onSelect={setLocationId}
                                pairVibe={vibe}
                            />
                        </section>
                    )}

                    {step === 2 && (
                        <section>
                            <SectionHeading
                                eyebrow="Step 2 of 3"
                                title="Pick a time"
                                description="Tap a suggestion or set a custom slot."
                            />
                            <QuickTimePicker value={scheduledAt} onChange={setScheduledAt} />
                        </section>
                    )}

                    {step === 3 && selectedLocation && scheduledAt && (
                        <section className="space-y-4">
                            <SectionHeading
                                eyebrow="Step 3 of 3"
                                title="Review & send"
                                description="Both people will receive this push notification."
                            />

                            <div className="rounded-2xl bg-white/[0.03] p-4 ring-1 ring-inset ring-white/[0.04]">
                                <div className="mb-3 flex items-center gap-2 text-[12px] text-white/60">
                                    <MapPin className="size-3.5 text-white/50" />
                                    <div className="min-w-0">
                                        <p className="truncate text-[14px] font-medium text-white">
                                            {selectedLocation.name}
                                        </p>
                                        <p className="truncate text-[12px] text-white/50">{selectedLocation.address}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 border-t border-white/[0.06] pt-3 text-[12px] text-white/60">
                                    <CalendarCheck2 className="size-3.5 text-white/50" />
                                    <p className="text-[14px] font-medium text-white">{whenLabel}</p>
                                </div>
                            </div>

                            <div className="grid gap-2">
                                <PushPreviewCard
                                    recipientName={userA.firstName}
                                    partnerName={userB.firstName}
                                    venueName={selectedLocation.name}
                                    venueAddress={selectedLocation.address}
                                    whenLabel={whenLabel}
                                />
                                <PushPreviewCard
                                    recipientName={userB.firstName}
                                    partnerName={userA.firstName}
                                    venueName={selectedLocation.name}
                                    venueAddress={selectedLocation.address}
                                    whenLabel={whenLabel}
                                />
                            </div>
                        </section>
                    )}
                </div>

                <div className="sticky bottom-0 flex items-center justify-between gap-3 border-t border-white/[0.06] bg-[#0a0a14]/95 px-6 py-4 backdrop-blur">
                    <button
                        type="button"
                        onClick={() => (step === 1 ? onOpenChange(false) : setStep((s) => (s - 1) as Step))}
                        disabled={isPending}
                        className="inline-flex items-center gap-1 rounded-full px-3 py-2 text-[13px] font-medium text-white/70 transition-colors hover:bg-white/[0.04] hover:text-white disabled:opacity-50"
                    >
                        <ArrowLeft className="size-3.5" />
                        {step === 1 ? "Close" : "Back"}
                    </button>

                    {step < 3 ? (
                        <button
                            type="button"
                            onClick={() => setStep((s) => (s + 1) as Step)}
                            disabled={(step === 1 && !canNextFrom1) || (step === 2 && !canNextFrom2)}
                            className="inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-2 text-[13px] font-semibold text-black shadow-lg transition-all hover:bg-white/90 disabled:bg-white/10 disabled:text-white/40 disabled:shadow-none"
                        >
                            Continue
                            <ArrowRight className="size-3.5" />
                        </button>
                    ) : (
                        <button
                            type="button"
                            onClick={handleSubmit}
                            disabled={isPending || !canNextFrom1 || !canNextFrom2}
                            className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-br from-emerald-500 to-green-600 px-4 py-2 text-[13px] font-semibold text-white shadow-[0_4px_16px_-4px_rgba(16,185,129,0.6)] transition-all hover:from-emerald-400 hover:to-green-500 disabled:opacity-60"
                        >
                            <Send className="size-3.5" />
                            {isPending ? "Sending…" : isDemo ? "Simulate send" : "Send & schedule"}
                        </button>
                    )}
                </div>
            </SheetContent>
        </Sheet>
    );
}

function SectionHeading({
    eyebrow,
    title,
    description,
}: {
    eyebrow: string;
    title: string;
    description?: string;
}) {
    return (
        <div className="mb-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-emerald-300/80">{eyebrow}</p>
            <h3 className="mt-1 text-[17px] font-semibold tracking-tight text-white">{title}</h3>
            {description && <p className="mt-1 text-[12.5px] leading-relaxed text-white/50">{description}</p>}
        </div>
    );
}

function StepProgress({ step, className }: { step: Step; className?: string }) {
    const steps: { num: Step; label: string }[] = [
        { num: 1, label: "Venue" },
        { num: 2, label: "Time" },
        { num: 3, label: "Review" },
    ];
    return (
        <div className={cn("flex items-center gap-2", className)}>
            {steps.map((s, idx) => {
                const active = step === s.num;
                const done = step > s.num;
                return (
                    <div key={s.num} className="flex flex-1 items-center gap-2">
                        <div
                            className={cn(
                                "flex size-5 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold transition-colors",
                                done && "bg-emerald-500 text-white",
                                active && "bg-white text-black",
                                !active && !done && "bg-white/10 text-white/50"
                            )}
                        >
                            {done ? "✓" : s.num}
                        </div>
                        <span
                            className={cn(
                                "text-[11px] font-medium uppercase tracking-wider",
                                active ? "text-white" : done ? "text-emerald-300" : "text-white/40"
                            )}
                        >
                            {s.label}
                        </span>
                        {idx < steps.length - 1 && (
                            <div
                                className={cn(
                                    "h-px flex-1",
                                    done ? "bg-emerald-400/40" : "bg-white/10"
                                )}
                            />
                        )}
                    </div>
                );
            })}
        </div>
    );
}
