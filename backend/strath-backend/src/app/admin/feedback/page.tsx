import Link from "next/link";
import {
    CalendarDays,
    ChevronLeft,
    ChevronRight,
    Mail,
    MessageSquareText,
    Phone,
    Star,
} from "lucide-react";

import {
    ADMIN_FEEDBACK_PERIODS,
    ADMIN_FEEDBACK_SOURCES,
    getAdminFeedback,
    type AdminFeedbackPeriod,
    type AdminFeedbackSource,
} from "@/lib/actions/admin-feedback";

const SOURCE_FILTERS: { value: AdminFeedbackSource; label: string }[] = [
    { value: "all", label: "All feedback" },
    { value: "app", label: "General" },
    { value: "matchmaker_v2", label: "Matchmaker V2" },
];

const PERIOD_FILTERS: { value: AdminFeedbackPeriod; label: string }[] = [
    { value: "today", label: "Today" },
    { value: "2d", label: "Last 2 days" },
    { value: "7d", label: "Last 7 days" },
    { value: "30d", label: "Last month" },
    { value: "1y", label: "Last year" },
    { value: "all", label: "All time" },
];

function isSource(value: string | undefined): value is AdminFeedbackSource {
    return ADMIN_FEEDBACK_SOURCES.some((item) => item === value);
}

function isPeriod(value: string | undefined): value is AdminFeedbackPeriod {
    return ADMIN_FEEDBACK_PERIODS.some((item) => item === value);
}

function feedbackHref(source: AdminFeedbackSource, period: AdminFeedbackPeriod, page?: number) {
    const params = new URLSearchParams();
    if (source !== "all") params.set("source", source);
    if (period !== "7d") params.set("period", period);
    if (page && page > 1) params.set("page", String(page));
    const query = params.toString();
    return query ? `/admin/feedback?${query}` : "/admin/feedback";
}

function formatDate(value: string) {
    return new Intl.DateTimeFormat("en-KE", {
        timeZone: "Africa/Nairobi",
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    }).format(new Date(value));
}

function displayMessage(message: string) {
    return message.replace(/^\[(?:matchmaker_v2|feature_request|bug|general|complaint|other)\]\s*/i, "");
}

function generalCategory(message: string) {
    const match = message.match(/^\[(feature_request|bug|general|complaint|other)\]/i);
    if (!match) return "General";
    return match[1].replace(/_/g, " ").replace(/^./, (character) => character.toUpperCase());
}

function SourceBadge({ source, message }: { source: string; message: string }) {
    const matchmaker = source === "matchmaker_v2";
    return (
        <span
            className={`inline-flex w-fit items-center rounded-md px-2 py-1 text-[11px] font-medium ring-1 ring-inset ${
                matchmaker
                    ? "bg-[#D94A8F]/10 text-[#ED72AC] ring-[#D94A8F]/20"
                    : "bg-white/[0.05] text-white/55 ring-white/[0.08]"
            }`}
        >
            {matchmaker ? "Matchmaker V2" : generalCategory(message)}
        </span>
    );
}

function Rating({ rating }: { rating: number | null }) {
    if (rating == null) return <span className="text-xs text-white/30">Not rated</span>;
    return (
        <span className="inline-flex items-center gap-1 text-sm font-medium text-amber-300">
            <Star className="size-3.5 fill-current" aria-hidden="true" />
            <span>{rating}/5</span>
            <span className="sr-only">stars</span>
        </span>
    );
}

function ContactDetails({
    email,
    phone,
}: {
    email: string | null;
    phone: string | null;
}) {
    if (!email && !phone) {
        return <span className="text-xs text-white/30">Contact hidden</span>;
    }

    return (
        <div className="space-y-1.5 text-xs">
            {email ? (
                <a className="flex items-center gap-1.5 text-white/55 hover:text-white" href={`mailto:${email}`}>
                    <Mail className="size-3.5 shrink-0" aria-hidden="true" />
                    <span className="max-w-52 truncate">{email}</span>
                </a>
            ) : null}
            {phone ? (
                <a className="flex items-center gap-1.5 text-white/55 hover:text-white" href={`tel:${phone}`}>
                    <Phone className="size-3.5 shrink-0" aria-hidden="true" />
                    <span>{phone}</span>
                </a>
            ) : null}
        </div>
    );
}

