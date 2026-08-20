package tech.renace.portal;

import android.content.Context;
import android.content.SharedPreferences;
import android.os.Build;
import android.os.Bundle;
import android.print.PrintAttributes;
import android.print.PrintDocumentAdapter;
import android.print.PrintManager;
import android.util.Base64;
import android.util.Log;
import android.view.KeyEvent;
import android.view.View;
import android.view.WindowInsets;
import android.view.WindowInsetsController;
import android.view.WindowManager;
import android.webkit.CookieManager;
import android.webkit.JavascriptInterface;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import androidx.activity.OnBackPressedCallback;
import com.getcapacitor.Bridge;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.BridgeWebViewClient;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;

/**
 * Modo Usuario / Kiosk Lockdown:
 * - Inyecta renaceDesktop API idéntica a PC Desktop (instancias, autologin, cookies, secrets).
 * - Soporte nativo para impresoras térmicas POS 2connet (USB, Bluetooth, Red ESC/POS y Android WebPrint).
 * - Habilita persistencia total de sesión (CookieManager + DOM Storage).
 * - Bloquea botón Atrás del sistema, Inicio (Home), Recientes, gestos y cierre de la app.
 */
public class MainActivity extends BridgeActivity {
  private static final String PREFS = "renace_portal";
  private static final String KEY_MODE = "app_mode";

  private static final String DESKTOP_BRIDGE =
      "(function(){"
          + "if(window.renaceDesktop) return;"
          + "window.renaceDesktop = {"
          + "  isDesktop: true,"
          + "  isAndroid: true,"
          + "  getInstance: function(){"
          + "    try { return JSON.parse(localStorage.getItem('renace_instance') || 'null'); } catch(e){ return null; }"
          + "  },"
          + "  saveInstance: function(payload){"
          + "    try { localStorage.setItem('renace_instance', JSON.stringify(payload)); } catch(e){}"
          + "    return Promise.resolve(true);"
          + "  },"
          + "  saveAndOpenInstance: function(payload){"
          + "    try { localStorage.setItem('renace_instance', JSON.stringify(payload)); } catch(e){}"
          + "    if (payload && payload.url) { window.location.href = payload.url; }"
          + "    return Promise.resolve(true);"
          + "  },"
          + "  openInstanceWindow: function(payload){"
          + "    var target = (typeof payload === 'string') ? payload : (payload && payload.url);"
          + "    if (target) { window.location.href = target; }"
          + "    return Promise.resolve(true);"
          + "  },"
          + "  openPortal: function(){ window.location.href = 'https://renace.tech/portal'; return Promise.resolve(true); },"
          + "  saveSecret: function(k, v){ try { localStorage.setItem('sec_'+k, v); } catch(e){} return Promise.resolve(true); },"
          + "  getSecret: function(k){ try { return Promise.resolve(localStorage.getItem('sec_'+k)); } catch(e){ return Promise.resolve(null); } },"
          + "  getMode: function(){ return Promise.resolve('user'); },"
          + "  winReload: function(){ window.location.reload(); },"
          + "  reload: function(){ window.location.reload(); },"
          + "  print: function(){"
          + "    if (window.AndroidPrinter && typeof window.AndroidPrinter.printPage === 'function') {"
          + "      window.AndroidPrinter.printPage();"
          + "    } else {"
          + "      window.print();"
          + "    }"
          + "    return Promise.resolve(true);"
          + "  },"
          + "  printNetworkPOS: function(host, port, base64Data){"
          + "    if (window.AndroidPrinter && typeof window.AndroidPrinter.printNet === 'function') {"
          + "      return Promise.resolve(window.AndroidPrinter.printNet(host, port, base64Data));"
          + "    }"
          + "    return Promise.resolve(false);"
          + "  }"
          + "};"
          + "})();";

