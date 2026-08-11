export default function AdminFeedbackLoading() {
    return (
        <main className="mx-auto w-full max-w-[1500px] animate-pulse p-4 sm:p-6 lg:p-8">
            <div className="mb-7 flex items-center gap-3">
                <div className="size-10 rounded-xl bg-white/[0.07]" />
                <div className="space-y-2">
                    <div className="h-6 w-36 rounded bg-white/[0.08]" />
                    <div className="h-3 w-80 max-w-[70vw] rounded bg-white/[0.05]" />
                </div>
            </div>
            <div className="mb-6 grid grid-cols-2 gap-5 border-y border-white/[0.08] py-4 sm:grid-cols-4">
                {[0, 1, 2, 3].map((item) => <div key={item} className="h-14 rounded bg-white/[0.04]" />)}
            </div>
            <div className="mb-5 flex flex-wrap gap-2">
                {[0, 1, 2, 3, 4, 5].map((item) => <div key={item} className="h-8 w-24 rounded-lg bg-white/[0.05]" />)}
            </div>
            <div className="overflow-hidden rounded-xl border border-white/[0.08]">
                {[0, 1, 2, 3, 4].map((item) => <div key={item} className="h-24 border-b border-white/[0.05] bg-white/[0.025] last:border-0" />)}
            </div>
        </main>
    );
}

