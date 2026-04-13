import Link from "next/link";

export const metadata = {
  title: "Support - Strathspace",
  description: "Get help and support for Strathspace mobile application",
};

const linkClass =
  "text-white/80 underline-offset-2 transition-colors hover:text-white hover:underline";

export default function SupportPage() {
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
          Strathspace Support
        </h1>
        <p className="mt-2 text-sm text-zinc-500 sm:text-base">
          We&apos;re here to help you get the most out of Strathspace.
        </p>

        <section className="mt-10 space-y-4">
          <h2 className="text-xl font-semibold text-white sm:text-2xl">Contact us</h2>
          <p>
            For any questions, feedback, or issues with the Strathspace app, please reach out to
            us:
          </p>
          <ul className="list-disc space-y-2 pl-5 text-zinc-300">
            <li>
              <span className="text-white/90">Email:</span>{" "}
              <a href="mailto:support@strathspace.com" className={linkClass}>
                support@strathspace.com
              </a>
            </li>
            <li>
              <span className="text-white/90">Response time:</span> We typically respond within
              24–48 hours
            </li>
          </ul>
        </section>

        <section className="mt-10 space-y-6">
          <h2 className="text-xl font-semibold text-white sm:text-2xl">
            Frequently asked questions
          </h2>

          <div className="space-y-2">
            <h3 className="text-base font-semibold text-white/95">
              How do I sign up for Strathspace?
            </h3>
            <p className="text-zinc-300">
              Download the app from the{" "}
              <a
                href="https://apps.apple.com/ca/app/strathspace/id6757879443"
                target="_blank"
                rel="noopener noreferrer"
                className={linkClass}
              >
                App Store
              </a>{" "}
              or{" "}
              <a
                href="https://play.google.com/store/apps/details?id=com.strathspace.android&pcampaignid=web_share"
                target="_blank"
                rel="noopener noreferrer"
                className={linkClass}
              >
                Google Play
              </a>{" "}
              and sign in with your Google account. Use an email you check regularly so we can
              reach you if needed.
            </p>
          </div>

          <div className="space-y-2">
            <h3 className="text-base font-semibold text-white/95">How do I edit my profile?</h3>
            <p className="text-zinc-300">
              Go to the Profile tab, then tap the edit button to update your bio, photos,
              interests, and other details.
            </p>
          </div>

          <div className="space-y-2">
            <h3 className="text-base font-semibold text-white/95">
              How do I report a user or content?
            </h3>
            <p className="text-zinc-300">
              Tap the three-dot menu on any profile or in a chat conversation, then select
              &quot;Report&quot; to flag inappropriate content or behavior. Our team reviews all
              reports.
            </p>
          </div>

          <div className="space-y-2">
            <h3 className="text-base font-semibold text-white/95">How do I delete my account?</h3>
            <p className="text-zinc-300">
              Go to Profile → Settings → Delete Account. This action is permanent and will remove
              your data from our servers according to our{" "}
              <Link href="/privacy" className={linkClass}>
                Privacy Policy
              </Link>
              .
            </p>
          </div>
        </section>

        <section className="mt-10 space-y-4">
          <h2 className="text-xl font-semibold text-white sm:text-2xl">Privacy & safety</h2>
          <p>
            Your safety is our priority. Read our{" "}
            <Link href="/privacy" className={linkClass}>
              Privacy Policy
            </Link>{" "}
            to learn how we protect your data, and our{" "}
            <Link href="/terms" className={linkClass}>
              Terms of Service
            </Link>{" "}
            for community rules.
          </p>
          <p>
            If you encounter any safety concerns, please report them immediately through the app or
            email us directly.
          </p>
        </section>

        <footer className="mt-14 border-t border-white/10 pt-8 text-sm text-zinc-500">
          <p>© 2026 Strathspace. All rights reserved.</p>
          <p className="mt-3 flex flex-wrap gap-x-4 gap-y-1">
            <Link href="/privacy" className="text-white/60 underline-offset-2 hover:text-white hover:underline">
              Privacy Policy
            </Link>
            <Link href="/terms" className="text-white/60 underline-offset-2 hover:text-white hover:underline">
              Terms of Service
            </Link>
          </p>
        </footer>
      </div>
    </div>
  );
}
