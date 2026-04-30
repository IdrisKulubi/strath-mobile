import { getAdminCampaignHistory } from "@/lib/actions/admin-campaigns";

import { CampaignComposer, CampaignHistory } from "./_campaign-composer";

export default async function AdminCampaignsPage() {
    const history = await getAdminCampaignHistory();

    return (
        <div className="p-8">
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-white">Campaigns</h1>
                <p className="mt-1 max-w-3xl text-sm text-gray-400">
                    Send polished emails and push reminders to users who dropped off during signup,
                    verification, or waitlist onboarding.
                </p>
            </div>

            <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_430px]">
                <CampaignComposer />
                <CampaignHistory history={history} />
            </div>
        </div>
    );
}
