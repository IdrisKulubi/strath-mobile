import { getAdminBroadcastHistory } from "@/lib/actions/admin";

import { BroadcastComposer, BroadcastHistory } from "./_actions";

export default async function AdminBroadcastPage() {
    const history = await getAdminBroadcastHistory();

    return (
        <div className="p-8">
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-white">Broadcast</h1>
                <p className="mt-1 text-sm text-gray-400">
                    Send a push notification to a segment of your users. Great for announcing new features, opening the app to a new wave, or just saying hi.
                </p>
            </div>

            <div className="grid gap-6 lg:grid-cols-[1fr_400px]">
                <BroadcastComposer />
                <BroadcastHistory history={history} />
            </div>
        </div>
    );
}
