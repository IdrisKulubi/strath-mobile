import Link from "next/link";

export const metadata = {
  title: "Terms of Service - Strathspace",
  description: "Terms of Service for Strathspace mobile application",
};

const linkClass =
  "text-white/80 underline-offset-2 transition-colors hover:text-white hover:underline";

export default function TermsPage() {
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
          Terms of Service
        </h1>
        <p className="mt-2 text-sm text-zinc-500">Last updated: April 2026</p>

        <section className="mt-10 space-y-4">
          <h2 className="text-xl font-semibold text-white sm:text-2xl">
            1. Acceptance of Terms
          </h2>
          <p>
            By downloading, accessing, or using Strathspace (&quot;the App&quot;), you agree to be bound by
            these Terms of Service (&quot;Terms&quot;). If you do not agree to these Terms, do not use
            the App. We reserve the right to modify these Terms at any time, and your continued use
            of the App constitutes acceptance of any changes.
          </p>
        </section>

        <section className="mt-10 space-y-4">
          <h2 className="text-xl font-semibold text-white sm:text-2xl">2. Eligibility</h2>
          <p>To use Strathspace, you must:</p>
          <ul className="list-disc space-y-2 pl-5 text-zinc-300">
            <li>Be at least 18 years old</li>
            <li>
              Meet any eligibility or verification requirements shown in the app (for example age
              or identity checks), and provide accurate information when asked
            </li>
            <li>Have the legal capacity to enter into these Terms</li>
            <li>Not be prohibited from using the App under applicable laws</li>
            <li>Not have been previously banned from the platform</li>
          </ul>
        </section>

        <section className="mt-10 space-y-4">
          <h2 className="text-xl font-semibold text-white sm:text-2xl">
            3. Account Registration
          </h2>
          <p>
            You must create an account to use Strathspace. You agree to provide accurate, current,
            and complete information during registration and to update such information to keep it
            accurate, current, and complete. You are responsible for safeguarding your account
            credentials and for all activities that occur under your account.
          </p>
        </section>

        <section className="mt-10 space-y-4">
          <h2 className="text-xl font-semibold text-rose-300 sm:text-2xl">
            4. Community Guidelines & Zero Tolerance Policy
          </h2>
          <p className="font-medium text-white/95">
            Strathspace maintains a strict zero-tolerance policy for objectionable content and
            abusive behavior.
          </p>
          <p>You agree NOT to:</p>
          <ul className="list-disc space-y-2 pl-5 text-zinc-300">
            <li>
              Post, upload, or share any content that is illegal, harmful, threatening, abusive,
              harassing, defamatory, vulgar, obscene, or otherwise objectionable
            </li>
            <li>Share sexually explicit or pornographic content</li>
            <li>
              Engage in hate speech, discrimination, or harassment based on race, ethnicity,
              religion, gender, sexual orientation, disability, or any other characteristic
            </li>
            <li>Bully, intimidate, stalk, or threaten other users</li>
            <li>Impersonate any person or entity</li>
            <li>Create fake profiles or misrepresent your identity</li>
            <li>Use the App for any commercial purposes without authorization</li>
            <li>Spam, solicit, or advertise to other users</li>
            <li>Attempt to gain unauthorized access to other accounts or systems</li>
            <li>Share content that promotes violence, self-harm, or illegal activities</li>
            <li>Post content involving minors in any inappropriate context</li>
          </ul>
          <p className="font-medium text-rose-300">
            Violation of these guidelines will result in immediate account termination without
            warning.
          </p>
        </section>

        <section className="mt-10 space-y-4">
          <h2 className="text-xl font-semibold text-rose-200 sm:text-2xl">
            5. Child Safety Standards; Prohibition of CSAE and CSAM
          </h2>
          <p>
            These standards apply to <strong className="text-white">StrathSpace</strong> (the mobile
            application listed on Google Play and other app stores) and the related services we
            operate under the name <strong className="text-white">Strathspace</strong> (together, the
            &quot;App&quot;).
          </p>
          <p className="font-medium text-white/95">
            Prohibition of child sexual abuse and exploitation (CSAE)
          </p>
          <p>
            We strictly prohibit child sexual abuse and exploitation (CSAE) in any form. You must
            not use the App to create, upload, solicit, share, distribute, possess, request, or
            facilitate access to child sexual abuse material (CSAM), or to groom, entice,
            endanger, or sexualize minors. Any content or conduct that violates laws protecting
            children, or that sexualizes or depicts minors in a sexual or abusive context, is
            forbidden.
          </p>
          <p>
            Violations may result in immediate termination of your account, preservation of records
            as required by law, and referral to law enforcement and, where applicable, to
            designated reporting bodies (such as the National Center for Missing &amp; Exploited
            Children or regional equivalents).
          </p>
          <p>
            We work to comply with applicable child safety and child endangerment laws and
            regulations, and with platform policies that apply to social and dating services.
          </p>
          <p className="font-medium text-white/95">In-app reporting and feedback</p>
          <p>
            You can report users, messages, or other content through the in-app{" "}
            <strong className="text-white">Report</strong> option (for example, from a profile or
            conversation menu). Reports are reviewed by our team, typically within 24 hours, and we
            take action when violations are confirmed.
          </p>
          <p className="font-medium text-white/95">Child safety point of contact</p>
          <p>
            For questions about our CSAM prevention practices, child safety compliance, or to
            escalate a child-safety concern, contact:
          </p>
          <p>
            <span className="text-white/90">Email:</span>{" "}
            <a
              href="mailto:support@strathspace.com?subject=Child%20safety"
              className={linkClass}
            >
              support@strathspace.com
            </a>{" "}
            (please use the subject line &quot;Child safety&quot; for urgent CSAM-related reports).
          </p>
        </section>

        <section className="mt-10 space-y-4">
          <h2 className="text-xl font-semibold text-white sm:text-2xl">
            6. User-Generated Content
          </h2>
          <p>
            You retain ownership of content you create and share on Strathspace. However, by
            posting content, you grant us a non-exclusive, worldwide, royalty-free license to use,
            display, and distribute your content in connection with the App.
          </p>
          <p>
            You are solely responsible for your content and the consequences of posting it. We
            reserve the right to remove any content that violates these Terms or our Community
            Guidelines.
          </p>
        </section>

        <section className="mt-10 space-y-4">
          <h2 className="text-xl font-semibold text-white sm:text-2xl">
            7. Reporting & Moderation
          </h2>
          <p>
            We provide tools to report objectionable content and abusive users. All reports are
            reviewed by our moderation team, typically within 24 hours. We take appropriate action
            based on the severity of the violation, which may include:
          </p>
          <ul className="list-disc space-y-2 pl-5 text-zinc-300">
            <li>Warning the user</li>
            <li>Removing the offending content</li>
            <li>Temporarily suspending the account</li>
            <li>Permanently banning the user</li>
            <li>Reporting to law enforcement when required</li>
          </ul>
        </section>

        <section className="mt-10 space-y-4">
          <h2 className="text-xl font-semibold text-white sm:text-2xl">8. Blocking Users</h2>
          <p>
            You can block any user at any time. Blocked users will not be able to view your
            profile, send you messages, or interact with you in any way. Blocking is mutual and
            immediate.
          </p>
        </section>

        <section className="mt-10 space-y-4">
          <h2 className="text-xl font-semibold text-white sm:text-2xl">9. Privacy</h2>
          <p>
            Your privacy is important to us. Please review our{" "}
            <Link href="/privacy" className={linkClass}>
              Privacy Policy
            </Link>{" "}
            to understand how we collect, use, and protect your personal information. Optional AI
            features such as Wingman search and voice transcription are only available after you
            grant permission in the app.
          </p>
        </section>

        <section className="mt-10 space-y-4">
          <h2 className="text-xl font-semibold text-white sm:text-2xl">10. Safety</h2>
          <p>
            While we strive to create a safe environment, we cannot guarantee the behavior of other
            users. You are responsible for your own safety when interacting with others. We
            recommend:
          </p>
          <ul className="list-disc space-y-2 pl-5 text-zinc-300">
            <li>Never sharing personal financial information</li>
            <li>Meeting in public places for first meetings</li>
            <li>Informing friends or family about your plans</li>
            <li>Trusting your instincts and reporting suspicious behavior</li>
          </ul>
        </section>

        <section className="mt-10 space-y-4">
          <h2 className="text-xl font-semibold text-white sm:text-2xl">
            11. Intellectual Property
          </h2>
          <p>
            The App and its original content, features, and functionality are owned by Strathspace
            and are protected by international copyright, trademark, and other intellectual property
            laws. You may not copy, modify, distribute, or create derivative works without our
            express written permission.
          </p>
        </section>

        <section className="mt-10 space-y-4">
          <h2 className="text-xl font-semibold text-white sm:text-2xl">12. Disclaimers</h2>
          <p className="text-zinc-300">
            THE APP IS PROVIDED &quot;AS IS&quot; AND &quot;AS AVAILABLE&quot; WITHOUT WARRANTIES OF ANY KIND. WE DO
            NOT GUARANTEE THAT THE APP WILL BE UNINTERRUPTED, SECURE, OR ERROR-FREE. WE ARE NOT
            RESPONSIBLE FOR THE CONDUCT OF ANY USER ON OR OFF THE APP.
          </p>
        </section>

        <section className="mt-10 space-y-4">
          <h2 className="text-xl font-semibold text-white sm:text-2xl">
            13. Limitation of Liability
          </h2>
          <p className="text-zinc-300">
            TO THE MAXIMUM EXTENT PERMITTED BY LAW, STRATHSPACE SHALL NOT BE LIABLE FOR ANY
            INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES ARISING FROM YOUR USE
            OF THE APP, INCLUDING BUT NOT LIMITED TO DAMAGES FOR LOSS OF PROFITS, GOODWILL, USE,
            DATA, OR OTHER INTANGIBLE LOSSES.
          </p>
        </section>

        <section className="mt-10 space-y-4">
          <h2 className="text-xl font-semibold text-white sm:text-2xl">14. Termination</h2>
          <p>
            We may terminate or suspend your account immediately, without prior notice or liability,
            for any reason, including breach of these Terms. Upon termination, your right to use the
            App will cease immediately.
          </p>
        </section>

        <section className="mt-10 space-y-4">
          <h2 className="text-xl font-semibold text-white sm:text-2xl">15. Governing Law</h2>
          <p>
            These Terms shall be governed by and construed in accordance with the laws of Kenya,
            without regard to its conflict of law provisions.
          </p>
        </section>

        <section className="mt-10 space-y-4">
          <h2 className="text-xl font-semibold text-white sm:text-2xl">16. Contact Us</h2>
          <p>If you have any questions about these Terms, please contact us at:</p>
          <p>
            <span className="text-white/90">Email:</span>{" "}
            <a href="mailto:support@strathspace.com" className={linkClass}>
              support@strathspace.com
            </a>
          </p>
        </section>

        <footer className="mt-14 border-t border-white/10 pt-8 text-sm text-zinc-500">
          <p>© 2026 Strathspace. All rights reserved.</p>
          <p className="mt-3">
            <Link href="/privacy" className="text-white/60 underline-offset-2 hover:text-white hover:underline">
              Privacy Policy
            </Link>
          </p>
        </footer>
      </div>
    </div>
  );
}