  private static final String PUSH_STUB =
      "(function(){if(window.__renacePushStub)return;window.__renacePushStub=true;"
          + "var noop=function(){};"
          + "function fakePermissionStatus(state,name){return{state:state||'denied',name:name||'notifications',"
          + "onchange:null,addEventListener:noop,removeEventListener:noop,dispatchEvent:function(){return false;}};}"
          + "try{if(window.Notification){try{Object.defineProperty(window.Notification,'permission',"
          + "{configurable:true,get:function(){return'denied';}});}catch(e){}"
          + "window.Notification.requestPermission=function(){return Promise.resolve('denied');};}}catch(e){}"
          + "try{if(navigator.permissions&&navigator.permissions.query){var orig=navigator.permissions.query.bind(navigator.permissions);"
          + "navigator.permissions.query=function(desc){var name=desc&&desc.name;"
          + "if(name==='notifications'||name==='push'||name==='push-messaging'){"
          + "return Promise.resolve(fakePermissionStatus('denied',name));}"
          + "return orig(desc).catch(function(){return fakePermissionStatus('prompt',name);});};}}catch(e){}"
          + "})();";

  private boolean userMode = true;
  private String userShellJs = "";

  @Override
  public void onCreate(Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);

    SharedPreferences prefs = getSharedPreferences(PREFS, MODE_PRIVATE);
    userMode = !"admin".equals(prefs.getString(KEY_MODE, "user"));
    userShellJs = loadAsset("renace-user-shell.js");

    if (userMode) {
      getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
      hideSystemUI();
      enableKioskLock();
    }

    getOnBackPressedDispatcher().addCallback(this, new OnBackPressedCallback(true) {
      @Override
      public void handleOnBackPressed() {
        if (userMode) {
          // Modo Usuario: no salir / no historial atrás / no cerrar app
          return;
        }
        setEnabled(false);
        getOnBackPressedDispatcher().onBackPressed();
        setEnabled(true);
      }
    });

    Bridge bridge = this.bridge;
    if (bridge == null) return;
    WebView webView = bridge.getWebView();
    if (webView == null) return;

