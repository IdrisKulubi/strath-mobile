import { getAdminDateLocations, getAdminScheduledDates } from "@/lib/actions/admin";
import { DEMO_LOCATIONS, DEMO_SCHEDULED_DATES } from "@/lib/admin/demo-data";
import { UpcomingView } from "./_actions";

export default async function ScheduledDatesPage({
    searchParams,
}: {
    searchParams: Promise<{ demo?: string }>;
}) {
    const { demo } = await searchParams;
    const isDemo = demo === "1";

    if (isDemo) {
        return <UpcomingView rows={DEMO_SCHEDULED_DATES} locations={DEMO_LOCATIONS} isDemo />;
    }

    const [rows, locations] = await Promise.all([
        getAdminScheduledDates(),
        getAdminDateLocations(),
    ]);
    return <UpcomingView rows={rows} locations={locations} isDemo={false} />;
}
