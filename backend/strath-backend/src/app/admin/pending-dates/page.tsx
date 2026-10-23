import { getAdminDateLocations, getAdminPendingDates } from "@/lib/actions/admin";
import { DEMO_LOCATIONS, DEMO_PENDING_DATES } from "@/lib/admin/demo-data";
import { ArrangingView } from "./_actions";

export default async function PendingDatesPage({
    searchParams,
}: {
    searchParams: Promise<{ demo?: string }>;
}) {
    const { demo } = await searchParams;
    const isDemo = demo === "1";

    if (isDemo) {
        return <ArrangingView rows={DEMO_PENDING_DATES} locations={DEMO_LOCATIONS} isDemo />;
    }

    const [rows, locations] = await Promise.all([
        getAdminPendingDates(),
        getAdminDateLocations(),
    ]);

    return <ArrangingView rows={rows} locations={locations} isDemo={false} />;
}