    WebSettings settings = webView.getSettings();
    settings.setJavaScriptEnabled(true);
    settings.setDomStorageEnabled(true);
    settings.setDatabaseEnabled(true);
    settings.setAllowFileAccess(true);
    settings.setAllowContentAccess(true);
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
      settings.setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);
      CookieManager cookieManager = CookieManager.getInstance();
      cookieManager.setAcceptCookie(true);
      cookieManager.setAcceptThirdPartyCookies(webView, true);
    }

    webView.setWebViewClient(new BridgeWebViewClient(bridge) {
      @Override
      public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
        if (request != null && request.getUrl() != null) {
          String scheme = request.getUrl().getScheme();
          if ("http".equalsIgnoreCase(scheme) || "https".equalsIgnoreCase(scheme)) {
            return false;
          }
        }
        return super.shouldOverrideUrlLoading(view, request);
      }

      @Override
      @SuppressWarnings("deprecation")
      public boolean shouldOverrideUrlLoading(WebView view, String url) {
        if (url != null && (url.startsWith("http://") || url.startsWith("https://"))) {
          return false;
        }
        return super.shouldOverrideUrlLoading(view, url);
      }

      @Override
      public void onPageStarted(WebView view, String url, android.graphics.Bitmap favicon) {
        injectAll(view);
        super.onPageStarted(view, url, favicon);
      }

      @Override
      public void onPageFinished(WebView view, String url) {
        injectAll(view);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
          CookieManager.getInstance().flush();
        }
        super.onPageFinished(view, url);
      }
    });
    webView.addJavascriptInterface(new AndroidPrinterInterface(), "AndroidPrinter");
    injectAll(webView);
  }

  public class AndroidPrinterInterface {
    @JavascriptInterface
    public void printPage() {
      MainActivity.this.printWebViewPage();
    }

    @JavascriptInterface
    public boolean printNet(String host, int port, String base64Data) {
      return MainActivity.this.printNetworkPOS(host, port, base64Data);
    }
  }

  public void printWebViewPage() {
    runOnUiThread(() -> {
      try {
        Bridge b = this.bridge;
        WebView webView = b != null ? b.getWebView() : null;
        if (webView != null && Build.VERSION.SDK_INT >= Build.VERSION_CODES.KITKAT) {
          PrintManager printManager = (PrintManager) getSystemService(Context.PRINT_SERVICE);
          if (printManager != null) {
            String jobName = "RENACE_POS_Ticket_" + System.currentTimeMillis();
            PrintDocumentAdapter printAdapter;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
              printAdapter = webView.createPrintDocumentAdapter(jobName);
            } else {
              printAdapter = webView.createPrintDocumentAdapter();
            }
            printManager.print(jobName, printAdapter, new PrintAttributes.Builder().build());
          }
        }
      } catch (Exception e) {
        Log.e("RenacePrint", "Error imprimiendo ticket: " + e.getMessage(), e);
      }
    });
  }

  public boolean printNetworkPOS(String host, int port, String base64Data) {
    try {
      if (host == null || host.isEmpty()) return false;
      byte[] escposBytes = Base64.decode(base64Data, Base64.DEFAULT);
      int targetPort = port > 0 ? port : 9100;
      try (java.net.Socket socket = new java.net.Socket()) {
        socket.connect(new java.net.InetSocketAddress(host, targetPort), 4000);
        java.io.OutputStream out = socket.getOutputStream();
        out.write(escposBytes);
        out.flush();
        return true;
      }
    } catch (Exception e) {
      Log.e("RenacePrint", "Error imprimiendo en impresoras 2connet (" + host + "): " + e.getMessage(), e);
      return false;
    }
  }

  @Override
  public void onWindowFocusChanged(boolean hasFocus) {
    super.onWindowFocusChanged(hasFocus);
    if (hasFocus && userMode) {
      hideSystemUI();
      enableKioskLock();
    }
  }

  @Override
  public boolean dispatchKeyEvent(KeyEvent event) {
    if (userMode) {
      int code = event.getKeyCode();
      if (code == KeyEvent.KEYCODE_BACK
          || code == KeyEvent.KEYCODE_HOME
          || code == KeyEvent.KEYCODE_APP_SWITCH
          || code == KeyEvent.KEYCODE_MENU) {
        return true;
      }
    }
    return super.dispatchKeyEvent(event);
  }

  @Override
  public boolean onKeyDown(int keyCode, KeyEvent event) {
    if (userMode) {
      if (keyCode == KeyEvent.KEYCODE_BACK
          || keyCode == KeyEvent.KEYCODE_HOME
          || keyCode == KeyEvent.KEYCODE_APP_SWITCH
          || keyCode == KeyEvent.KEYCODE_MENU) {
        return true;
      }
    }
    return super.onKeyDown(keyCode, event);
  }

  private void enableKioskLock() {
    try {
      if (userMode) {
        startLockTask();
      }
    } catch (Exception ignored) {}
  }

  private void hideSystemUI() {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
      WindowInsetsController controller = getWindow().getInsetsController();
      if (controller != null) {
        controller.hide(WindowInsets.Type.statusBars() | WindowInsets.Type.navigationBars());
        controller.setSystemBarsBehavior(WindowInsetsController.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);
      }
    } else {
      getWindow().getDecorView().setSystemUiVisibility(
          View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
              | View.SYSTEM_UI_FLAG_LAYOUT_STABLE
              | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
              | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
              | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
              | View.SYSTEM_UI_FLAG_FULLSCREEN);
    }
  }

  private void injectAll(WebView view) {
    if (view == null) return;
    String mode = userMode ? "user" : "admin";
    String boot =
        "window.__renaceShellCfg=Object.assign(window.__renaceShellCfg||{},{mode:'"
            + mode
            + "',keymap:{enabled:true,profile:'eleventa',sales:'F1',pay:'F12',payPrint:'F1',payNoPrint:'F2',cancel:'Escape',priceCheck:'F9',wholesale:'F11'}});";
    view.evaluateJavascript(DESKTOP_BRIDGE, null);
    view.evaluateJavascript(PUSH_STUB, null);
    view.evaluateJavascript(boot, null);
    if (userShellJs != null && !userShellJs.isEmpty()) {
      view.evaluateJavascript(userShellJs, null);
    }
  }

  private String loadAsset(String name) {
    try (InputStream in = getAssets().open(name)) {
      ByteArrayOutputStream out = new ByteArrayOutputStream();
      byte[] buf = new byte[4096];
      int n;
      while ((n = in.read(buf)) > 0) out.write(buf, 0, n);
      return out.toString("UTF-8");
    } catch (Exception e) {
      return "";
    }
  }
}
