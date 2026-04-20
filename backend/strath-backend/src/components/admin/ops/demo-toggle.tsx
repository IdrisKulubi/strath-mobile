"use client";

import { useEffect, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Beaker } from "lucide-react";

import { cn } from "@/lib/utils";

const DEMO_KEY = "admin-ops-demo-mode";

interface DemoToggleProps {
    className?: string;
}

export function DemoToggle({ className }: DemoToggleProps) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const [isPending, startTransition] = useTransition();

    const isDemo = searchParams.get("demo") === "1";

    // Persist across navigation: if localStorage says demo on, but URL doesn't, add it.
    useEffect(() => {
        if (typeof window === "undefined") return;
        const stored = window.localStorage.getItem(DEMO_KEY);
        if (stored === "1" && !isDemo) {
            const params = new URLSearchParams(searchParams.toString());
            params.set("demo", "1");
            router.replace(`${pathname}?${params.toString()}`);
        }
    }, [isDemo, pathname, router, searchParams]);

    const handleToggle = () => {
        const next = !isDemo;
        if (typeof window !== "undefined") {
            if (next) window.localStorage.setItem(DEMO_KEY, "1");
            else window.localStorage.removeItem(DEMO_KEY);
        }

        const params = new URLSearchParams(searchParams.toString());
        if (next) params.set("demo", "1");
        else params.delete("demo");

        const query = params.toString();
        startTransition(() => {
            router.replace(query ? `${pathname}?${query}` : pathname);
        });
    };

    return (
        <button
            type="button"
            onClick={handleToggle}
            disabled={isPending}
            aria-pressed={isDemo}
            className={cn(
                "group inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition-all disabled:opacity-60",
                isDemo
                    ? "border-amber-400/40 bg-amber-400/15 text-amber-200 shadow-[0_0_0_1px_rgba(251,191,36,0.15),0_8px_24px_-8px_rgba(251,191,36,0.35)]"
                    : "border-white/10 bg-white/[0.04] text-white/60 hover:border-white/20 hover:bg-white/[0.07] hover:text-white",
                className
            )}
        >
            <span
                className={cn(
                    "relative flex size-4 items-center justify-center rounded-full",
                    isDemo ? "bg-amber-400/20" : "bg-white/10"
                )}
            >
                <Beaker className={cn("size-3", isDemo ? "text-amber-300" : "text-white/60")} strokeWidth={2} />
                {isDemo && (
                    <span className="absolute inset-0 animate-ping rounded-full bg-amber-400/30" aria-hidden />
                )}
            </span>
            <span>{isDemo ? "Demo mode on" : "Demo mode"}</span>
        </button>
    );
}
