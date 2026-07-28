import UIKit
import Capacitor
import WebKit

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {

    var window: UIWindow?
    private var didInstallScripts = false
    /// Modo Usuario por defecto (cajeros): sin gesto atrás / sin chrome de navegación.
    private var userMode: Bool {
        let mode = UserDefaults.standard.string(forKey: "renace_app_mode") ?? "user"
        return mode != "admin"
    }

    /// Mismo stub que Electron — Odoo necesita permission.addEventListener
    private static let pushStubSource = """
    (function(){if(window.__renacePushStub)return;window.__renacePushStub=true;var noop=function(){};function fakePermissionStatus(state,name){return{state:state||'denied',name:name||'notifications',onchange:null,addEventListener:noop,removeEventListener:noop,dispatchEvent:function(){return false;}};}try{if(window.Notification){try{Object.defineProperty(window.Notification,'permission',{configurable:true,get:function(){return'denied';}});}catch(e){}window.Notification.requestPermission=function(){return Promise.resolve('denied');};}}catch(e){}try{if(navigator.permissions&&navigator.permissions.query){var orig=navigator.permissions.query.bind(navigator.permissions);navigator.permissions.query=function(desc){var name=desc&&desc.name;if(name==='notifications'||name==='push'||name==='push-messaging'){return Promise.resolve(fakePermissionStatus('denied',name));}return orig(desc).catch(function(){return fakePermissionStatus('prompt',name);});};}}catch(e){}})();
    """

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        DispatchQueue.main.async { self.hardenWebView() }
        return true
    }

    private func hardenWebView() {
        guard let bridgeVC = window?.rootViewController as? CAPBridgeViewController
                ?? findBridge(in: window?.rootViewController) else { return }
        guard let webView = bridgeVC.webView else { return }

        // Modo Usuario: sin swipe-back del historial
        webView.allowsBackForwardNavigationGestures = !userMode

        if !didInstallScripts {
            let push = WKUserScript(source: Self.pushStubSource, injectionTime: .atDocumentStart, forMainFrameOnly: false)
            webView.configuration.userContentController.addUserScript(push)

            let mode = userMode ? "user" : "admin"
            let boot = """
            window.__renaceShellCfg=Object.assign(window.__renaceShellCfg||{},{mode:'\(mode)',keymap:{enabled:true,profile:'eleventa',sales:'F1',pay:'F12',payPrint:'F1',payNoPrint:'F2',cancel:'Escape',priceCheck:'F9',wholesale:'F11'}});
            """
            webView.configuration.userContentController.addUserScript(
                WKUserScript(source: boot, injectionTime: .atDocumentStart, forMainFrameOnly: false)
            )

            if let shell = loadBundledShell() {
                webView.configuration.userContentController.addUserScript(
                    WKUserScript(source: shell, injectionTime: .atDocumentEnd, forMainFrameOnly: false)
                )
            }
            didInstallScripts = true
        }

        webView.evaluateJavaScript(Self.pushStubSource, completionHandler: nil)
        if let shell = loadBundledShell() {
            let mode = userMode ? "user" : "admin"
            let boot = "window.__renaceShellCfg=Object.assign(window.__renaceShellCfg||{},{mode:'\(mode)'});"
            webView.evaluateJavaScript(boot + "\n" + shell, completionHandler: nil)
        }
    }

    private func loadBundledShell() -> String? {
        // Prefer resource copied next to App; fallback public www copy; then embedded
        let candidates = [
            Bundle.main.url(forResource: "renace-user-shell", withExtension: "js"),
            Bundle.main.url(forResource: "renace-user-shell", withExtension: "js", subdirectory: "public"),
            Bundle.main.bundleURL.appendingPathComponent("public/renace-user-shell.js"),
        ]
        for url in candidates {
            if let url, let data = try? Data(contentsOf: url), let s = String(data: data, encoding: .utf8), !s.isEmpty {
                return s
            }
        }
        return RenaceUserShell.source
    }

    private func findBridge(in root: UIViewController?) -> CAPBridgeViewController? {
        guard let root = root else { return nil }
        if let cap = root as? CAPBridgeViewController { return cap }
        for child in root.children {
            if let found = findBridge(in: child) { return found }
        }
        return findBridge(in: root.presentedViewController)
    }

    func applicationWillResignActive(_ application: UIApplication) {}
    func applicationDidEnterBackground(_ application: UIApplication) {}
    func applicationWillEnterForeground(_ application: UIApplication) {}
    func applicationDidBecomeActive(_ application: UIApplication) { hardenWebView() }
    func applicationWillTerminate(_ application: UIApplication) {}

    func application(_ app: UIApplication, open url: URL, options: [UIApplication.OpenURLOptionsKey: Any] = [:]) -> Bool {
        return ApplicationDelegateProxy.shared.application(app, open: url, options: options)
    }

    func application(_ application: UIApplication, continue userActivity: NSUserActivity, restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void) -> Bool {
        return ApplicationDelegateProxy.shared.application(application, continue: userActivity, restorationHandler: restorationHandler)
    }
}
