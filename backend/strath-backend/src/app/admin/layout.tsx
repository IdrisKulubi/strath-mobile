import { requireAdmin } from "@/lib/admin-auth";
import Link from "next/link";
import { ReactNode } from "react";

const NAV = [
    { href: "/admin", label: "Overview", icon: "Overview" },
    { href: "/admin/verification", label: "Verification", icon: "Verify" },
    { href: "/admin/date-requests", label: "Date Requests", icon: "Requests" },
    { href: "/admin/pending-dates", label: "Pending Setup", icon: "Pending" },
    { href: "/admin/scheduled-dates", label: "Scheduled Dates", icon: "Dates" },
    { href: "/admin/users", label: "Users", icon: "Users" },
    { href: "/admin/metrics", label: "Metrics", icon: "Metrics" },
];

export default async function AdminLayout({ children }: { children: ReactNode }) {
    await requireAdmin();

    return (
        <div className="flex min-h-screen bg-[#0a0a14] text-white">
            <aside className="flex w-60 shrink-0 flex-col border-r border-white/10">
                <div className="border-b border-white/10 p-5">
                    <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-purple-400">
                        Strathspace
                    </p>
                    <p className="text-lg font-bold text-white">Admin</p>
                </div>
                <nav className="flex-1 space-y-1 p-3">
                    {NAV.map((item) => (
                        <Link
                            key={item.href}
                            href={item.href}
                            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-gray-300 transition-colors hover:bg-white/8 hover:text-white"
                        >
                            <span className="w-14 text-[11px] font-medium uppercase tracking-wide text-gray-500">
                                {item.icon}
                            </span>
                            <span>{item.label}</span>
                        </Link>
                    ))}
                </nav>
                <div className="border-t border-white/10 p-4">
                    <Link
                        href="/app/discover"
                        className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs text-gray-400 transition-colors hover:bg-white/8 hover:text-white"
                    >
                        <span>Back</span>
                        <span>to App</span>
                    </Link>
                </div>
            </aside>

            <main className="min-w-0 flex-1 overflow-auto">{children}</main>
        </div>
    );
}
