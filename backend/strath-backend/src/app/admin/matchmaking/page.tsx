import {
    getManualMatchmakingActivity,
    getManualMatchmakingPool,
} from "@/lib/actions/manual-matchmaking";

import { ManualMatchmakingBoard } from "./_manual-matchmaking-board";

export default async function AdminMatchmakingPage() {
    const [pool, activity] = await Promise.all([
        getManualMatchmakingPool(),
        getManualMatchmakingActivity(),
    ]);

    return (
        <div className="p-6">
            <header className="mb-5">
                <h1 className="text-2xl font-bold text-white">Manual Matchmaking</h1>
                <p className="mt-1 max-w-3xl text-sm text-gray-400">
                    Review profiles, compare compatibility, create curated matches, and manage the call outcome.
                </p>
            </header>
            <ManualMatchmakingBoard initialPool={pool} initialActivity={activity} />
        </div>
    );
}
