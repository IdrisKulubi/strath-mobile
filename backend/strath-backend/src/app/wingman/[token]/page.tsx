import type { Metadata } from "next";
import { WingmanWriteForm } from "./wingman-write-form";

interface Props {
    params: Promise<{ token: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { token } = await params;
    return {
        title: "Be a Wingman on StrathSpace 🪽",
        description: "Help your friend get better matches on StrathSpace",
        openGraph: {
            title: "Be a Wingman 🪽",
            description: "Answer a few quick prompts to help your friend match better",
            images: ["/og-wingman.png"],
        },
    };
}

export default async function WingmanTokenPage({ params }: Props) {
    const { token } = await params;
    return <WingmanWriteForm token={token} />;
}
