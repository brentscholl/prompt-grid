import ApplicationServices
import Cocoa
import WebKit

/// Lets a card click activate the window and perform its action in the same click.
final class PromptWebView: WKWebView {
    override func acceptsFirstMouse(for event: NSEvent?) -> Bool {
        true
    }
}

/// Hosts the Tailwind interface and bridges prompt cards to the macOS clipboard.
final class AppDelegate: NSObject, NSApplicationDelegate, NSWindowDelegate, WKNavigationDelegate, WKScriptMessageHandler {
    private var window: NSWindow!
    private var webView: WKWebView!
    private var workspaceObserver: NSObjectProtocol?
    private var lastCodexApplication: NSRunningApplication?
    /// Only bundled content may invoke clipboard or Accessibility operations.
    private var interfaceURL: URL?

    func applicationDidFinishLaunching(_ notification: Notification) {
        captureCodexApplication(NSWorkspace.shared.frontmostApplication)
        configureApplicationMenu()
        observeActiveApplications()
        createWindow()

        NSApp.activate(ignoringOtherApps: true)
        window.makeKeyAndOrderFront(nil)
    }

    func applicationWillTerminate(_ notification: Notification) {
        if let workspaceObserver {
            NSWorkspace.shared.notificationCenter.removeObserver(workspaceObserver)
        }
        webView?.configuration.userContentController.removeScriptMessageHandler(forName: "promptGrid")
    }

    func applicationShouldTerminateAfterLastWindowClosed(_ sender: NSApplication) -> Bool {
        true
    }

    func applicationDidBecomeActive(_ notification: Notification) {
        sendStatusToWebView()
    }

    private func createWindow() {
        let configuration = WKWebViewConfiguration()
        configuration.defaultWebpagePreferences.allowsContentJavaScript = true
        configuration.userContentController.add(self, name: "promptGrid")

        webView = PromptWebView(frame: .zero, configuration: configuration)
        webView.navigationDelegate = self
        webView.wantsLayer = true
        webView.layer?.backgroundColor = NSColor(srgbRed: 0.008, green: 0.024, blue: 0.090, alpha: 1).cgColor

        window = NSWindow(
            contentRect: NSRect(x: 0, y: 0, width: 1040, height: 760),
            styleMask: [.titled, .closable, .miniaturizable, .resizable],
            backing: .buffered,
            defer: false
        )
        window.title = "Prompt Grid"
        window.appearance = NSAppearance(named: .darkAqua)
        window.backgroundColor = NSColor(srgbRed: 0.008, green: 0.024, blue: 0.090, alpha: 1)
        window.minSize = NSSize(width: 680, height: 520)
        window.contentView = webView
        window.delegate = self
        window.center()
        window.setFrameAutosaveName("PromptGrid.MainWindow")

        guard let resourceURL = Bundle.main.resourceURL else {
            showLaunchError("Prompt Grid could not find its bundled interface.")
            return
        }

        let indexURL = resourceURL.appendingPathComponent("Web/index.html")
        interfaceURL = indexURL.standardizedFileURL
        webView.loadFileURL(indexURL, allowingReadAccessTo: resourceURL)
    }

