import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

type FlowStatus = "done" | "current" | "pending" | "skipped";

interface FlowStep {
    label: string;
    detail?: string;
    status: FlowStatus;
}

interface DateFlowTimelineProps {
    steps: FlowStep[];
    className?: string;
}

export function DateFlowTimeline({ steps, className }: DateFlowTimelineProps) {
    return (
        <ol className={cn("relative space-y-4", className)}>
            {steps.map((step, idx) => {
                const isLast = idx === steps.length - 1;
                return (
                    <li key={idx} className="relative flex gap-3">
                        <div className="relative flex flex-col items-center">
                            <Dot status={step.status} />
                            {!isLast && (
                                <span
                                    className={cn(
                                        "mt-1 w-px flex-1 min-h-5",
                                        step.status === "done"
                                            ? "bg-emerald-400/40"
                                            : step.status === "current"
                                            ? "bg-gradient-to-b from-emerald-400/40 to-white/10"
                                            : "bg-white/10"
                                    )}
                                />
                            )}
                        </div>
                        <div className="pb-4">
                            <p
                                className={cn(
                                    "text-sm font-medium leading-tight",
                                    step.status === "pending" ? "text-white/40" :
                                    step.status === "skipped" ? "text-white/30 line-through" :
                                    "text-white/90"
                                )}
                            >
                                {step.label}
                            </p>
                            {step.detail && (
                                <p
                                    className={cn(
                                        "mt-0.5 text-xs",
                                        step.status === "pending" ? "text-white/30" : "text-white/50"
                                    )}
                                >
                                    {step.detail}
                                </p>
                            )}
                        </div>
                    </li>
                );
            })}
        </ol>
    );
}

function Dot({ status }: { status: FlowStatus }) {
    if (status === "done") {
        return (
            <span className="relative flex size-5 items-center justify-center rounded-full bg-emerald-500/20 ring-1 ring-emerald-400/40">
                <Check className="size-3 text-emerald-300" strokeWidth={3} />
            </span>
        );
    }
    if (status === "current") {
        return (
            <span className="relative flex size-5 items-center justify-center">
                <span className="absolute inset-0 animate-ping rounded-full bg-emerald-400/30" />
                <span className="relative flex size-3 items-center justify-center rounded-full bg-emerald-400 ring-2 ring-emerald-300/30 shadow-[0_0_12px_rgba(52,211,153,0.6)]" />
            </span>
        );
    }
    if (status === "skipped") {
        return <span className="relative flex size-5 items-center justify-center rounded-full bg-white/5 ring-1 ring-inset ring-white/10" />;
    }
    return <span className="relative mt-0.5 flex size-5 items-center justify-center rounded-full bg-white/[0.04] ring-1 ring-inset ring-white/10" />;
}
