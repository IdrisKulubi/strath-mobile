"use client";

import { useTransition } from "react";
import { suspendUser, reinstateUser, setUserRole } from "@/lib/actions/admin";

export function UserActions({ userId, isSuspended, role }: { userId: string; isSuspended: boolean; role: string }) {
    const [isPending, startTransition] = useTransition();

    return (
        <div className="flex gap-1.5 flex-wrap">
            {isSuspended ? (
                <button
                    onClick={() => startTransition(() => reinstateUser(userId))}
                    disabled={isPending}
                    className="px-2.5 py-1 text-xs font-medium text-white bg-green-700 hover:bg-green-600 rounded-md transition-colors disabled:opacity-50"
                >
                    Reinstate
                </button>
            ) : (
                <button
                    onClick={() => startTransition(() => suspendUser(userId))}
                    disabled={isPending}
                    className="px-2.5 py-1 text-xs font-medium text-white bg-red-700 hover:bg-red-600 rounded-md transition-colors disabled:opacity-50"
                >
                    Suspend
                </button>
            )}
            {role !== "admin" && (
                <button
                    onClick={() => startTransition(() => setUserRole(userId, "admin"))}
                    disabled={isPending}
                    className="px-2.5 py-1 text-xs font-medium text-purple-300 bg-purple-700/40 hover:bg-purple-700/60 rounded-md transition-colors disabled:opacity-50"
                >
                    Make Admin
                </button>
            )}
            {role === "admin" && (
                <button
                    onClick={() => startTransition(() => setUserRole(userId, "user"))}
                    disabled={isPending}
                    className="px-2.5 py-1 text-xs font-medium text-gray-300 bg-white/8 hover:bg-white/12 rounded-md transition-colors disabled:opacity-50"
                >
                    Remove Admin
                </button>
            )}
        </div>
    );
}
