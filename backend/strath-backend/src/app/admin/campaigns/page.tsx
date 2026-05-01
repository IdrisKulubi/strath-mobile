import { getAdminCampaignHistory } from "@/lib/actions/admin-campaigns";

import { CampaignComposer, CampaignHistory } from "./_campaign-composer";

export default async function AdminCampaignsPage() {
    const history = await getAdminCampaignHistory();

    return (
        <div className="mx-auto max-w-[1600px] px-5 py-8 sm:px-8 lg:px-10">
            <header className="mb-10">
                <p className="text-[13px] font-medium text-zinc-500">
                    <span className="text-zinc-400">Admin</span>
                    <span className="mx-2 text-zinc-600" aria-hidden>
                        ·
                    </span>
                    <span className="text-zinc-300">Campaigns</span>
                </p>
                <h1 className="mt-2 text-[28px] font-semibold tracking-tight text-white sm:text-[32px]">
                    Campaigns
                </h1>
                <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-zinc-400">
                    Send polished emails and push reminders to users who dropped off during signup,
                    verification, or waitlist onboarding.
                </p>
            </header>

            <div className="grid items-start gap-8 xl:grid-cols-[minmax(0,1fr)_400px] xl:gap-10">
                <CampaignComposer />
                <CampaignHistory history={history} />
            </div>
        </div>
    );
}
