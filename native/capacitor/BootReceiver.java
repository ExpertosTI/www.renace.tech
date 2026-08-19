package tech.renace.portal;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.util.Log;

/**
 * Autostart en inicio del dispositivo (Boot Receiver).
 * Lanza MainActivity automáticamente cuando la tablet o teléfono enciende.
 */
public class BootReceiver extends BroadcastReceiver {
    private static final String TAG = "RenaceBootReceiver";

    @Override
    public void onReceive(Context context, Intent intent) {
        if (intent == null) return;
        String action = intent.getAction();
        Log.i(TAG, "BootReceiver recibido intento con accion: " + action);

        if (Intent.ACTION_BOOT_COMPLETED.equals(action)
                || "android.intent.action.QUICKBOOT_POWERON".equals(action)
                || "com.htc.intent.action.QUICKBOOT_POWERON".equals(action)
                || Intent.ACTION_MY_PACKAGE_REPLACED.equals(action)
                || Intent.ACTION_PACKAGE_REPLACED.equals(action)) {

            try {
                Intent launchIntent = new Intent(context, MainActivity.class);
                launchIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK
                        | Intent.FLAG_ACTIVITY_SINGLE_TOP
                        | Intent.FLAG_ACTIVITY_CLEAR_TOP
                        | Intent.FLAG_ACTIVITY_REORDER_TO_FRONT);

                context.startActivity(launchIntent);
                Log.i(TAG, "MainActivity iniciada exitosamente tras el arranque.");
            } catch (Exception e) {
                Log.e(TAG, "Error iniciando MainActivity al arrancar dispositivo: " + e.getMessage(), e);
            }
        }
    }
}
