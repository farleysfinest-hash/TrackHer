# TrackHer → iOS via Capacitor: Complete Setup Guide

Verified against this repo on 2026-07-19. File paths, line numbers, and function names below match current HEAD.

---

## Phase 0: Prerequisites (one-time)

1. **Xcode** — install from the Mac App Store (free, ~12 GB). Launch it once and accept the license. Then in Terminal:
   ```bash
   xcode-select --install
   sudo xcodebuild -license accept
   ```
2. **CocoaPods** (Capacitor's default iOS dependency manager):
   ```bash
  xcode-select --install
   sudo xcodebuild -license accept
   ```
   ```
3. **Apple Developer Program** — enroll at https://developer.apple.com/programs/ ($99/year). Required to run on a physical device for more than 7 days and to ship to the App Store. You can do everything in the Simulator before enrolling.

---

## Phase 1: Install and initialize Capacitor

From the repo root:

```bash
npm install @capacitor/core
npm install -D @capacitor/cli
npx cap init TrackHer com.trackher.app --web-dir dist
```

- `com.trackher.app` is your bundle ID — pick your own reverse-domain string now; it's painful to change after App Store submission.
- This creates `capacitor.config.ts` at the repo root.

Replace the generated `capacitor.config.ts` with:

```ts
import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.trackher.app',
  appName: 'TrackHer',
  webDir: 'dist',
  ios: {
    contentInset: 'automatic',
  },
};

