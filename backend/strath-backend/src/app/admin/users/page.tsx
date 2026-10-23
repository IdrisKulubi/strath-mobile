import { getAdminUsers } from "@/lib/actions/admin";

import { UsersExplorer } from "./_users-explorer";

export default async function AdminUsersPage() {
    const { items: users, total } = await getAdminUsers();

    return (
        <div className="p-8">
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-white">Users</h1>
                <p className="mt-1 text-sm text-gray-400">
                    {total} total · showing all users
                </p>
            </div>

            <UsersExplorer users={users} total={total} />
        </div>
    );
}
