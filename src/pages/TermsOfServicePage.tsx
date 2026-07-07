import { LegalPageLayout } from '../components/layout/LegalPageLayout';
import { Link } from 'react-router-dom';

export function TermsOfServicePage() {
  return (
    <LegalPageLayout>
      <h1 className="font-display text-3xl font-semibold text-sage-800">Terms of Service</h1>
      <p className="mt-2 text-sm text-sage-400">Effective Date: July 6, 2026 · Last Updated: July 6, 2026</p>

      <div className="mt-8 space-y-8 text-sage-700 text-[15px] leading-relaxed">

        {/* ── Agreement ── */}
        <section>
          <h2 className="font-display text-xl font-semibold text-sage-800 mb-3">Agreement to Terms</h2>
          <p>
            These Terms of Service ("Terms") constitute a legally binding agreement between you and
            TrackHer ("we," "us," or "our") governing your access to and use of the TrackHer web
            application (the "App").
          </p>
          <p className="mt-3">
            By creating an account or using the App, you confirm that you have read, understood, and
            agree to be bound by these Terms and our{' '}
            <Link to="/privacy" className="text-sage-700 underline hover:text-sage-800">
              Privacy Policy
            </Link>
            . If you do not agree, you must not use the App.
          </p>
        </section>

        {/* ── Eligibility ── */}
        <section>
          <h2 className="font-display text-xl font-semibold text-sage-800 mb-3">Eligibility</h2>
          <p>
            You must be at least 18 years old to create an account and use TrackHer. By using the
            App, you represent and warrant that you are at least 18 years of age and have the legal
            capacity to enter into these Terms.
          </p>
        </section>

        {/* ── Description ── */}
        <section>
          <h2 className="font-display text-xl font-semibold text-sage-800 mb-3">Description of the App</h2>
          <p>
            TrackHer is a personal wellness tracking tool that allows users to log symptoms,
            medications, and lab results related to menopause and hormone replacement therapy.
            The App provides trend visualization, symptom scoring using validated clinical scales,
            pattern recognition, and the ability to generate downloadable reports.
          </p>
          <p className="mt-3">
            TrackHer is provided as a free service during its current development phase. We reserve
            the right to introduce paid features, subscription tiers, or other pricing changes in the
            future. If we do, existing users will receive advance notice, and any new pricing will
            apply only on a going-forward basis.
          </p>
        </section>

        {/* ── Not Medical Advice ── */}
        <section>
          <h2 className="font-display text-xl font-semibold text-sage-800 mb-3">Not Medical Advice</h2>
          <p className="font-medium text-sage-800">
            TrackHer is not a medical device, diagnostic tool, or healthcare service. The App does
            not provide medical advice, diagnoses, or treatment recommendations.
          </p>
          <p className="mt-3">
            All content in the App — including symptom scores, trend analyses, pattern observations,
            AI-generated summaries, and any other output — is provided for educational and personal
            record-keeping purposes only. This content is not a substitute for professional medical
            advice, diagnosis, or treatment.
          </p>
          <p className="mt-3">
            You should always consult your physician or other qualified healthcare provider before
            making any decisions about your health, starting or stopping any medication, or changing
            your treatment plan. Never disregard or delay seeking professional medical advice because
            of information presented in the App.
          </p>
          <p className="mt-3">
            If you are experiencing a medical emergency, call your local emergency services
            immediately. Do not rely on the App in any emergency situation.
          </p>
        </section>

        {/* ── Account ── */}
        <section>
          <h2 className="font-display text-xl font-semibold text-sage-800 mb-3">Your Account</h2>
          <p>
            You are responsible for maintaining the confidentiality of your account credentials and
            for all activity that occurs under your account. You agree to use a strong, unique
            password and to notify us promptly if you suspect any unauthorized access to your account.
          </p>
          <p className="mt-3">
            You may only create one account per person. Accounts are personal and may not be
            transferred to or shared with anyone else. We reserve the right to suspend or terminate
            accounts that we reasonably believe are being misused.
          </p>
        </section>

        {/* ── Acceptable Use ── */}
        <section>
          <h2 className="font-display text-xl font-semibold text-sage-800 mb-3">Acceptable Use</h2>
          <p>You agree not to:</p>
          <ul className="mt-2 ml-4 list-disc space-y-1 text-sage-600">
            <li>Use the App for any unlawful purpose or in violation of any applicable laws.</li>
            <li>Attempt to gain unauthorized access to the App's systems, other users' accounts, or data that does not belong to you.</li>
            <li>Reverse engineer, decompile, or disassemble any part of the App.</li>
            <li>Introduce viruses, malware, or any other harmful code.</li>
            <li>Use automated scripts, bots, or scrapers to access the App.</li>
            <li>Impersonate any person or entity, or misrepresent your identity or affiliation.</li>
            <li>Use the App to store data on behalf of third parties without their knowledge and consent.</li>
            <li>Interfere with or disrupt the App's infrastructure or other users' experience.</li>
          </ul>
        </section>

        {/* ── Your Data ── */}
        <section>
          <h2 className="font-display text-xl font-semibold text-sage-800 mb-3">Your Data</h2>
          <p>
            You retain ownership of all data you enter into TrackHer. We do not claim any ownership
            rights over your health data, medication records, lab results, or any other content
            you provide.
          </p>
          <p className="mt-3">
            By using the App, you grant us a limited, non-exclusive license to store, process, and
            display your data solely for the purpose of providing the App's functionality to you.
            This license terminates when you delete your account.
          </p>
          <p className="mt-3">
            You are responsible for the accuracy of the data you enter. TrackHer processes and
            displays the data you provide but does not independently verify its accuracy or
            completeness.
          </p>
        </section>

        {/* ── Data Accuracy ── */}
        <section>
          <h2 className="font-display text-xl font-semibold text-sage-800 mb-3">Accuracy of Scores and Analyses</h2>
          <p>
            TrackHer uses validated clinical instruments such as the Menopause Rating Scale (MRS)
            and the STRAW+10 staging system. While we implement these instruments carefully, the
            scores, trends, and patterns generated by the App are based solely on the data you enter
            and the algorithms we apply. They are not clinically validated for diagnostic purposes
            within this App.
          </p>
          <p className="mt-3">
            We do not guarantee the accuracy, completeness, or clinical applicability of any score,
            trend, correlation, or insight generated by the App. These outputs are tools to support
            your personal awareness and conversations with your healthcare provider — they are not
            medical determinations.
          </p>
        </section>

        {/* ── Intellectual Property ── */}
        <section>
          <h2 className="font-display text-xl font-semibold text-sage-800 mb-3">Intellectual Property</h2>
          <p>
            The App, including its design, code, features, text, graphics, logos, and user interface,
            is owned by TrackHer and is protected by copyright, trademark, and other intellectual
            property laws. You may not copy, modify, distribute, or create derivative works from any
            part of the App without our prior written consent.
          </p>
          <p className="mt-3">
            The Menopause Rating Scale (MRS) is a validated clinical instrument developed for public
            use in clinical and research settings. The STRAW+10 staging system is a published
            scientific framework. Our implementation of these instruments within the App is original
            work, but the underlying scales themselves are not our proprietary property.
          </p>
        </section>

        {/* ── Availability ── */}
        <section>
          <h2 className="font-display text-xl font-semibold text-sage-800 mb-3">Service Availability</h2>
          <p>
            We strive to keep TrackHer available and reliable, but we do not guarantee uninterrupted
            or error-free access. The App may be temporarily unavailable due to maintenance, updates,
            or circumstances beyond our control. We are not liable for any loss or inconvenience
            caused by service interruptions.
          </p>
          <p className="mt-3">
            We reserve the right to modify, suspend, or discontinue any part of the App at any time,
            with or without notice. If we permanently discontinue the App, we will make reasonable
            efforts to provide advance notice and allow you to export your data.
          </p>
        </section>

        {/* ── Disclaimers ── */}
        <section>
          <h2 className="font-display text-xl font-semibold text-sage-800 mb-3">Disclaimers</h2>
          <p className="uppercase text-sm tracking-wide text-sage-500 font-medium">
            The App is provided "as is" and "as available" without warranties of any kind, whether
            express, implied, or statutory. To the fullest extent permitted by law, we disclaim all
            warranties, including but not limited to implied warranties of merchantability, fitness
            for a particular purpose, accuracy, and non-infringement.
          </p>
          <p className="mt-3">
            Without limiting the foregoing, we make no warranty that the App will meet your
            requirements, be accurate or reliable, operate without interruption, or be free of
            errors or harmful components.
          </p>
        </section>

        {/* ── Limitation of Liability ── */}
        <section>
          <h2 className="font-display text-xl font-semibold text-sage-800 mb-3">Limitation of Liability</h2>
          <p className="uppercase text-sm tracking-wide text-sage-500 font-medium">
            To the maximum extent permitted by applicable law, TrackHer and its owner, operators,
            and affiliates shall not be liable for any indirect, incidental, special, consequential,
            or punitive damages, including but not limited to loss of data, loss of profits,
            personal injury, or damages arising from your reliance on the App or any information
            provided within it.
          </p>
          <p className="mt-3">
            Our total aggregate liability to you for all claims arising out of or relating to these
            Terms or your use of the App shall not exceed the amount you have paid us in the
            twelve (12) months preceding the claim, or fifty dollars ($50), whichever is greater.
          </p>
          <p className="mt-3">
            Some jurisdictions do not allow the exclusion or limitation of certain damages. In such
            jurisdictions, our liability is limited to the fullest extent permitted by law.
          </p>
        </section>

        {/* ── Indemnification ── */}
        <section>
          <h2 className="font-display text-xl font-semibold text-sage-800 mb-3">Indemnification</h2>
          <p>
            You agree to indemnify, defend, and hold harmless TrackHer and its owner, operators,
            and affiliates from and against any claims, liabilities, damages, losses, and expenses
            (including reasonable attorneys' fees) arising out of or in connection with your use of
            the App, your violation of these Terms, or your violation of any rights of a third party.
          </p>
        </section>

        {/* ── Termination ── */}
        <section>
          <h2 className="font-display text-xl font-semibold text-sage-800 mb-3">Termination</h2>
          <p>
            You may terminate your account at any time by deleting it through the App's Settings
            page. Upon deletion, all your data will be permanently removed as described in our{' '}
            <Link to="/privacy" className="text-sage-700 underline hover:text-sage-800">
              Privacy Policy
            </Link>
            .
          </p>
          <p className="mt-3">
            We may suspend or terminate your access to the App at any time if you violate these Terms,
            engage in conduct that is harmful to other users or the App's infrastructure, or for any
            other reason at our discretion. Where practical, we will provide notice and an opportunity
            to export your data before termination.
          </p>
        </section>

        {/* ── Governing Law ── */}
        <section>
          <h2 className="font-display text-xl font-semibold text-sage-800 mb-3">Governing Law and Disputes</h2>
          <p>
            These Terms are governed by the laws of the State of California, United States, without
            regard to conflict of law principles.
          </p>
          <p className="mt-3">
            Any disputes arising under these Terms shall first be resolved through good-faith
            negotiation. If negotiation is unsuccessful, disputes shall be resolved through binding
            arbitration administered in accordance with the rules of the American Arbitration
            Association, conducted in Riverside County, California. Each party shall bear its own
            costs, and the arbitrator's decision shall be final and binding.
          </p>
          <p className="mt-3">
            You agree that any dispute resolution proceedings will be conducted on an individual
            basis and not as part of a class, consolidated, or representative action.
          </p>
        </section>

        {/* ── Severability ── */}
        <section>
          <h2 className="font-display text-xl font-semibold text-sage-800 mb-3">Severability</h2>
          <p>
            If any provision of these Terms is found to be unenforceable or invalid by a court of
            competent jurisdiction, that provision shall be modified to the minimum extent necessary
            to make it enforceable, or if modification is not possible, severed from these Terms.
            The remaining provisions shall continue in full force and effect.
          </p>
        </section>

        {/* ── Entire Agreement ── */}
        <section>
          <h2 className="font-display text-xl font-semibold text-sage-800 mb-3">Entire Agreement</h2>
          <p>
            These Terms, together with the Privacy Policy, constitute the entire agreement between
            you and TrackHer regarding your use of the App. They supersede all prior agreements,
            understandings, and communications, whether written or oral, relating to the subject
            matter herein.
          </p>
        </section>

        {/* ── Changes ── */}
        <section>
          <h2 className="font-display text-xl font-semibold text-sage-800 mb-3">Changes to These Terms</h2>
          <p>
            We may revise these Terms from time to time. If we make material changes, we will notify
            you by posting the updated Terms within the App and updating the "Last Updated" date
            above. Your continued use of the App after updated Terms are posted constitutes your
            acceptance of the revised Terms.
          </p>
        </section>

        {/* ── Contact ── */}
        <section>
          <h2 className="font-display text-xl font-semibold text-sage-800 mb-3">Contact Us</h2>
          <p>
            If you have questions about these Terms, please contact us at:
          </p>
          <p className="mt-2 text-sage-600">
            Email: <a href="mailto:legal@trackher.app" className="text-sage-700 underline hover:text-sage-800">legal@trackher.app</a>
          </p>
        </section>

      </div>

      <div className="mt-12 border-t border-sand-200 pt-6">
        <Link to="/privacy" className="text-sm text-sage-500 underline hover:text-sage-700">
          View Privacy Policy →
        </Link>
      </div>
    </LegalPageLayout>
  );
}