export default config;
```

---

## Phase 2: Add the iOS platform

```bash
npm install @capacitor/ios
npm run build
npx cap add ios
```

This generates an `ios/` folder containing a full Xcode project. Commit it — it belongs in git.

**These are new (untracked) files, so stage them explicitly — `git commit -am` will NOT pick them up:**

```bash
git add capacitor.config.ts ios package.json package-lock.json
git commit -m "Add Capacitor iOS platform"
```

---

## Phase 3: First run in the Simulator

```bash
npm run build && npx cap sync ios
npx cap open ios
```

In Xcode:

1. Select the **App** target → **Signing & Capabilities** tab → choose your Team (your Apple ID works for Simulator/dev builds even before paid enrollment).
2. Pick a simulator (e.g. iPhone 16) from the device dropdown and press **▶ Run**.

The app should boot and show your login screen. Auth, Supabase, Zustand, Recharts, and routing all work unchanged — `BrowserRouter` is fine because the WebView never does a server round-trip. Your Supabase keys are baked in at build time from `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` (`src/lib/supabase.ts:3-4`), so make sure `.env` is present when you run `npm run build`.

### Optional: live-reload during development

Add a temporary `server` block to `capacitor.config.ts` (your Mac's LAN IP, Vite's port):

```ts
server: { url: 'http://192.168.1.XX:5173', cleartext: true },
```

Run `npm run dev -- --host`, then `npx cap run ios`. Edits hot-reload inside the iOS app. **Remove this block before any release build.**

---

## Phase 4: Required code changes

Three things in the current codebase break inside a WKWebView. Everything else works as-is.

### 4a. File downloads (PDF report + JSON export)

The `<a download>` + `URL.createObjectURL` pattern silently does nothing in an iOS WebView. Two call sites use it:

- `src/hooks/useProviderReport.ts` lines 45–50 (PDF report)
- `src/utils/dataExport.ts` → `downloadJson()` lines 107–117 (JSON export, called from `src/pages/SettingsPage.tsx:121`)

Install the plugins:

```bash
npm install @capacitor/filesystem @capacitor/share
npx cap sync ios
```

**Create a new file** `src/utils/nativeExport.ts`:

```ts
import { Capacitor } from '@capacitor/core';
import { Directory, Filesystem } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUrl = reader.result as string;
      resolve(dataUrl.split(',')[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/** Downloads on web; writes to cache + opens the iOS share sheet on native. */
export async function saveOrShareBlob(blob: Blob, filename: string): Promise<void> {
  if (!Capacitor.isNativePlatform()) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    return;
  }

  const data = await blobToBase64(blob);
  const written = await Filesystem.writeFile({
    path: filename,
    data,
    directory: Directory.Cache,
  });
  await Share.share({ title: filename, url: written.uri });
}
```

**Edit `src/hooks/useProviderReport.ts`** — replace lines 45–50:

```ts
// before:
const url = URL.createObjectURL(blob);
const a = document.createElement('a');
a.href = url;
a.download = `TrackHer-Report-${today.replace(/,/g, '').replace(/ /g, '-')}.pdf`;
a.click();
URL.revokeObjectURL(url);

// after:
await saveOrShareBlob(blob, `TrackHer-Report-${today.replace(/,/g, '').replace(/ /g, '-')}.pdf`);
```

and add the import: `import { saveOrShareBlob } from '../utils/nativeExport';`

**Edit `src/utils/dataExport.ts`** — replace the body of `downloadJson` (make it async):

```ts
export async function downloadJson(data: ExportBundle, filename: string): Promise<void> {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  await saveOrShareBlob(blob, filename);
}
```

with `import { saveOrShareBlob } from './nativeExport';` at the top. The call site at `SettingsPage.tsx:121` is inside an async handler, so add `await` there.

### 4b. Password reset redirect

`src/stores/authStore.ts:133` builds the reset link from `window.location.origin`:

```ts
redirectTo: `${window.location.origin}/reset-password`,
```

Inside the app, origin is `capacitor://localhost` — a dead link in the reset email. Hardcode your deployed web URL:

```ts
redirectTo: 'https://YOUR-PRODUCTION-DOMAIN/reset-password',
```

(Use your Cloudflare deployment URL.) Users tap the email link, reset their password on the web, then sign in inside the app. Also confirm this URL is in Supabase Dashboard → Authentication → URL Configuration → Redirect URLs.

### 4c. Feel-native CSS

Add to `src/index.css`:

```css
html, body {
  overscroll-behavior-y: none;          /* kill rubber-band bounce */
  -webkit-tap-highlight-color: transparent;
  -webkit-touch-callout: none;
}
```

You already have `viewport-fit=cover` in `index.html` and a `.safe-area-bottom` utility (used by `MobileNav.tsx`), so notch/home-bar handling is mostly done. After first Simulator run, check any **fixed top** header for status-bar overlap; if needed add a matching utility:

```css
.safe-area-top { padding-top: env(safe-area-inset-top); }
```

---

## Phase 5: Icon and splash screen

You need a **1024×1024** PNG icon (current `public/apple-touch-icon.png` is 180×180 — export a bigger one from your logo source) and optionally a 2732×2732 splash image.

```bash
npm install -D @capacitor/assets
mkdir -p assets
# put icon.png (1024x1024) and optionally splash.png (2732x2732) in assets/
npx capacitor-assets generate --ios
```

This populates all required icon/splash sizes into the Xcode project. Stage the new files explicitly (`git add assets ios`).

---

## Phase 6: Release workflow (every version)

```bash
npm run build && npx cap sync ios
npx cap open ios
```

In Xcode:

1. App target → **General** → bump **Version** (user-facing, e.g. 1.0.1) and **Build** (must increase every upload).
2. Device dropdown → **Any iOS Device (arm64)**.
3. **Product → Archive**. When the Organizer opens: **Distribute App → App Store Connect → Upload**.

---

## Phase 7: App Store submission (first time)

1. https://developer.apple.com/account → Identifiers → register `com.trackher.app`. (Xcode usually auto-registers it when you set signing.)
2. https://appstoreconnect.apple.com → My Apps → **+ New App** → link the bundle ID.
3. Fill in listing: name, subtitle, description, keywords, screenshots (6.9" and 6.5" iPhone sizes minimum — take them in the Simulator with **Cmd+S**).
4. **Privacy — this matters for TrackHer specifically:**
   - A public **privacy policy URL** is mandatory (health apps get extra scrutiny).
   - App Privacy questionnaire: declare **Health & Fitness** data, plus email/name (account), all "linked to user."
   - Apple requires in-app **account deletion** for apps with accounts — you have account reset (`src/lib/accountReset.ts`); make sure full deletion is reachable from Settings.
5. TestFlight first: after your upload processes, add yourself as an internal tester and use the app on your phone for a few days before submitting for review.
6. Submit for review. Typical turnaround is 1–2 days. If rejected under guideline 4.2 (minimum functionality), respond noting native share-sheet export, and consider adding `@capacitor/local-notifications` check-in reminders — that alone usually settles it.

---

## Ongoing development loop

| Task | Command |
|---|---|
| Normal web dev | `npm run dev` (nothing changes) |
| Test in Simulator | `npm run build && npx cap sync ios && npx cap open ios` → Run |
| Add a Capacitor plugin | `npm install <plugin> && npx cap sync ios` |
| Ship an update | build + sync → bump Build number → Archive → Upload |

Web-only changes still deploy through Wrangler exactly as today; the iOS app is just a second consumer of the same `dist`.

## Later, if wanted

- `@capacitor/local-notifications` — on-device check-in reminders (no server needed).
- `@capacitor/status-bar` — tint the status bar to match `#BE739A`.
- Deep links (Universal Links) — so the reset-password email opens the app directly.
- `capacitor-plugin-health` community plugins — HealthKit read/write if you ever want cycle/vitals sync.
