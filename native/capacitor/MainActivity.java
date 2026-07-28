package tech.renace.portal;

import android.content.SharedPreferences;
import android.os.Bundle;
import android.webkit.WebView;
import androidx.activity.OnBackPressedCallback;
import com.getcapacitor.Bridge;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.BridgeWebViewClient;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;

/**
 * Modo Usuario: bloquea botón Atrás del sistema.
 * Inyecta push-stub + atajos Eleventa en cada navegación (también a Odoo remoto).
 */
public class MainActivity extends BridgeActivity {
  private static final String PREFS = "renace_portal";
  private static final String KEY_MODE = "app_mode";

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

    getOnBackPressedDispatcher().addCallback(this, new OnBackPressedCallback(true) {
      @Override
      public void handleOnBackPressed() {
        if (userMode) {
          // Modo Usuario: no salir / no historial atrás
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
    webView.setWebViewClient(new BridgeWebViewClient(bridge) {
      @Override
      public void onPageStarted(WebView view, String url, android.graphics.Bitmap favicon) {
        injectAll(view);
        super.onPageStarted(view, url, favicon);
      }

      @Override
      public void onPageFinished(WebView view, String url) {
        injectAll(view);
        super.onPageFinished(view, url);
      }
    });
    injectAll(webView);
  }

  private void injectAll(WebView view) {
    if (view == null) return;
    String mode = userMode ? "user" : "admin";
    String boot =
        "window.__renaceShellCfg=Object.assign(window.__renaceShellCfg||{},{mode:'"
            + mode
            + "',keymap:{enabled:true,profile:'eleventa',sales:'F1',pay:'F12',payPrint:'F1',payNoPrint:'F2',cancel:'Escape',priceCheck:'F9',wholesale:'F11'}});";
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
