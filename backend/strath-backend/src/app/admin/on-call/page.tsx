import { getAdminOnCallSessions } from "@/lib/actions/admin";
import { DEMO_ON_CALL } from "@/lib/admin/demo-data";
import { OnCallView } from "./_view";

export default async function AdminOnCallPage({
    searchParams,
}: {
    searchParams: Promise<{ demo?: string }>;
}) {
    const { demo } = await searchParams;
    const isDemo = demo === "1";

    if (isDemo) {
        return <OnCallView rows={DEMO_ON_CALL} isDemo />;
    }

    const rows = await getAdminOnCallSessions();
    return <OnCallView rows={rows} isDemo={false} />;
}
