"use client";

import {
    CartesianGrid,
    Legend,
    Line,
    LineChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts";

export type InteractionDataPoint = {
    date: string;
    likes: number;
    passes: number;
};

const LINES = [
    { key: "likes", label: "Likes", color: "#34d399" },
    { key: "passes", label: "Passes", color: "#f87171" },
];

export function InteractionChart({ data }: { data: InteractionDataPoint[] }) {
    if (data.length === 0) {
        return (
            <div className="flex h-48 items-center justify-center text-sm text-gray-500">
                No interaction data in the last 30 days
            </div>
        );
    }

    return (
        <ResponsiveContainer width="100%" height={220}>
            <LineChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis
                    dataKey="date"
                    tick={{ fill: "#6b7280", fontSize: 11 }}
                    tickFormatter={(value: string) => value.slice(5)}
                />
                <YAxis tick={{ fill: "#6b7280", fontSize: 11 }} allowDecimals={false} />
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
    );
}
