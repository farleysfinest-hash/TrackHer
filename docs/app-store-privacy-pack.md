# App Store Privacy Submission Pack

Companion to the updated privacy policy (`src/pages/PrivacyPolicyPage.tsx`). Everything below matches what the app actually does, verified against the codebase 2026-07-19. Consistency between the policy, these label answers, and app behavior is what App Review checks.

---

## 1. Privacy Policy URL

App Store Connect requires a publicly reachable URL (no login). Use your deployed web app's policy route:

```
https://YOUR-DOMAIN/privacy
```

Test it in a private browser window before submitting — it must load without authentication. (It will: `/privacy` is a public route in `App.tsx`.)

## 2. App Privacy questionnaire ("nutrition label")

In App Store Connect → App Privacy, answer as follows.

**"Do you or your third-party partners collect data from this app?"** → **Yes** (data is transmitted to Supabase, which counts as "collected" even though it's your own backend).

Declare these data types, all with the same three settings — **Linked to the user's identity: Yes** · **Used for tracking: No** · **Purpose: App Functionality**:

| Category | Data type | Why |
|---|---|---|
| Contact Info | Email Address | Account signup (`profiles.email`) |
| Contact Info | Name | Display name (optional, not legal name) |
| Health & Fitness | Health | Symptoms, medications, labs, assessments |
| User Content | Other User Content | Free-text notes on check-ins/meds/labs |
| Identifiers | User ID | Supabase auth UUID |
| Sensitive Info | Sensitive Info | Health data qualifies; declaring it is the conservative, safe answer |

Do **not** declare: Location, Contacts, Browsing History, Purchase History, Diagnostics, Advertising Data — you collect none of these. No third-party analytics or ad SDKs exist in the app, so there's nothing else to disclose.

**Tracking (ATT):** answer No everywhere. The app never tracks across other companies' apps/websites, so the App Tracking Transparency prompt is not needed and must not be added.

## 3. App Review notes (paste into the "Notes" field)

> TrackHer is a menopause/HRT symptom, medication, and lab tracker. All health data is entered manually by the user — the app does not connect to HealthKit, wearables, or medical records, and does not provide medical advice (disclaimer in Terms of Service, linked in-app).
>
> Demo account for review:
> Email: [CREATE THIS — see §4]
> Password: [CREATE THIS]
> The demo account is pre-populated with sample check-ins, medications, and lab results so all charts and the PDF report feature are reviewable immediately.
>
> Account deletion is self-service: Settings → Delete Account. It permanently removes all user data and login credentials (Guideline 5.1.1(v)).
>
> No health data is used for advertising or shared with third parties (Guideline 5.1.3). Data is stored in the user's own account on Supabase (AWS) with row-level security.

## 4. To-dos before submitting (things only you can do)

1. **Create `privacy@trackher.app`** — the policy promises it. Cloudflare Email Routing does this free: Cloudflare dashboard → your domain → Email → Email Routing → forward `privacy@` to your personal inbox. Five minutes. Do the same for `support@`.
2. **Create a demo/reviewer account** in the app, seed it with a few weeks of realistic sample data, and put its credentials in the Review notes above. Reviewers reject health apps they can't get past the login screen of.
3. **Support URL** — App Store Connect requires one, separate from the privacy URL. Your marketing site or even `https://YOUR-DOMAIN/` works if it shows contact info; a simple `/support` page with the support email is better.
4. **Age rating questionnaire** — answer the medical/treatment item honestly ("Medical/Treatment Information: Infrequent/Mild"); expect a 12+ or 17+ rating. Do not select "Made for Kids."
5. **Export compliance** — the app uses only standard HTTPS/TLS. In the encryption question, select "standard encryption / exempt." No documentation needed.
6. **Category** — Primary: Health & Fitness (or Medical). Health & Fitness is the safer choice; "Medical" invites deeper scrutiny for clinical claims you don't make.

## 5. Consistency checklist (why apps get rejected)

- [ ] Policy names the real vendors: Supabase, Cloudflare, Apple ✓ (fixed — previously said Vercel)
- [ ] Policy statements match app behavior: no analytics ✓, no HealthKit ✓, local-only insight engine ✓, in-app account deletion ✓
- [ ] App Privacy labels match the policy (§2 above is derived from the policy — keep them in sync if either changes)
- [ ] Privacy URL and support URL load publicly
- [ ] `privacy@trackher.app` actually receives mail
- [ ] Demo account works on a fresh install

## 6. What you already have (no action)

- Terms of Service with medical disclaimer, "not a medical device," and emergency language (`/terms`) — exactly what reviewers look for on a health app.
- In-app account deletion via `delete_user_account` RPC — satisfies Guideline 5.1.1(v), mandatory since 2022.
- No ATT prompt needed, no cookie banner needed, no third-party SDK disclosures needed.

---

*Note: I'm not a lawyer. This policy and pack are built to satisfy App Review and reflect the app truthfully, but for a health-data product it's worth a one-time review by a privacy attorney before launch, particularly regarding FTC Health Breach Notification Rule and state consumer-health laws (e.g., Washington's My Health My Data Act if you have WA users).*
