"use client";

import { AlertCircle } from "lucide-react";

export default function AdminFeedbackError({ reset }: { reset: () => void }) {
    return (
        <main className="flex min-h-[60vh] items-center justify-center p-6">
            <div className="max-w-md text-center">
                <AlertCircle className="mx-auto size-8 text-rose-400" aria-hidden="true" />
                <h1 className="mt-4 text-lg font-semibold text-white">Feedback could not be loaded</h1>
                <p className="mt-2 text-sm leading-relaxed text-white/45">The data request failed. Nothing was changed; try loading the page again.</p>
                <button type="button" onClick={reset} className="mt-5 rounded-lg bg-[#B8327A] px-4 py-2 text-sm font-medium text-white hover:bg-[#C83C86] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D94A8F]">
                    Try again
                </button>
            </div>
        </main>
    );
}

