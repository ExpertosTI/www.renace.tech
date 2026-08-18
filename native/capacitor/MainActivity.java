package tech.renace.portal;

import android.content.SharedPreferences;
import android.os.Build;
import android.os.Bundle;
import android.view.KeyEvent;
import android.view.View;
import android.view.WindowInsets;
import android.view.WindowInsetsController;
import android.view.WindowManager;
import android.webkit.WebView;
import androidx.activity.OnBackPressedCallback;
import com.getcapacitor.Bridge;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.BridgeWebViewClient;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;

/**
 * Modo Usuario / Kiosk Lockdown:
 * Bloquea botón Atrás del sistema, Inicio (Home), Recientes, gestos y cierre de la app.
 * Inyecta push-stub + atajos Eleventa en cada navegación.
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
