import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
    robots: { index: false, follow: false },
};

/** Match DESIGN.md background so in-app browser chrome feels on-brand. */
export const viewport: Viewport = {
    themeColor: "#141118",
    colorScheme: "dark",
};

export default function PaymentsLayout({ children }: { children: ReactNode }) {
    return children;
}
