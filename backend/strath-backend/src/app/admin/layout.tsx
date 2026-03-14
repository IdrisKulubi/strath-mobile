import { requireAdmin } from "@/lib/admin-auth";
import Link from "next/link";
import { ReactNode } from "react";

const NAV = [
    { href: "/admin", label: "Overview", icon: "📊" },
    { href: "/admin/date-requests", label: "Date Requests", icon: "💌" },
    { href: "/admin/pending-dates", label: "Pending Setup", icon: "⏳" },
    { href: "/admin/scheduled-dates", label: "Scheduled Dates", icon: "📅" },
    { href: "/admin/users", label: "Users", icon: "👥" },
    { href: "/admin/metrics", label: "Metrics", icon: "📈" },
];

export default async function AdminLayout({ children }: { children: ReactNode }) {
    await requireAdmin();

    return (
        <div className="min-h-screen bg-[#0a0a14] text-white flex">
            {/* Sidebar */}
            <aside className="w-60 shrink-0 border-r border-white/10 flex flex-col">
                <div className="p-5 border-b border-white/10">
                    <p className="text-xs font-semibold text-purple-400 uppercase tracking-widest mb-1">Strathspace</p>
                    <p className="text-lg font-bold text-white">Admin</p>
                </div>
                <nav className="flex-1 p-3 space-y-1">
                    {NAV.map((item) => (
                        <Link
                            key={item.href}
                            href={item.href}
                            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-300 hover:text-white hover:bg-white/8 transition-colors"
                        >
                            <span>{item.icon}</span>
                            <span>{item.label}</span>
                        </Link>
                    ))}
                </nav>
                <div className="p-4 border-t border-white/10">
                    <Link
                        href="/app/discover"
                        className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-gray-400 hover:text-white hover:bg-white/8 transition-colors"
                    >
                        <span>←</span> Back to App
                    </Link>
                </div>
            </aside>

            {/* Main */}
            <main className="flex-1 min-w-0 overflow-auto">
                {children}
            </main>
        </div>
    );
}
