import { RotateCcw } from "lucide-react";

import { RestoreMatchPanel } from "./_restore-match-panel";

export default function AdminRestoreMatchPage() {
    return (
        <div className="p-8">
            <div className="mb-6 flex items-start gap-3">
                <div className="flex size-10 items-center justify-center rounded-xl bg-[#B8327A]/20 text-[#D94A8F]">
                    <RotateCcw className="size-5" strokeWidth={1.75} />
                </div>
                <div>
                    <h1 className="text-2xl font-semibold tracking-tight text-white">
                        Restore & create match
                    </h1>
                    <p className="mt-1 max-w-2xl text-sm leading-relaxed text-white/50">
                        Create a new intro between any two users, or restore one after a mistaken pass
                        or cancel. Both people get a candidate card in the app and a push notification.
                    </p>
                </div>
            </div>

            <RestoreMatchPanel />
        </div>
    );
}
