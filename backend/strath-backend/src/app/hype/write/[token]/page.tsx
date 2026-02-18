import type { Metadata } from "next";
import { HypeWriteForm } from "./hype-write-form";

interface Props {
    params: Promise<{ token: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { token } = await params;
    return {
        title: "Hype a Friend on StrathSpace 🔥",
        description: "Write a vouch for your friend on StrathSpace",
        openGraph: {
            title: "Hype a Friend 🔥",
            description: "Write a short vouch for your friend on StrathSpace",
            images: ["/og-hype.png"],
        },
    };
}

export default async function HypeWritePage({ params }: Props) {
    const { token } = await params;
    return <HypeWriteForm token={token} />;
}
