import { getAdminDateLocations } from "@/lib/actions/admin";
import { CreateLocationForm, LocationRowActions } from "./_actions";

export default async function AdminLocationsPage() {
    const locations = await getAdminDateLocations(true);

    return (
        <div className="p-8">
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-white">Locations</h1>
                <p className="text-sm text-gray-400 mt-1">
                    Manage reusable venues for manual date scheduling.
                </p>
            </div>

            <div className="grid gap-6 xl:grid-cols-[420px_minmax(0,1fr)]">
                <CreateLocationForm />

                <div className="rounded-xl border border-white/10 bg-white/5 overflow-hidden">
                    {locations.length === 0 ? (
                    <div className="p-16 text-center text-gray-500">No locations saved yet</div>
                ) : (
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-white/10">
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400">Location</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400">Vibe</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400">Notes</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400">Status</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400">Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {locations.map((location, index) => (
                                    <tr
                                        key={location.id}
                                        className={`border-b border-white/5 last:border-0 ${index % 2 === 0 ? "" : "bg-white/2"}`}
                                    >
                                        <td className="px-4 py-3">
                                            <p className="font-medium text-white">{location.name}</p>
                                            <p className="text-xs text-gray-500">{location.address}</p>
                                        </td>
                                        <td className="px-4 py-3 text-gray-400 capitalize">{location.vibe ?? "Any"}</td>
                                        <td className="px-4 py-3 text-xs text-gray-400">
                                            <div className="max-w-[240px] truncate">{location.notes || "—"}</div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span
                                                className={`rounded-md px-2 py-1 text-xs font-medium ${
                                                    location.isActive
                                                        ? "bg-emerald-500/20 text-emerald-300"
                                                        : "bg-gray-500/20 text-gray-300"
                                                }`}
                                            >
                                                {location.isActive ? "Active" : "Archived"}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <LocationRowActions location={location} />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </div>
    );
}
