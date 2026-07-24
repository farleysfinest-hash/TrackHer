# Redesign 15 — Fix dark mode on iOS native shell

## Context
Dark mode CSS is fully implemented (`.dark` class, `color-scheme` declarations, FOUC script), but the app is stuck in light mode on device. The native iOS shell hardcodes `UIColor.white` in five places across `AppDelegate.swift`, `BridgeViewController.swift`, and `capacitor.config.ts`. These force the WKWebView and its scroll view background to white, so:
- Rubber-band overscroll flashes white in dark mode
- The window background behind the webview is white
- The webview itself may not properly report `prefers-color-scheme: dark` to CSS

## Preconditions
- Branch: wherever HEAD is. Clean tree.
- Files (verified):
  - `ios/App/App/AppDelegate.swift` — `UIColor.white` on lines 11, 30, 31.
  - `ios/App/App/BridgeViewController.swift` — `.white` on lines 12, 13.
  - `capacitor.config.ts` — `backgroundColor: '#ffffff'` on line 12.

## Part A — Define a shared dynamic color

In both Swift files you'll need the same dynamic color that matches the CSS dark `sand-50` (`#171114`) in dark mode and white in light mode. Define it once as a file-level constant in each file (or extract to a shared `Theme.swift` if you prefer):

```swift
private let appBackground = UIColor { traits in
    traits.userInterfaceStyle == .dark
        ? UIColor(red: 0.09, green: 0.067, blue: 0.078, alpha: 1) // #171114 — CSS sand-50 dark
        : .white
}
```

Do NOT use `.systemBackground` — it resolves to pure black in dark mode, which is too harsh. The app uses a warm plum-charcoal (`#171114`).

## Part B — AppDelegate.swift

Add the `appBackground` constant above the class. Then replace all three `.white` references:

Line 11 — change:
```swift
window?.backgroundColor = UIColor.white
```
to:
```swift
window?.backgroundColor = appBackground
```

Lines 30–31 — change:
```swift
window?.backgroundColor = .white
window?.rootViewController?.view.backgroundColor = .white
```
to:
```swift
window?.backgroundColor = appBackground
window?.rootViewController?.view.backgroundColor = appBackground
```

## Part C — BridgeViewController.swift

Add the same `appBackground` constant above the class. Then replace lines 12–13:

```swift
scrollView.backgroundColor = .white
webView?.backgroundColor = .white
```
to:
```swift
scrollView.backgroundColor = appBackground
webView?.backgroundColor = appBackground
```

## Part D — capacitor.config.ts

The `backgroundColor` here is a build-time constant — it can't be dynamic. Leave it as `#ffffff`. The Swift dynamic color in Parts B–C overrides it immediately on launch, and the FOUC script in `index.html` adds `.dark` before first paint. The Capacitor value is only visible for milliseconds during webview init, if at all.

## Verify
Build and run on device or simulator:
1. Set system appearance to dark. Launch the app — no white flash, app renders in dark mode.
2. Rubber-band overscroll at top and bottom — background behind the webview should be dark, not white.
3. Switch system to light while app is running — app should switch to light mode, overscroll background white.
4. `npm run build` still passes (capacitor.config.ts is valid).
5. Run `npx cap sync ios` to push config changes to the Xcode project.

## Commit
```
git add ios/App/App/AppDelegate.swift ios/App/App/BridgeViewController.swift capacitor.config.ts
git commit -m "fix: iOS dark mode — replace hardcoded white backgrounds with systemBackground"
```
