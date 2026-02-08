import Link from "next/link";
import { PageHeader } from "../_components";

export const metadata = {
  title: "Privacy Policy | Go Girl Workout App",
  description:
    "Privacy policy for Go Girl Workout App. Learn how we collect, use, and protect your data.",
};

export default function PrivacyPolicyPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        title="Privacy Policy"
        description="Last updated: February 2026"
      />

      <article className="prose prose-neutral dark:prose-invert max-w-none space-y-6 text-sm">
        <p>
          Go Girl Workout App (&quot;we&quot;, &quot;our&quot;, or
          &quot;us&quot;) is committed to protecting your privacy. This Privacy
          Policy explains how we collect, use, disclose, and safeguard your
          information when you use our fitness and workout tracking application.
        </p>

        <section>
          <h2 className="m3-headline text-lg font-semibold mt-8 mb-3">
            1. Information We Collect
          </h2>
          <p>
            We may collect information that you provide directly to us,
            including:
          </p>
          <ul className="list-disc pl-6 space-y-1 my-2">
            <li>
              <strong>Account information:</strong> email address, display name,
              and password (stored securely and hashed).
            </li>
            <li>
              <strong>Workout data:</strong> exercises, sets, reps, weights,
              workout plans, and session history that you create or log.
            </li>
            <li>
              <strong>Personal records:</strong> best performances and metrics
              you choose to record.
            </li>
            <li>
              <strong>Device and usage data:</strong> device type, browser,
              approximate location (if permitted), and how you interact with the
              app (e.g., features used, errors) to improve our services.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="m3-headline text-lg font-semibold mt-8 mb-3">
            2. How We Use Your Information
          </h2>
          <p>We use the information we collect to:</p>
          <ul className="list-disc pl-6 space-y-1 my-2">
            <li>Provide, maintain, and improve the app and your experience.</li>
            <li>Authenticate your account and keep it secure.</li>
            <li>Store and sync your workout data across your devices.</li>
            <li>Respond to your requests, comments, or support inquiries.</li>
            <li>
              Send you service-related notices (e.g., security or policy
              updates) where permitted by law.
            </li>
            <li>
              Analyze usage patterns to fix bugs and develop new features.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="m3-headline text-lg font-semibold mt-8 mb-3">
            3. Data Storage and Security
          </h2>
          <p>
            Your data is stored using industry-standard infrastructure (e.g.,
            Supabase and related services). We use encryption in transit (TLS)
            and at rest where supported. We do not sell your personal
            information or workout data to third parties.
          </p>
        </section>

        <section>
          <h2 className="m3-headline text-lg font-semibold mt-8 mb-3">
            4. Cookies and Similar Technologies
          </h2>
          <p>
            We may use cookies, local storage, and similar technologies to
            maintain your session, remember your preferences, and understand how
            the app is used. You can control cookies through your browser
            settings; disabling them may affect some features of the app.
          </p>
        </section>

        <section>
          <h2 className="m3-headline text-lg font-semibold mt-8 mb-3">
            5. Third-Party Services
          </h2>
          <p>
            The app may use third-party services (e.g., authentication, hosting,
            analytics). These providers have their own privacy policies and may
            process data on our behalf. We encourage you to review their
            policies when relevant.
          </p>
        </section>

        <section>
          <h2 className="m3-headline text-lg font-semibold mt-8 mb-3">
            6. Your Rights
          </h2>
          <p>Depending on your location, you may have the right to:</p>
          <ul className="list-disc pl-6 space-y-1 my-2">
            <li>Access and receive a copy of your personal data.</li>
            <li>Correct or update inaccurate data.</li>
            <li>Request deletion of your data.</li>
            <li>Object to or restrict certain processing.</li>
            <li>
              Data portability (receive your data in a structured format).
            </li>
          </ul>
          <p className="mt-2">
            To exercise these rights, contact us using the details below. You
            may also have the right to lodge a complaint with a supervisory
            authority in your country.
          </p>
        </section>

        <section>
          <h2 className="m3-headline text-lg font-semibold mt-8 mb-3">
            7. Data Retention
          </h2>
          <p>
            We retain your account and workout data for as long as your account
            is active. If you delete your account, we will delete or anonymize
            your personal data in accordance with our retention policy and
            applicable law, except where we must retain it for legal or security
            purposes.
          </p>
        </section>

        <section>
          <h2 className="m3-headline text-lg font-semibold mt-8 mb-3">
            8. Children&apos;s Privacy
          </h2>
          <p>
            The app is not intended for users under 16. We do not knowingly
            collect personal information from children under 16. If you believe
            we have collected such information, please contact us so we can
            delete it.
          </p>
        </section>

        <section>
          <h2 className="m3-headline text-lg font-semibold mt-8 mb-3">
            9. Changes to This Policy
          </h2>
          <p>
            We may update this Privacy Policy from time to time. We will notify
            you of material changes by posting the updated policy in the app and
            updating the &quot;Last updated&quot; date. Your continued use of
            the app after changes constitutes acceptance of the revised policy.
          </p>
        </section>

        <section>
          <h2 className="m3-headline text-lg font-semibold mt-8 mb-3">
            10. Contact Us
          </h2>
          <p>
            If you have questions about this Privacy Policy or your personal
            data, please contact us at:
          </p>
          <p className="mt-2">
            <a
              href="https://github.com/anitabaron"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline underline-offset-4"
            >
              GitHub – anitabaron
            </a>
            {" · "}
            <a
              href="https://linkedin.com/in/anita-baron"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline underline-offset-4"
            >
              LinkedIn – Anita Baron
            </a>
          </p>
        </section>
      </article>

      <p className="text-sm text-muted-foreground pt-4">
        <Link
          href="/m3"
          className="text-primary hover:underline underline-offset-4"
        >
          ← Back to home
        </Link>
      </p>
    </div>
  );
}
