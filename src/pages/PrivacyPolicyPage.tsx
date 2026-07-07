import { LegalPageLayout } from '../components/layout/LegalPageLayout';
import { Link } from 'react-router-dom';

export function PrivacyPolicyPage() {
  return (
    <LegalPageLayout>
      <h1 className="font-display text-3xl font-semibold text-sage-800">Privacy Policy</h1>
      <p className="mt-2 text-sm text-sage-400">Effective Date: July 6, 2026 · Last Updated: July 6, 2026</p>

      <div className="mt-8 space-y-8 text-sage-700 text-[15px] leading-relaxed">

        {/* ── Introduction ── */}
        <section>
          <h2 className="font-display text-xl font-semibold text-sage-800 mb-3">Introduction</h2>
          <p>
            TrackHer ("we," "us," or "our") operates the TrackHer web application (the "App"), a personal
            wellness tool designed to help individuals track symptoms, medications, and lab results
            related to menopause, perimenopause, and hormone replacement therapy (HRT/BHRT).
          </p>
          <p className="mt-3">
            We understand that the health information you enter into TrackHer is deeply personal.
            Protecting your privacy is not just a legal obligation — it is foundational to our mission.
            This Privacy Policy explains what information we collect, how we use and protect it,
            and what rights you have over your data.
          </p>
          <p className="mt-3">
            By creating an account or using the App, you agree to the practices described in this policy.
            If you do not agree, please do not use the App.
          </p>
        </section>

        {/* ── Scope ── */}
        <section>
          <h2 className="font-display text-xl font-semibold text-sage-800 mb-3">Scope of This Policy</h2>
          <p>
            This policy applies to all information collected through the TrackHer web application.
            TrackHer is a direct-to-consumer wellness application. We are not a healthcare provider,
            health plan, or healthcare clearinghouse, and we do not operate as a HIPAA-covered entity
            or business associate. However, we recognize that the information you share with us is
            health-related and sensitive, and we treat it with the care and security that such data demands.
          </p>
          <p className="mt-3">
            As a vendor of health-related information, TrackHer may be subject to the FTC Health Breach
            Notification Rule and applicable state privacy laws. We comply with all applicable federal
            and state regulations governing consumer health data.
          </p>
        </section>

        {/* ── Information We Collect ── */}
        <section>
          <h2 className="font-display text-xl font-semibold text-sage-800 mb-3">Information We Collect</h2>

          <h3 className="font-display text-lg font-medium text-sage-700 mt-4 mb-2">Account Information</h3>
          <p>
            When you create an account, we collect your email address and a display name. We use
            Supabase Authentication to manage accounts securely. Passwords are hashed and never stored
            in plain text. We do not require your legal name to use TrackHer.
          </p>

          <h3 className="font-display text-lg font-medium text-sage-700 mt-4 mb-2">Profile Information</h3>
          <p>
            During onboarding, you may provide your date of birth, menopause stage, whether you have a
            uterus, approximate date of your last menstrual period, and menstrual cycle characteristics.
            This information is used to determine your reproductive staging (using the STRAW+10 framework)
            and to personalize symptom tracking.
          </p>

          <h3 className="font-display text-lg font-medium text-sage-700 mt-4 mb-2">Health and Wellness Data</h3>
          <p>You may choose to enter the following types of data into TrackHer:</p>
          <ul className="mt-2 ml-4 list-disc space-y-1 text-sage-600">
            <li>
              <span className="font-medium text-sage-700">Symptom check-ins:</span> Daily severity
              ratings across 11 standardized symptom categories (the Menopause Rating Scale), extended
              symptom tracking across additional body systems, and quick-log entries for watch symptoms.
            </li>
            <li>
              <span className="font-medium text-sage-700">Medication records:</span> Hormone type,
              dose, delivery method, frequency, prescriber name, pharmacy name, and application details
              for your HRT/BHRT regimen.
            </li>
            <li>
              <span className="font-medium text-sage-700">Lab results:</span> Hormone levels and
              other blood work values including estradiol, progesterone, testosterone, thyroid panel,
              metabolic markers, and lipid panel results.
            </li>
            <li>
              <span className="font-medium text-sage-700">Assessment scores:</span> Results from
              validated clinical instruments used within the App.
            </li>
            <li>
              <span className="font-medium text-sage-700">Notes:</span> Free-text notes you attach
              to check-ins, medications, or lab results.
            </li>
          </ul>
          <p className="mt-3">
            All health and wellness data is entered voluntarily by you. We do not collect data from
            wearable devices, electronic health records, pharmacies, or any other external source.
            You are the sole source of your health data in TrackHer.
          </p>

          <h3 className="font-display text-lg font-medium text-sage-700 mt-4 mb-2">Automatically Collected Information</h3>
          <p>
            When you use the App, our hosting provider (Vercel) and infrastructure provider (Supabase)
            may automatically collect standard server log information including your IP address, browser
            type, device type, and pages visited. This data is used solely for security monitoring,
            error diagnosis, and service reliability.
          </p>
          <p className="mt-3">
            We do not use cookies for advertising or tracking purposes. We do not use any third-party
            analytics services. We do not embed social media widgets, advertising pixels, or
            retargeting scripts.
          </p>
        </section>

        {/* ── How We Use Your Information ── */}
        <section>
          <h2 className="font-display text-xl font-semibold text-sage-800 mb-3">How We Use Your Information</h2>
          <p>We use your information exclusively to operate and improve the App for you. Specifically:</p>
          <ul className="mt-2 ml-4 list-disc space-y-1 text-sage-600">
            <li>To authenticate your account and maintain your session.</li>
            <li>To store and display the health data you enter so you can track patterns over time.</li>
            <li>To calculate symptom scores, generate trend charts, and surface correlations between your medications, symptoms, and lab results.</li>
            <li>To generate provider-ready PDF reports from your own data, which you control and share at your discretion.</li>
            <li>To send you optional check-in reminders if you enable them.</li>
            <li>To respond to your support requests.</li>
          </ul>
          <p className="mt-3 font-medium text-sage-800">
            We do not use your health data for advertising, marketing, profiling, research, or any
            purpose other than providing the App's core functionality to you.
          </p>
        </section>

        {/* ── Data Sharing ── */}
        <section>
          <h2 className="font-display text-xl font-semibold text-sage-800 mb-3">Data Sharing and Third Parties</h2>
          <p className="font-medium text-sage-800">
            We do not sell, rent, license, or share your personal information or health data with
            third parties for their own marketing, advertising, or commercial purposes. Period.
          </p>
          <p className="mt-3">
            Your data is shared only with the following service providers, solely to the extent
            necessary to operate the App:
          </p>
          <ul className="mt-2 ml-4 list-disc space-y-1 text-sage-600">
            <li>
              <span className="font-medium text-sage-700">Supabase</span> (database and authentication):
              Your account information and health data is stored in a PostgreSQL database hosted by
              Supabase. Supabase acts as a data processor on our behalf. Supabase's infrastructure
              runs on Amazon Web Services (AWS). Data is encrypted in transit (TLS) and at rest (AES-256).
            </li>
            <li>
              <span className="font-medium text-sage-700">Vercel</span> (hosting): The App's frontend
              is hosted on Vercel. Vercel processes standard web request data (IP addresses, headers)
              to serve the App but does not have access to your health data, which is stored directly
              in Supabase.
            </li>
          </ul>
          <p className="mt-3">
            We may also disclose information if required by law, such as in response to a valid subpoena,
            court order, or government request, or if necessary to protect the rights, safety, or
            property of TrackHer, our users, or the public.
          </p>
        </section>

        {/* ── Data Security ── */}
        <section>
          <h2 className="font-display text-xl font-semibold text-sage-800 mb-3">Data Security</h2>
          <p>We implement the following security measures to protect your data:</p>
          <ul className="mt-2 ml-4 list-disc space-y-1 text-sage-600">
            <li>
              <span className="font-medium text-sage-700">Row Level Security (RLS):</span> Every
              database table uses Supabase Row Level Security policies that enforce strict per-user
              data isolation. You can only read and write your own data. No other user — and no
              application code — can access another user's records.
            </li>
            <li>
              <span className="font-medium text-sage-700">Encryption:</span> All data is encrypted
              in transit using TLS 1.2+ and at rest using AES-256 encryption on the database server.
            </li>
            <li>
              <span className="font-medium text-sage-700">Authentication:</span> Accounts are
              protected by email/password authentication with hashed passwords. Password reset
              flows use time-limited, single-use tokens sent to your verified email.
            </li>
            <li>
              <span className="font-medium text-sage-700">No client-side storage of health data:</span> Your
              health data is not stored in browser local storage, cookies, or on your device. It
              resides only in the secured database.
            </li>
          </ul>
          <p className="mt-3">
            While we take reasonable and industry-appropriate measures to protect your data, no method
            of electronic transmission or storage is 100% secure. We cannot guarantee absolute security,
            but we are committed to promptly addressing any security incident.
          </p>
        </section>

        {/* ── Data Retention ── */}
        <section>
          <h2 className="font-display text-xl font-semibold text-sage-800 mb-3">Data Retention and Deletion</h2>
          <p>
            Your data is retained for as long as you maintain an active account. Symptom histories,
            lab results, and medication records are kept to enable the long-term trend analysis that
            is central to TrackHer's purpose.
          </p>
          <p className="mt-3">
            You may delete your account at any time through the App's Settings page. When you delete
            your account, all associated data — including your profile, symptom check-ins, medication
            records, lab results, assessment scores, and any other data you have entered — is
            permanently deleted from our database. This deletion is cascading and irreversible.
          </p>
          <p className="mt-3">
            Residual copies may persist in encrypted database backups for a limited period consistent
            with our backup retention schedule, after which they are automatically purged.
          </p>
        </section>

        {/* ── Your Rights ── */}
        <section>
          <h2 className="font-display text-xl font-semibold text-sage-800 mb-3">Your Rights</h2>
          <p>
            Depending on where you live, you may have certain rights regarding your personal information.
            We honor these rights for all users regardless of location:
          </p>
          <ul className="mt-2 ml-4 list-disc space-y-1 text-sage-600">
            <li>
              <span className="font-medium text-sage-700">Access:</span> You can view all data
              stored in your account at any time through the App.
            </li>
            <li>
              <span className="font-medium text-sage-700">Correction:</span> You can edit or update
              any of your data through the App at any time.
            </li>
            <li>
              <span className="font-medium text-sage-700">Deletion:</span> You can delete your
              account and all associated data through the Settings page.
            </li>
            <li>
              <span className="font-medium text-sage-700">Portability:</span> You can generate and
              download a PDF report of your data at any time through the provider report feature.
            </li>
            <li>
              <span className="font-medium text-sage-700">No sale of data:</span> We do not sell
              your personal information. There is no need to opt out because there is nothing to
              opt out of.
            </li>
          </ul>
          <p className="mt-3">
            California residents may have additional rights under the California Consumer Privacy Act
            (CCPA/CPRA). To exercise any privacy right not available through the App's self-service
            features, please contact us using the information below.
          </p>
        </section>

        {/* ── California-Specific ── */}
        <section>
          <h2 className="font-display text-xl font-semibold text-sage-800 mb-3">Notice to California Residents</h2>
          <p>
            Under the California Consumer Privacy Act (CCPA), as amended by the California Privacy
            Rights Act (CPRA), California residents have the right to know what personal information
            is collected, request its deletion, and opt out of the sale or sharing of personal
            information. The categories of information we collect are described above.
          </p>
          <p className="mt-3">
            We do not sell or share personal information as defined by the CCPA/CPRA. We do not use
            personal information for cross-context behavioral advertising. We do not use automated
            decision-making technology to make significant decisions about consumers. We do not
            knowingly collect personal information from individuals under 16 years of age.
          </p>
        </section>

        {/* ── Breach Notification ── */}
        <section>
          <h2 className="font-display text-xl font-semibold text-sage-800 mb-3">Breach Notification</h2>
          <p>
            In the event of a data breach involving your personal health information, we will notify
            affected users without unreasonable delay and within the timeframes required by applicable
            law, including the FTC Health Breach Notification Rule and applicable state breach
            notification statutes. Notification will include a description of the breach, the types
            of information involved, and steps you can take to protect yourself.
          </p>
        </section>

        {/* ── Children ── */}
        <section>
          <h2 className="font-display text-xl font-semibold text-sage-800 mb-3">Children's Privacy</h2>
          <p>
            TrackHer is designed for adults. We do not knowingly collect personal information from
            anyone under the age of 18. If you believe a child has provided us with personal information,
            please contact us and we will promptly delete it.
          </p>
        </section>

        {/* ── International ── */}
        <section>
          <h2 className="font-display text-xl font-semibold text-sage-800 mb-3">International Users</h2>
          <p>
            TrackHer is operated from the United States. If you access the App from outside the
            United States, your data will be transferred to and processed in the United States.
            By using the App, you consent to this transfer. The United States may not provide the
            same level of data protection as your home country.
          </p>
        </section>

        {/* ── Changes ── */}
        <section>
          <h2 className="font-display text-xl font-semibold text-sage-800 mb-3">Changes to This Policy</h2>
          <p>
            We may update this Privacy Policy from time to time. If we make material changes, we will
            notify you by posting the updated policy within the App and updating the "Last Updated"
            date above. Your continued use of the App after changes are posted constitutes your
            acceptance of the updated policy. We encourage you to review this policy periodically.
          </p>
        </section>

        {/* ── Contact ── */}
        <section>
          <h2 className="font-display text-xl font-semibold text-sage-800 mb-3">Contact Us</h2>
          <p>
            If you have questions about this Privacy Policy or wish to exercise your privacy rights,
            please contact us at:
          </p>
          <p className="mt-2 text-sage-600">
            Email: <a href="mailto:privacy@trackher.app" className="text-sage-700 underline hover:text-sage-800">privacy@trackher.app</a>
          </p>
        </section>

      </div>

      <div className="mt-12 border-t border-sand-200 pt-6">
        <Link to="/terms" className="text-sm text-sage-500 underline hover:text-sage-700">
          View Terms of Service →
        </Link>
      </div>
    </LegalPageLayout>
  );
}
