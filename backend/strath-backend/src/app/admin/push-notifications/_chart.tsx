"use client";

import {
    ResponsiveContainer,
    LineChart,
    Line,
    XAxis,
    YAxis,
    Tooltip,
    Legend,
    CartesianGrid,
} from "recharts";

import type { PushNotificationDailyPoint } from "@/lib/actions/admin-push-notifications";

const LINES = [
    { key: "push_token_registered", label: "Token registered", color: "#f472b6" },
    { key: "push_pre_prompt_accepted", label: "Prompt accepted", color: "#34d399" },
    { key: "push_pre_prompt_dismissed", label: "Prompt dismissed", color: "#94a3b8" },
] as const;

export function PushNotificationsChart({ data }: { data: PushNotificationDailyPoint[] }) {
    return (
        <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                    <XAxis
                        dataKey="date"
                        tick={{ fill: "#9ca3af", fontSize: 11 }}
                        tickFormatter={(v) => v.slice(5)}
                    />
                    <YAxis tick={{ fill: "#9ca3af", fontSize: 11 }} allowDecimals={false} />
                    <Tooltip
                        contentStyle={{
                            backgroundColor: "#1a1a2e",
                            border: "1px solid rgba(255,255,255,0.1)",
                            borderRadius: 12,
                            fontSize: 12,
                        }}
                    />
                    <Legend wrapperStyle={{ fontSize: 12, color: "#9ca3af" }} />
                    {LINES.map((line) => (
                        <Line
                            key={line.key}
                            type="monotone"
                            dataKey={line.key}
                            name={line.label}
                            stroke={line.color}
                            strokeWidth={2}
                            dot={false}
                        />
                    ))}
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
}
