import Link from "next/link";

export const metadata = {
  title: "Privacy Policy - Strathspace",
  description: "Privacy Policy for Strathspace mobile application",
};

export default function PrivacyPage() {
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
          Privacy Policy
        </h1>
        <p className="mt-2 text-sm text-zinc-500">Last updated: January 2026</p>

        <section className="mt-10 space-y-4">
          <h2 className="text-xl font-semibold text-white sm:text-2xl">
            1. Introduction
          </h2>
          <p>
            Welcome to Strathspace (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;). We are committed to protecting
            your privacy and ensuring you have a positive experience on our platform. This
            Privacy Policy explains how we collect, use, disclose, and safeguard your information
            when you use our mobile application.
          </p>
        </section>

        <section className="mt-10 space-y-4">
          <h2 className="text-xl font-semibold text-white sm:text-2xl">
            2. Information We Collect
          </h2>

          <h3 className="mt-6 text-lg font-medium text-white/95">Account Information</h3>
          <p>When you sign up using Google Sign-In, we collect:</p>
          <ul className="list-disc space-y-2 pl-5 text-zinc-300">
            <li>Name</li>
            <li>Email address</li>
            <li>Profile picture (from your Google account)</li>
          </ul>

          <h3 className="mt-6 text-lg font-medium text-white/95">Profile Information</h3>
          <p>Information you provide to create your profile:</p>
          <ul className="list-disc space-y-2 pl-5 text-zinc-300">
            <li>Bio and personal description</li>
            <li>Photos you upload</li>
            <li>Interests and preferences</li>
            <li>
              Any optional profile fields you choose to complete (for example education or
              profession, where the app offers them)
            </li>
          </ul>

          <h3 className="mt-6 text-lg font-medium text-white/95">Usage Data</h3>
          <p>We automatically collect certain information when you use the app:</p>
          <ul className="list-disc space-y-2 pl-5 text-zinc-300">
            <li>Interactions with other users (likes, passes)</li>
            <li>Messages sent through the platform</li>
            <li>App usage patterns and preferences</li>
          </ul>

          <h3 className="mt-6 text-lg font-medium text-white/95">Optional AI Feature Data</h3>
          <p>If you enable AI features in the app, we may also process:</p>
          <ul className="list-disc space-y-2 pl-5 text-zinc-300">
            <li>Typed Wingman prompts and refinement requests</li>
            <li>Optional voice recordings submitted for transcription</li>
            <li>Relevant profile details used to personalize AI recommendations</li>
            <li>
              Wingman review responses submitted by friends when you choose to generate a Wingman
              pack
            </li>
          </ul>
        </section>

        <section className="mt-10 space-y-4">
          <h2 className="text-xl font-semibold text-white sm:text-2xl">
            3. How We Use Your Information
          </h2>
          <p>We use your information to:</p>
          <ul className="list-disc space-y-2 pl-5 text-zinc-300">
            <li>Create and manage your account</li>
            <li>Connect you with other users on the platform</li>
            <li>Provide personalized recommendations</li>
            <li>Enable messaging between matched users</li>
            <li>
              Power optional AI features such as Wingman search, voice transcription, weekly AI
              recommendations, and Wingman packs
            </li>
            <li>Improve our services and user experience</li>
            <li>Ensure the safety and security of our platform</li>
            <li>Comply with legal obligations</li>
          </ul>
        </section>

        <section className="mt-10 space-y-4">
          <h2 className="text-xl font-semibold text-white sm:text-2xl">
            4. Information Sharing
          </h2>
          <p>We do not sell your personal information. We may share your information:</p>
          <ul className="list-disc space-y-2 pl-5 text-zinc-300">
            <li>
              <span className="text-white/90">With other users:</span> Your profile information is
              visible to other Strathspace users
            </li>
            <li>
              <span className="text-white/90">Service providers:</span> We use third-party services
              (hosting, analytics, storage) that may process your data
            </li>
            <li>
              <span className="text-white/90">Google LLC / Google Gemini:</span> If you explicitly
              allow AI features, we may send typed prompts, optional voice recordings, relevant
              profile details, and Wingman review content so Gemini can transcribe audio and
              generate AI-powered recommendations
            </li>
            <li>
              <span className="text-white/90">Legal requirements:</span> When required by law or to
              protect our rights
            </li>
          </ul>
        </section>

        <section className="mt-10 space-y-4">
          <h2 className="text-xl font-semibold text-white sm:text-2xl">5. Data Security</h2>
          <p>
            We implement appropriate technical and organizational measures to protect your personal
            information. However, no method of transmission over the Internet is 100% secure, and we
            cannot guarantee absolute security.
          </p>
        </section>

        <section className="mt-10 space-y-4">
          <h2 className="text-xl font-semibold text-white sm:text-2xl">6. Your Rights</h2>
          <p>You have the right to:</p>
          <ul className="list-disc space-y-2 pl-5 text-zinc-300">
            <li>Access your personal data</li>
            <li>Correct inaccurate information</li>
            <li>Delete your account and associated data</li>
            <li>
              Withdraw consent at any time, including AI consent in the app Settings screen
            </li>
            <li>Request a copy of your data</li>
          </ul>
        </section>

        <section className="mt-10 space-y-4">
          <h2 className="text-xl font-semibold text-white sm:text-2xl">7. Data Retention</h2>
          <p>
            We retain your information for as long as your account is active or as needed to
            provide services. When you delete your account, we will delete or anonymize your
            personal information within 30 days, unless retention is required for legal purposes.
          </p>
        </section>

        <section className="mt-10 space-y-4">
          <h2 className="text-xl font-semibold text-white sm:text-2xl">
            8. Third-Party Services
          </h2>
          <p>Our app uses the following third-party services:</p>
          <ul className="list-disc space-y-2 pl-5 text-zinc-300">
            <li>
              <span className="text-white/90">Google Sign-In:</span> For authentication
            </li>
            <li>
              <span className="text-white/90">Google LLC / Google Gemini:</span> For optional AI
              search understanding, voice transcription, weekly AI recommendations, and Wingman
              packs after you grant permission in the app
            </li>
            <li>
              <span className="text-white/90">Vercel:</span> For hosting and infrastructure
            </li>
            <li>
              <span className="text-white/90">Cloudinary/UploadThing:</span> For image storage
            </li>
          </ul>
          <p>
            Each service has its own privacy policy governing their use of your data. We require
            third-party providers we share personal data with to protect that data with safeguards
            that are the same as or stronger than our own.
          </p>
        </section>

        <section className="mt-10 space-y-4">
          <h2 className="text-xl font-semibold text-white sm:text-2xl">
            9. Children And Teen Privacy
          </h2>
          <p>
            Strathspace is intended for users who are at least 18 years old. We do not knowingly
            collect personal information from users under 18. If we become aware that we have
            collected data from a user under 18, we will delete it promptly.
          </p>
        </section>

        <section className="mt-10 space-y-4">
          <h2 className="text-xl font-semibold text-white sm:text-2xl">
            10. Changes to This Policy
          </h2>
          <p>
            We may update this Privacy Policy from time to time. We will notify you of any changes
            by posting the new Privacy Policy on this page and updating the &quot;Last updated&quot;
            date.
          </p>
        </section>

        <section className="mt-10 space-y-4">
          <h2 className="text-xl font-semibold text-white sm:text-2xl">11. Contact Us</h2>
          <p>
            If you have any questions about this Privacy Policy or our data practices, please
            contact us at:
          </p>
          <p className="mt-4 text-zinc-300">
            <span className="text-white/90">Email:</span> support@strathspace.com
            <br />
            <span className="text-white/90">App:</span> Strathspace
          </p>
        </section>

        <footer className="mt-14 border-t border-white/10 pt-8 text-sm text-zinc-500">
          <p>© 2026 Strathspace. All rights reserved.</p>
          <p className="mt-3">
            <Link href="/terms" className="text-white/60 underline-offset-2 hover:text-white hover:underline">
              Terms of Service
            </Link>
          </p>
        </footer>
      </div>
    </div>
  );
}
