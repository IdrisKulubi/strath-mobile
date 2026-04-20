"use client";

import { useTransition, type ReactNode } from "react";
import { CheckCircle2, MoreHorizontal, UserX, XCircle, Undo2 } from "lucide-react";

import { cn } from "@/lib/utils";
import { toast } from "@/components/ui/custom-toast";
import { updateDateMatchStatus } from "@/lib/actions/admin";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const STATUS_LABELS: Record<string, string> = {
    scheduled: "Scheduled",
    attended: "Attended",
    cancelled: "Cancelled",
    no_show: "No-show",
    pending_setup: "Arranging",
};

interface StatusActionButtonsProps {
    matchId: string;
    current: string;
    variant?: "upcoming" | "history";
    isDemo?: boolean;
    onDemoUpdate?: (nextStatus: string) => void;
    pairLabel?: string;
}

export function StatusActionButtons({
    matchId,
    current,
    variant = "upcoming",
    isDemo,
    onDemoUpdate,
    pairLabel,
}: StatusActionButtonsProps) {
    const [isPending, startTransition] = useTransition();

    const runUpdate = (status: string, confirmLabel: string) => {
        if (isDemo) {
            onDemoUpdate?.(status);
            toast.success(`Demo · Marked ${confirmLabel}`, pairLabel);
            return;
        }
        startTransition(async () => {
            try {
                await updateDateMatchStatus(matchId, status);
                toast.success(`Marked as ${confirmLabel}`, pairLabel);
            } catch (err) {
                toast.error("Failed to update", (err as Error)?.message);
            }
        });
    };

    if (variant === "history") {
        return (
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <button
                        type="button"
                        className="inline-flex size-8 items-center justify-center rounded-full text-white/50 transition-colors hover:bg-white/[0.06] hover:text-white"
                        aria-label="More actions"
                    >
                        <MoreHorizontal className="size-4" />
                    </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="min-w-[180px]">
                    {current !== "scheduled" && (
                        <DropdownMenuItem onSelect={() => runUpdate("scheduled", "Scheduled")}>
                            <Undo2 className="size-3.5" /> Move back to Upcoming
                        </DropdownMenuItem>
                    )}
                    {current !== "attended" && (
                        <DropdownMenuItem onSelect={() => runUpdate("attended", "Attended")}>
                            <CheckCircle2 className="size-3.5" /> Mark attended
                        </DropdownMenuItem>
                    )}
                    {current !== "cancelled" && (
                        <DropdownMenuItem onSelect={() => runUpdate("cancelled", "Cancelled")}>
                            <XCircle className="size-3.5" /> Mark cancelled
                        </DropdownMenuItem>
                    )}
                    {current !== "no_show" && (
                        <DropdownMenuItem onSelect={() => runUpdate("no_show", "No-show")}>
                            <UserX className="size-3.5" /> Mark no-show
                        </DropdownMenuItem>
                    )}
                </DropdownMenuContent>
            </DropdownMenu>
        );
    }

    return (
        <div className="flex items-center gap-2">
            <PrimaryActionButton
                disabled={isPending}
                onClick={() => runUpdate("attended", "Attended")}
                icon={<CheckCircle2 className="size-4" />}
                tone="emerald"
            >
                Mark attended
            </PrimaryActionButton>

            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <button
                        type="button"
                        disabled={isPending}
                        className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-[12px] font-medium text-white/70 transition-colors hover:border-white/20 hover:bg-white/[0.07] hover:text-white disabled:opacity-50"
                    >
                        More
                        <MoreHorizontal className="size-3.5" />
                    </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="min-w-[180px]">
                    <ConfirmDropdownItem
                        title="Mark date as cancelled?"
                        description={pairLabel ? `This will move ${pairLabel} to History with a cancelled outcome.` : "This will move this date to History."}
                        onConfirm={() => runUpdate("cancelled", "Cancelled")}
                        trigger={
                            <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                                <XCircle className="size-3.5 text-rose-300" />
                                <span>Mark cancelled</span>
                            </DropdownMenuItem>
                        }
                    />
                    <ConfirmDropdownItem
                        title="Mark as no-show?"
                        description={pairLabel ? `${pairLabel} didn't attend. This will move the date to History.` : "This will move the date to History."}
                        onConfirm={() => runUpdate("no_show", "No-show")}
                        trigger={
                            <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                                <UserX className="size-3.5 text-orange-300" />
                                <span>Mark no-show</span>
                            </DropdownMenuItem>
                        }
                    />
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
    );
}

function PrimaryActionButton({
    children,
    icon,
    onClick,
    disabled,
    tone = "emerald",
}: {
    children: ReactNode;
    icon: ReactNode;
    onClick: () => void;
    disabled?: boolean;
    tone?: "emerald" | "rose";
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[12px] font-semibold text-white shadow-[0_4px_16px_-4px_rgba(16,185,129,0.5)] transition-all hover:shadow-[0_8px_24px_-4px_rgba(16,185,129,0.6)] disabled:opacity-60",
                tone === "emerald" && "bg-gradient-to-br from-emerald-500 to-green-600 hover:from-emerald-400 hover:to-green-500",
                tone === "rose" && "bg-gradient-to-br from-rose-500 to-pink-600 hover:from-rose-400 hover:to-pink-500"
            )}
        >
            {icon}
            {children}
        </button>
    );
}

function ConfirmDropdownItem({
    trigger,
    title,
    description,
    onConfirm,
}: {
    trigger: ReactNode;
    title: string;
    description: string;
    onConfirm: () => void;
}) {
    return (
        <AlertDialog>
            <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>{title}</AlertDialogTitle>
                    <AlertDialogDescription>{description}</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={onConfirm}>Confirm</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}

export function statusLabel(status: string) {
    return STATUS_LABELS[status] ?? status;
}
