import { cn } from "@/lib/utils";
import { DemoToggle } from "./demo-toggle";
import type { OpsStage } from "./types";
import { STAGE_META } from "./types";

interface OpsHeaderProps {
    stage: OpsStage;
    title: string;
    description: string;
    count: number;
    isDemo?: boolean;
    actions?: React.ReactNode;
}

export function OpsHeader({ stage, title, description, count, isDemo, actions }: OpsHeaderProps) {
    const meta = STAGE_META[stage];

    return (
        <div className="mb-8 flex flex-wrap items-end justify-between gap-6">
            <div className="min-w-0 flex-1">
                <div className="mb-2 flex items-center gap-2">
                    <span className={cn("inline-flex size-1.5 rounded-full", meta.dot)} />
                    <span className={cn("text-[11px] font-semibold uppercase tracking-[0.16em]", meta.accent)}>
                        {meta.label}
                    </span>
                    {isDemo && (
                        <span className="ml-1 rounded-full bg-amber-400/15 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-amber-200 ring-1 ring-inset ring-amber-400/30">
                            Demo
                        </span>
                    )}
                </div>
                <h1 className="text-3xl font-semibold tracking-tight text-white">{title}</h1>
                <p className="mt-1.5 flex items-center gap-2 text-sm text-white/50">
                    <span>
                        <span className="font-medium text-white/80 tabular-nums">{count}</span>{" "}
                        {description}
                    </span>
                </p>
            </div>

            <div className="flex items-center gap-2">
                {actions}
                <DemoToggle />
            </div>
        </div>
    );
}
