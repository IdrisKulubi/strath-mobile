import Link from "next/link";

export const metadata = {
  title: "How it works - Strathspace",
  description:
    "How Strathspace works: curated matches, mutual interest, and help moving from chat to real life.",
};

const linkClass =
  "text-white/80 underline-offset-2 transition-colors hover:text-white hover:underline";

export default function HowItWorksPage() {
  return (
    <div className="min-h-dvh bg-zinc-950 text-zinc-200 antialiased">
      <div className="mx-auto max-w-3xl px-5 py-10 pb-20 font-sans text-[15px] leading-relaxed sm:px-8 sm:py-14 sm:text-base">
        <Link
          href="/"
          className="mb-8 inline-block text-sm text-white/55 transition-colors hover:text-white"
        >
          ← Back to home
        </Link>

        <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
          How Strathspace works
        </h1>
        <p className="mt-3 text-zinc-400">
          A short guide to the flow—and what makes us different from a typical endless-swipe app.
        </p>

        <section className="mt-12 space-y-4">
          <h2 className="text-xl font-semibold text-white sm:text-2xl">
            What makes Strathspace different
          </h2>
          <ul className="list-disc space-y-2 pl-5 text-zinc-300">
            <li>
              <span className="text-white/90">Curated, not infinite.</span> You get a small set of
              thoughtful matches to consider—not an endless catalogue designed to keep you
              scrolling.
            </li>
            <li>
              <span className="text-white/90">Mutual intent first.</span> Interest is private until
              it makes sense to move forward, so you spend less energy performing for strangers.
            </li>
            <li>
              <span className="text-white/90">Built toward meeting.</span> The product nudges you
              from match to conversation to a short call, then toward planning a date when you
              both want it—not toward collecting matches as a score.
            </li>
            <li>
              <span className="text-white/90">Safety in the loop.</span> You can report profiles or
              messages in-app; serious violations can mean immediate removal. See our{" "}
              <Link href="/terms" className={linkClass}>
                Terms
              </Link>{" "}
              and{" "}
              <Link href="/privacy" className={linkClass}>
                Privacy Policy
              </Link>
              .
            </li>
          </ul>
        </section>

        <section className="mt-12 space-y-6">
          <h2 className="text-xl font-semibold text-white sm:text-2xl">The journey</h2>
          <ol className="space-y-6">
            <li className="flex gap-4">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/12 text-sm font-semibold text-white">
                1
              </span>
              <div>
                <h3 className="font-medium text-white">Create your profile</h3>
                <p className="mt-1 text-zinc-300">
                  Photos, bio, and the basics that help others understand you—honestly and clearly.
                </p>
              </div>
            </li>
            <li className="flex gap-4">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/12 text-sm font-semibold text-white">
                2
              </span>
              <div>
                <h3 className="font-medium text-white">Receive curated matches</h3>
                <p className="mt-1 text-zinc-300">
                  Each day you see a focused set of suggestions based on compatibility—not a
                  firehose of random profiles.
                </p>
              </div>
            </li>
            <li className="flex gap-4">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/12 text-sm font-semibold text-white">
                3
              </span>
              <div>
                <h3 className="font-medium text-white">Choose who you&apos;re open to meeting</h3>
                <p className="mt-1 text-zinc-300">
                  Your choices stay private on your side until there&apos;s a reason to surface mutual
                  interest.
                </p>
              </div>
            </li>
            <li className="flex gap-4">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/12 text-sm font-semibold text-white">
                4
              </span>
              <div>
                <h3 className="font-medium text-white">When it&apos;s mutual, unlock the next step</h3>
                <p className="mt-1 text-zinc-300">
                  If you both signal you&apos;re in, you move into the flow designed for real
                  conversation—not endless small talk in limbo.
                </p>
              </div>
            </li>
            <li className="flex gap-4">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/12 text-sm font-semibold text-white">
                5
              </span>
              <div>
                <h3 className="font-medium text-white">Optional short call</h3>
                <p className="mt-1 text-zinc-300">
                  A brief voice moment helps you confirm chemistry and comfort before committing to a
                  full date—without the pressure of a long video interview.
                </p>
              </div>
            </li>
            <li className="flex gap-4">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/12 text-sm font-semibold text-white">
                6
              </span>
              <div>
                <h3 className="font-medium text-white">Plan a date when you&apos;re ready</h3>
                <p className="mt-1 text-zinc-300">
                  Strathspace helps you organise a real meet-up when you both want one—so the app
                  is a bridge to life offline, not a substitute for it.
                </p>
              </div>
            </li>
          </ol>
        </section>

        <section className="mt-12 rounded-xl border border-white/10 bg-white/4 p-6 sm:p-8">
          <h2 className="text-lg font-semibold text-white">Ready to try it?</h2>
          <p className="mt-2 text-sm text-zinc-400">
            Download Strathspace on the App Store or Google Play from the{" "}
            <Link href="/" className={linkClass}>
              home page
            </Link>
            .
          </p>
        </section>

        <footer className="mt-14 border-t border-white/10 pt-8 text-sm text-zinc-500">
          <p>© {new Date().getFullYear()} Strathspace. All rights reserved.</p>
          <p className="mt-3 flex flex-wrap gap-x-4 gap-y-1">
            <Link href="/support" className="text-white/60 underline-offset-2 hover:text-white hover:underline">
              Support
            </Link>
            <Link href="/privacy" className="text-white/60 underline-offset-2 hover:text-white hover:underline">
              Privacy
            </Link>
            <Link href="/terms" className="text-white/60 underline-offset-2 hover:text-white hover:underline">
              Terms
            </Link>
          </p>
        </footer>
      </div>
    </div>
  );
}
