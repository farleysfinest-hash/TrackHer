import UIKit
import Capacitor

/// Capacitor disables WKWebView rubber-banding by default (`scrollView.bounces = false`).
/// Re-enable it so TrackHer feels like a normal iOS app while staying a React/Capacitor shell.
class BridgeViewController: CAPBridgeViewController {
    override open func capacitorDidLoad() {
        super.capacitorDidLoad()
        guard let scrollView = webView?.scrollView else { return }
        scrollView.bounces = true
        scrollView.alwaysBounceVertical = true
        scrollView.backgroundColor = .white
        webView?.backgroundColor = .white
    }

    override open func viewDidAppear(_ animated: Bool) {
        super.viewDidAppear(animated)
        // Capacitor sets bounces during webview prep; re-assert after appear in case of races.
        webView?.scrollView.bounces = true
        webView?.scrollView.alwaysBounceVertical = true
    }
}
