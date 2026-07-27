import UIKit
import Capacitor

/// Matches CSS `--color-sand-50`: white in light mode, neutral graphite `#242124` in dark.
/// Do not use `.systemBackground` — pure black is too harsh for this app.
/// Keep in lockstep with index.css, the dark `theme-color` meta, AppDelegate, and
/// `--iconBackgroundColorDark` in package.json, or overscroll seams against the web surface.
private let appBackground = UIColor { traits in
    traits.userInterfaceStyle == .dark
        ? UIColor(red: 36.0 / 255.0, green: 33.0 / 255.0, blue: 36.0 / 255.0, alpha: 1) // #242124
        : .white
}

/// Capacitor disables WKWebView rubber-banding by default (`scrollView.bounces = false`).
/// Re-enable it so TrackHer feels like a normal iOS app while staying a React/Capacitor shell.
class BridgeViewController: CAPBridgeViewController {
    override open func capacitorDidLoad() {
        super.capacitorDidLoad()
        guard let scrollView = webView?.scrollView else { return }
        scrollView.bounces = true
        scrollView.alwaysBounceVertical = true
        scrollView.backgroundColor = appBackground
        webView?.backgroundColor = appBackground
        syncWebColorScheme()
    }

    override open func viewDidAppear(_ animated: Bool) {
        super.viewDidAppear(animated)
        // Capacitor sets bounces during webview prep; re-assert after appear in case of races.
        webView?.scrollView.bounces = true
        webView?.scrollView.alwaysBounceVertical = true
        syncWebColorScheme()
    }

    override open func traitCollectionDidChange(_ previousTraitCollection: UITraitCollection?) {
        super.traitCollectionDidChange(previousTraitCollection)
        guard traitCollection.hasDifferentColorAppearance(comparedTo: previousTraitCollection) else { return }
        syncWebColorScheme()
    }

    /// Drive `html.dark` from the native trait collection so theme does not depend solely on
    /// `matchMedia('(prefers-color-scheme: dark)')`, which can lag or stay light in WKWebView
    /// until the document opts into both color schemes.
    private func syncWebColorScheme() {
        let isDark = traitCollection.userInterfaceStyle == .dark
        let js = isDark
            ? "document.documentElement.classList.add('dark');"
            : "document.documentElement.classList.remove('dark');"
        webView?.evaluateJavaScript(js, completionHandler: nil)
    }
}
