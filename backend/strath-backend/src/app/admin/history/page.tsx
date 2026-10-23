import { getAdminDateHistory } from "@/lib/actions/admin";
import { DEMO_HISTORY } from "@/lib/admin/demo-data";
import { HistoryView } from "./_view";

export default async function AdminHistoryPage({
    searchParams,
}: {
    searchParams: Promise<{ demo?: string }>;
}) {
    const { demo } = await searchParams;
    const isDemo = demo === "1";

    if (isDemo) {
        return <HistoryView rows={DEMO_HISTORY} isDemo />;
    }

    const rows = await getAdminDateHistory();
    return <HistoryView rows={rows} isDemo={false} />;
}
