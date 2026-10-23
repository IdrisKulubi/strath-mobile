"use client";

import { useSearchParams } from "next/navigation";
import { Beaker } from "lucide-react";

export function AdminDemoBanner() {
    const searchParams = useSearchParams();
    const isDemo = searchParams.get("demo") === "1";

    if (!isDemo) return null;

    return (
        <div className="border-b border-amber-400/25 bg-amber-400/10 px-4 py-1.5 text-center text-[11px] font-medium text-amber-100">
            <span className="inline-flex items-center gap-1.5">
                <Beaker className="size-3" />
                Demo mode — actions are simulated; no push notifications are sent and no data is saved.
            </span>
        </div>
    );
}
