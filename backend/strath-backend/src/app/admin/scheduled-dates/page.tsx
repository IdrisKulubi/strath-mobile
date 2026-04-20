import { getAdminScheduledDates } from "@/lib/actions/admin";
import { DEMO_SCHEDULED_DATES } from "@/lib/admin/demo-data";
import { UpcomingView } from "./_actions";

export default async function ScheduledDatesPage({
    searchParams,
}: {
    searchParams: Promise<{ demo?: string }>;
}) {
    const { demo } = await searchParams;
    const isDemo = demo === "1";

    if (isDemo) {
        return <UpcomingView rows={DEMO_SCHEDULED_DATES} isDemo />;
    }

    const rows = await getAdminScheduledDates();
    return <UpcomingView rows={rows} isDemo={false} />;
}
