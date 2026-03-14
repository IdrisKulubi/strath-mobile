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

interface DataPoint {
    date: string;
    date_request_sent: number;
    date_request_accepted: number;
    date_scheduled: number;
    date_attended: number;
    feedback_submitted: number;
}

const LINES = [
    { key: "date_request_sent", label: "Requests sent", color: "#a78bfa" },
    { key: "date_request_accepted", label: "Accepted", color: "#34d399" },
    { key: "date_scheduled", label: "Scheduled", color: "#60a5fa" },
    { key: "date_attended", label: "Attended", color: "#f472b6" },
];

const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
        <div className="bg-[#1a1a2e] border border-white/10 rounded-xl px-4 py-3 text-xs shadow-xl">
            <p className="text-gray-400 mb-2">{label}</p>
            {payload.map((p: any) => (
                <div key={p.dataKey} className="flex items-center gap-2 mb-1">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
                    <span className="text-gray-300">{p.name}:</span>
                    <span className="text-white font-semibold">{p.value}</span>
                </div>
            ))}
        </div>
    );
};

export function MetricsChart({ data }: { data: DataPoint[] }) {
    const formatted = data.map((d) => ({
        ...d,
        date: d.date.slice(5), // "MM-DD"
    }));

    return (
        <div className="bg-white/5 border border-white/10 rounded-xl p-6">
            <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wide mb-6">
                Activity — Last 30 Days
            </h2>
            <ResponsiveContainer width="100%" height={280}>
                <LineChart data={formatted} margin={{ top: 4, right: 16, bottom: 4, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                    <XAxis
                        dataKey="date"
                        tick={{ fill: "#6b7280", fontSize: 11 }}
                        axisLine={false}
                        tickLine={false}
                        interval="preserveStartEnd"
                    />
                    <YAxis
                        tick={{ fill: "#6b7280", fontSize: 11 }}
                        axisLine={false}
                        tickLine={false}
                        allowDecimals={false}
                        width={28}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend
                        formatter={(value) => <span style={{ color: "#9ca3af", fontSize: 11 }}>{value}</span>}
                    />
                    {LINES.map((l) => (
                        <Line
                            key={l.key}
                            type="monotone"
                            dataKey={l.key}
                            name={l.label}
                            stroke={l.color}
                            strokeWidth={2}
                            dot={false}
                            activeDot={{ r: 4, strokeWidth: 0 }}
                        />
                    ))}
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
}