    private func configureApplicationMenu() {
        let mainMenu = NSMenu()

        let applicationMenuItem = NSMenuItem()
        let applicationMenu = NSMenu()
        applicationMenu.addItem(withTitle: "About Prompt Grid", action: #selector(NSApplication.orderFrontStandardAboutPanel(_:)), keyEquivalent: "")
        applicationMenu.addItem(.separator())
        applicationMenu.addItem(withTitle: "Quit Prompt Grid", action: #selector(NSApplication.terminate(_:)), keyEquivalent: "q")
        applicationMenuItem.submenu = applicationMenu
        mainMenu.addItem(applicationMenuItem)

        let editMenuItem = NSMenuItem()
        let editMenu = NSMenu(title: "Edit")
        editMenu.addItem(withTitle: "Undo", action: Selector(("undo:")), keyEquivalent: "z")
        editMenu.addItem(withTitle: "Redo", action: Selector(("redo:")), keyEquivalent: "Z")
        editMenu.addItem(.separator())
        editMenu.addItem(withTitle: "Cut", action: #selector(NSText.cut(_:)), keyEquivalent: "x")
        editMenu.addItem(withTitle: "Copy", action: #selector(NSText.copy(_:)), keyEquivalent: "c")
        editMenu.addItem(withTitle: "Paste", action: #selector(NSText.paste(_:)), keyEquivalent: "v")
        editMenu.addItem(withTitle: "Select All", action: #selector(NSText.selectAll(_:)), keyEquivalent: "a")
        editMenuItem.submenu = editMenu
        mainMenu.addItem(editMenuItem)

        NSApp.mainMenu = mainMenu
    }

    private func observeActiveApplications() {
        workspaceObserver = NSWorkspace.shared.notificationCenter.addObserver(
            forName: NSWorkspace.didActivateApplicationNotification,
            object: nil,
            queue: .main
        ) { [weak self] notification in
            guard let application = notification.userInfo?[NSWorkspace.applicationUserInfoKey] as? NSRunningApplication else {
                return
            }

            self?.captureCodexApplication(application)
        }
    }

    /// Remembers Codex without replacing it when Prompt Grid or System Settings becomes active.
    private func captureCodexApplication(_ application: NSRunningApplication?) {
        guard let application, isCodex(application) else {
            return
        }

        lastCodexApplication = application
        sendStatusToWebView()
    }

    private func isCodex(_ application: NSRunningApplication) -> Bool {
        // The desktop app's identity is stable even when its display name changes.
        application.bundleIdentifier == "com.openai.codex"
    }

    /// Keep the privileged web view on its bundled page; never load remote content.
    func webView(_ webView: WKWebView, decidePolicyFor navigationAction: WKNavigationAction,
                 decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
        let allowed = navigationAction.targetFrame?.isMainFrame == true
            && navigationAction.request.url?.standardizedFileURL == interfaceURL
        decisionHandler(allowed ? .allow : .cancel)
    }

    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
        sendStatusToWebView()
    }

    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        guard message.frameInfo.isMainFrame,
              message.frameInfo.request.url?.standardizedFileURL == interfaceURL,
              message.name == "promptGrid", let payload = message.body as? [String: Any], let action = payload["action"] as? String else {
            return
        }

        switch action {
        case "paste":
            guard let text = payload["text"] as? String else {
                return
            }
            copyAndPaste(text)
        case "status":
            sendStatusToWebView()
        case "requestAccessibility":
            requestAccessibilityAccess()
        default:
            break
        }
    }

    /// Requests cross-app paste access only after the user explicitly chooses to enable it.
    private func requestAccessibilityAccess() {
        guard !AXIsProcessTrusted() else {
            sendStatusToWebView()
            return
        }

        let promptKey = kAXTrustedCheckOptionPrompt.takeUnretainedValue() as String
        let options = [promptKey: true] as CFDictionary
        AXIsProcessTrustedWithOptions(options)
        sendResultToWebView(mode: "setup")
    }

    /// Copying always happens first so the prompt remains available if automated paste is blocked.
    private func copyAndPaste(_ text: String) {
        let pasteboard = NSPasteboard.general
        pasteboard.clearContents()

        guard pasteboard.setString(text, forType: .string) else {
            sendResultToWebView(mode: "copyFailed")
            return
        }

        guard let codex = lastCodexApplication, isCodex(codex), !codex.isTerminated else {
            sendResultToWebView(mode: "copied")
            sendStatusToWebView()
            return
        }

        guard AXIsProcessTrusted() else {
            // Accessibility is optional. Copy silently when macOS has not already granted it.
            sendResultToWebView(mode: "copied")
            sendStatusToWebView()
            return
        }

        codex.activate(options: [])
        let copiedChangeCount = pasteboard.changeCount

        // Give Codex a moment to restore its prior focused prompt field before sending Command-V.
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.22) { [weak self] in
            // Never paste replacement clipboard content, including a later card click.
            guard NSPasteboard.general.changeCount == copiedChangeCount else { return }
            guard codex.isActive, let source = CGEventSource(stateID: .hidSystemState) else {
                self?.sendResultToWebView(mode: "copied")
                return
            }

            let keyCodeV: CGKeyCode = 9
            guard let keyDown = CGEvent(keyboardEventSource: source, virtualKey: keyCodeV, keyDown: true),
                  let keyUp = CGEvent(keyboardEventSource: source, virtualKey: keyCodeV, keyDown: false) else {
                self?.sendResultToWebView(mode: "copied")
                return
            }
            keyDown.flags = .maskCommand
            keyUp.flags = .maskCommand
            keyDown.post(tap: .cghidEventTap)
            keyUp.post(tap: .cghidEventTap)
            self?.sendResultToWebView(mode: "pasted")
        }
    }

    private func sendStatusToWebView() {
        guard webView != nil else {
            return
        }

        let payload: [String: Any] = [
            "accessibilityTrusted": AXIsProcessTrusted(),
            "codexAvailable": lastCodexApplication?.isTerminated == false,
        ]
        evaluateJavaScript(function: "promptGridNativeStatus", payload: payload)
    }

    private func sendResultToWebView(mode: String) {
        evaluateJavaScript(function: "promptGridNativeResult", payload: ["mode": mode])
    }

    private func evaluateJavaScript(function: String, payload: [String: Any]) {
        guard JSONSerialization.isValidJSONObject(payload),
              let data = try? JSONSerialization.data(withJSONObject: payload),
              let json = String(data: data, encoding: .utf8) else {
            return
        }

        webView.evaluateJavaScript("window.\(function)(\(json));", completionHandler: nil)
    }

    private func showLaunchError(_ message: String) {
        let alert = NSAlert()
        alert.messageText = "Unable to open Prompt Grid"
        alert.informativeText = message
        alert.alertStyle = .critical
        alert.runModal()
        NSApp.terminate(nil)
    }
}

let application = NSApplication.shared
let delegate = AppDelegate()
application.setActivationPolicy(.regular)
application.delegate = delegate
application.run()
