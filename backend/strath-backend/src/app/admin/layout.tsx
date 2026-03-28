import { requireAdmin } from "@/lib/admin-auth";
import { ReactNode } from "react";

import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";

export default async function AdminLayout({ children }: { children: ReactNode }) {
    await requireAdmin();

    return (
        <SidebarProvider>
            <AdminSidebar />
            <SidebarInset className="min-h-screen bg-[#0a0a14] text-white">
                <header className="sticky top-0 z-10 flex h-14 items-center gap-3 border-b border-white/10 bg-[#0a0a14]/95 px-4 backdrop-blur">
                    <SidebarTrigger />
                    <div>
                        <p className="text-sm font-semibold text-white">Admin</p>
                        <p className="text-xs text-gray-400">Operations dashboard</p>
                    </div>
                </header>
                <div className="min-h-[calc(100vh-3.5rem)]">{children}</div>
            </SidebarInset>
        </SidebarProvider>
    );
}