function Stat({ label, value, detail }: { label: string; value: string; detail: string }) {
    return (
        <div className="border-l border-white/[0.08] pl-4 first:border-l-0 first:pl-0">
            <p className="text-xl font-semibold tracking-tight text-white">{value}</p>
            <p className="mt-0.5 text-xs font-medium text-white/60">{label}</p>
            <p className="mt-1 text-[11px] text-white/30">{detail}</p>
        </div>
    );
}

export default async function AdminFeedbackPage({
    searchParams,
}: {
    searchParams: Promise<{ source?: string; period?: string; page?: string }>;
}) {
    const params = await searchParams;
    const source = isSource(params.source) ? params.source : "all";
    const period = isPeriod(params.period) ? params.period : "7d";
    const requestedPage = Math.max(1, Number.parseInt(params.page ?? "1", 10) || 1);
    const result = await getAdminFeedback({ source, period, page: requestedPage });
    const periodLabel = PERIOD_FILTERS.find((item) => item.value === period)?.label ?? "Last 7 days";

    return (
        <main className="mx-auto w-full max-w-[1500px] p-4 sm:p-6 lg:p-8">
            <header className="mb-7 flex items-start gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#B8327A]/20 text-[#D94A8F]">
                    <MessageSquareText className="size-5" strokeWidth={1.75} aria-hidden="true" />
                </div>
                <div>
                    <h1 className="text-2xl font-semibold tracking-tight text-white">Feedback</h1>
                    <p className="mt-1 max-w-2xl text-sm leading-relaxed text-white/50">
                        Review general app comments and Matchmaker V2 ratings, with the contact context needed to follow up.
                    </p>
                </div>
            </header>

            <section
                aria-label={`Feedback summary for ${periodLabel}`}
                className="mb-6 grid grid-cols-2 gap-x-4 gap-y-5 border-y border-white/[0.08] py-4 sm:grid-cols-4 sm:gap-x-6"
            >
                <Stat label="All responses" value={String(result.summary.total)} detail={periodLabel} />
                <Stat label="General" value={String(result.summary.general)} detail="App feedback" />
                <Stat label="Matchmaker V2" value={String(result.summary.matchmakerV2)} detail="Feature ratings" />
                <Stat
                    label="Average rating"
                    value={result.summary.averageRating == null ? "—" : `${result.summary.averageRating}/5`}
                    detail="Matchmaker V2"
                />
            </section>

            <div className="mb-5 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
                <div>
                    <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-white/35">Feedback type</p>
                    <nav aria-label="Feedback type" className="flex flex-wrap gap-2">
                        {SOURCE_FILTERS.map((item) => (
                            <Link
                                key={item.value}
                                href={feedbackHref(item.value, period)}
                                aria-current={source === item.value ? "page" : undefined}
                                className={`rounded-lg px-3 py-2 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D94A8F] ${
                                    source === item.value
                                        ? "bg-[#B8327A] text-white"
                                        : "bg-white/[0.05] text-white/50 ring-1 ring-inset ring-white/[0.07] hover:bg-white/[0.09] hover:text-white"
                                }`}
                            >
                                {item.label}
                            </Link>
                        ))}
                    </nav>
                </div>

                <div>
                    <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-white/35">Period</p>
                    <nav aria-label="Feedback period" className="flex flex-wrap gap-2">
                        {PERIOD_FILTERS.map((item) => (
                            <Link
                                key={item.value}
                                href={feedbackHref(source, item.value)}
                                aria-current={period === item.value ? "page" : undefined}
                                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D94A8F] ${
                                    period === item.value
                                        ? "bg-white/[0.12] text-white ring-1 ring-inset ring-white/[0.14]"
                                        : "text-white/45 hover:bg-white/[0.06] hover:text-white"
                                }`}
                            >
                                {item.value === "today" ? <CalendarDays className="size-3.5" aria-hidden="true" /> : null}
                                {item.label}
                            </Link>
                        ))}
                    </nav>
                </div>
            </div>

            <div className="mb-3 flex items-center justify-between text-xs text-white/35">
                <p>{result.total} {result.total === 1 ? "response" : "responses"}</p>
                <p>Newest first</p>
            </div>

            {result.items.length === 0 ? (
                <section className="rounded-xl border border-dashed border-white/[0.1] px-6 py-16 text-center">
                    <MessageSquareText className="mx-auto size-7 text-white/20" aria-hidden="true" />
                    <h2 className="mt-4 text-sm font-medium text-white/70">No feedback in this view</h2>
                    <p className="mx-auto mt-1 max-w-md text-xs leading-relaxed text-white/35">
                        Try a wider period or switch feedback type. New responses will appear here automatically.
                    </p>
                </section>
            ) : (
                <>
                    <div className="hidden overflow-hidden rounded-xl border border-white/[0.08] bg-[#221C2A]/35 ring-1 ring-inset ring-white/[0.03] md:block">
                        <table className="w-full table-fixed text-sm">
                            <thead>
                                <tr className="border-b border-white/[0.07] bg-white/[0.02]">
                                    <th className="w-[17%] px-4 py-3 text-left text-[11px] font-medium text-white/40">Person</th>
                                    <th className="w-[21%] px-4 py-3 text-left text-[11px] font-medium text-white/40">Contact</th>
                                    <th className="w-[14%] px-4 py-3 text-left text-[11px] font-medium text-white/40">Type & rating</th>
                                    <th className="w-[33%] px-4 py-3 text-left text-[11px] font-medium text-white/40">Feedback</th>
                                    <th className="w-[15%] px-4 py-3 text-left text-[11px] font-medium text-white/40">Submitted</th>
                                </tr>
                            </thead>
                            <tbody>
                                {result.items.map((item, index) => (
                                    <tr key={item.id} className={`border-b border-white/[0.05] align-top last:border-0 ${index % 2 ? "bg-white/[0.015]" : ""}`}>
                                        <td className="px-4 py-4">
                                            <p className="font-medium text-white/85">{item.name || "Anonymous user"}</p>
                                            {item.userId ? <p className="mt-1 max-w-40 truncate font-mono text-[10px] text-white/25" title={item.userId}>{item.userId}</p> : null}
                                        </td>
                                        <td className="px-4 py-4"><ContactDetails email={item.email} phone={item.phoneNumber} /></td>
                                        <td className="px-4 py-4">
                                            <div className="space-y-2">
                                                <SourceBadge source={item.source} message={item.message} />
                                                <Rating rating={item.rating} />
                                            </div>
                                        </td>
                                        <td className="px-4 py-4">
                                            <p className="whitespace-pre-wrap break-words text-[13px] leading-relaxed text-white/70">{displayMessage(item.message)}</p>
                                        </td>
                                        <td className="px-4 py-4 text-xs leading-relaxed text-white/45">{formatDate(item.createdAt)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div className="space-y-3 md:hidden">
                        {result.items.map((item) => (
                            <article key={item.id} className="rounded-xl border border-white/[0.08] bg-[#221C2A]/35 p-4">
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <h2 className="font-medium text-white/85">{item.name || "Anonymous user"}</h2>
                                        <p className="mt-1 text-[11px] text-white/35">{formatDate(item.createdAt)}</p>
                                    </div>
                                    <SourceBadge source={item.source} message={item.message} />
                                </div>
                                <p className="mt-4 whitespace-pre-wrap break-words text-sm leading-relaxed text-white/70">{displayMessage(item.message)}</p>
                                <div className="mt-4 flex items-end justify-between gap-4 border-t border-white/[0.06] pt-3">
                                    <ContactDetails email={item.email} phone={item.phoneNumber} />
                                    <Rating rating={item.rating} />
                                </div>
                            </article>
                        ))}
                    </div>
                </>
            )}

            {result.totalPages > 1 ? (
                <nav aria-label="Feedback pagination" className="mt-5 flex items-center justify-between border-t border-white/[0.07] pt-4">
                    <Link
                        href={feedbackHref(source, period, Math.max(1, result.page - 1))}
                        aria-disabled={result.page <= 1}
                        className={`inline-flex items-center gap-1 rounded-lg px-3 py-2 text-xs font-medium ring-1 ring-inset ring-white/[0.08] ${
                            result.page <= 1 ? "pointer-events-none text-white/20" : "text-white/65 hover:bg-white/[0.06] hover:text-white"
                        }`}
                    >
                        <ChevronLeft className="size-3.5" aria-hidden="true" /> Previous
                    </Link>
                    <p className="text-xs text-white/40">Page {result.page} of {result.totalPages}</p>
                    <Link
                        href={feedbackHref(source, period, Math.min(result.totalPages, result.page + 1))}
                        aria-disabled={result.page >= result.totalPages}
                        className={`inline-flex items-center gap-1 rounded-lg px-3 py-2 text-xs font-medium ring-1 ring-inset ring-white/[0.08] ${
                            result.page >= result.totalPages ? "pointer-events-none text-white/20" : "text-white/65 hover:bg-white/[0.06] hover:text-white"
                        }`}
                    >
                        Next <ChevronRight className="size-3.5" aria-hidden="true" />
                    </Link>
                </nav>
            ) : null}
        </main>
    );
}

