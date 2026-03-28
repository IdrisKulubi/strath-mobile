"use client";

import Link from "next/link";
import { type ComponentType } from "react";
import { usePathname } from "next/navigation";
import {
    BarChart3,
    Clock3,
    CalendarCheck2,
    CalendarClock,
    ChevronDown,
    ClipboardList,
    LayoutDashboard,
    MapPinned,
    ShieldCheck,
    Sparkles,
    Users,
} from "lucide-react";

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarGroupContent,
    SidebarGroupLabel,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarMenuSub,
    SidebarMenuSubButton,
    SidebarMenuSubItem,
} from "@/components/ui/sidebar";

type NavItem = {
    href: string;
    label: string;
    icon: ComponentType<{ className?: string }>;
};

type NavGroup = {
    label: string;
    icon: ComponentType<{ className?: string }>;
    items: NavItem[];
};

const topLevelItems: NavItem[] = [
    { href: "/admin", label: "Overview", icon: LayoutDashboard },
];

const groups: NavGroup[] = [
    {
        label: "Operations",
        icon: ClipboardList,
        items: [
            { href: "/admin/verification", label: "Verification", icon: ShieldCheck },
            { href: "/admin/date-requests", label: "Date Requests", icon: ClipboardList },
            { href: "/admin/pending-dates", label: "Arranging", icon: CalendarClock },
            { href: "/admin/scheduled-dates", label: "Upcoming", icon: CalendarCheck2 },
            { href: "/admin/history", label: "History", icon: Clock3 },
            { href: "/admin/locations", label: "Locations", icon: MapPinned },
        ],
    },
    {
        label: "Insights",
        icon: Sparkles,
        items: [
            { href: "/admin/users", label: "Users", icon: Users },
            { href: "/admin/metrics", label: "Metrics", icon: BarChart3 },
        ],
    },
];

function isActive(pathname: string, href: string) {
    return pathname === href || pathname.startsWith(`${href}/`);
}

export function AdminSidebar() {
    const pathname = usePathname();

    return (
        <Sidebar collapsible="icon" variant="inset" className="border-r-0">
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild tooltip="Strathspace Admin">
                            <Link href="/admin">
                                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                                    <Sparkles className="size-4" />
                                </div>
                                <div className="grid flex-1 text-left text-sm leading-tight">
                                    <span className="truncate font-semibold">Strathspace</span>
                                    <span className="truncate text-xs text-muted-foreground">Admin Console</span>
                                </div>
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <SidebarContent>
                <SidebarGroup>
                    <SidebarGroupLabel>Main</SidebarGroupLabel>
                    <SidebarGroupContent>
                        <SidebarMenu>
                            {topLevelItems.map((item) => (
                                <SidebarMenuItem key={item.href}>
                                    <SidebarMenuButton
                                        asChild
                                        isActive={isActive(pathname, item.href)}
                                        tooltip={item.label}
                                    >
                                        <Link href={item.href}>
                                            <item.icon />
                                            <span>{item.label}</span>
                                        </Link>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                            ))}
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>

                {groups.map((group) => {
                    const open = group.items.some((item) => isActive(pathname, item.href));

                    return (
                        <SidebarGroup key={group.label}>
                            <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
                            <SidebarGroupContent>
                                <SidebarMenu>
                                    <Collapsible defaultOpen={open} className="group/collapsible">
                                        <SidebarMenuItem>
                                            <CollapsibleTrigger asChild>
                                                <SidebarMenuButton tooltip={group.label}>
                                                    <group.icon />
                                                    <span>{group.label}</span>
                                                    <ChevronDown className="ml-auto transition-transform group-data-[state=open]/collapsible:rotate-180" />
                                                </SidebarMenuButton>
                                            </CollapsibleTrigger>
                                            <CollapsibleContent>
                                                <SidebarMenuSub>
                                                    {group.items.map((item) => (
                                                        <SidebarMenuSubItem key={item.href}>
                                                            <SidebarMenuSubButton
                                                                asChild
                                                                isActive={isActive(pathname, item.href)}
                                                            >
                                                                <Link href={item.href}>
                                                                    <item.icon />
                                                                    <span>{item.label}</span>
                                                                </Link>
                                                            </SidebarMenuSubButton>
                                                        </SidebarMenuSubItem>
                                                    ))}
                                                </SidebarMenuSub>
                                            </CollapsibleContent>
                                        </SidebarMenuItem>
                                    </Collapsible>
                                </SidebarMenu>
                            </SidebarGroupContent>
                        </SidebarGroup>
                    );
                })}
            </SidebarContent>

            <SidebarFooter>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton asChild tooltip="Back to App" className="text-muted-foreground">
                            <Link href="/app/discover">
                                <Sparkles />
                                <span>Back to App</span>
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarFooter>
        </Sidebar>
    );
}
