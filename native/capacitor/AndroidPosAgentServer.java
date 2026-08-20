package tech.renace.portal;

import android.util.Log;
import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.ServerSocket;
import java.net.Socket;
import org.json.JSONObject;

/**
 * RENACE POSAgent embebido en Android:
 * Servidor HTTP local (127.0.0.1:9069) compatible con el protocolo hw_proxy de Odoo POS / IoT Box.
 * Captura las impresiones directas de recibos y apertura de cajón de dinero sin requerir PC externa.
 */
public class AndroidPosAgentServer implements Runnable {
    private static final String TAG = "RenacePOSAgent";
    private final int port;
    private final MainActivity mainActivity;
    private ServerSocket serverSocket;
    private boolean running = false;

    public AndroidPosAgentServer(MainActivity mainActivity, int port) {
        this.mainActivity = mainActivity;
        this.port = port;
    }

    public void start() {
        if (running) return;
        running = true;
        new Thread(this, "RenacePOSAgentThread").start();
    }

    public void stop() {
        running = false;
        try {
            if (serverSocket != null && !serverSocket.isClosed()) {
                serverSocket.close();
            }
        } catch (Exception ignored) {}
    }

    @Override
    public void run() {
        try {
            serverSocket = new ServerSocket(port);
            Log.i(TAG, "RENACE POSAgent embebido activo en 127.0.0.1:" + port);
            while (running && !serverSocket.isClosed()) {
                try {
                    Socket client = serverSocket.accept();
                    handleClient(client);
                } catch (Exception e) {
                    if (!running) break;
                }
            }
        } catch (Exception e) {
            Log.e(TAG, "Error iniciando POSAgent embebido en puerto " + port + ": " + e.getMessage());
        }
    }

    private void handleClient(Socket socket) {
        new Thread(() -> {
            try (Socket s = socket;
                 BufferedReader reader = new BufferedReader(new InputStreamReader(s.getInputStream(), "UTF-8"));
                 OutputStream out = s.getOutputStream()) {

                String requestLine = reader.readLine();
                if (requestLine == null) return;

                int contentLength = 0;
                String line;
                while ((line = reader.readLine()) != null && !line.isEmpty()) {
                    if (line.toLowerCase().startsWith("content-length:")) {
                        contentLength = Integer.parseInt(line.substring(15).trim());
                    }
                }

                String method = requestLine.split(" ")[0].toUpperCase();
                String path = requestLine.split(" ")[1];

                if ("OPTIONS".equals(method)) {
                    sendRawResponse(out, 200, "{\"ok\":true}");
                    return;
                }

                char[] bodyChars = new char[contentLength];
                if (contentLength > 0) {
                    int read = 0;
                    while (read < contentLength) {
                        int n = reader.read(bodyChars, read, contentLength - read);
                        if (n <= 0) break;
                        read += n;
                    }
                }
                String body = new String(bodyChars);
                int reqId = 0;
                String action = "";
                String receiptB64 = "";

                try {
                    JSONObject json = new JSONObject(body.isEmpty() ? "{}" : body);
                    reqId = json.optInt("id", 0);
                    JSONObject params = json.optJSONObject("params");
                    if (params != null) {
                        JSONObject data = params.optJSONObject("data");
                        if (data != null) {
                            action = data.optString("action", "");
                            receiptB64 = data.optString("receipt", "");
                        }
                    }
                } catch (Exception ignored) {}

                if ("print_receipt".equals(action) || path.contains("print_xml_receipt")) {
                    if (mainActivity != null) {
                        mainActivity.printWebViewPage();
                    }
                    sendJsonRpcResponse(out, reqId, true);
                } else if ("cashbox".equals(action) || path.contains("open_cashbox")) {
                    sendJsonRpcResponse(out, reqId, true);
                } else if (path.contains("status_json") || path.contains("hello")) {
                    String statusResult = "{\"status\":\"connected\",\"drivers\":{\"printer\":{\"status\":\"connected\"},\"cashbox\":{\"status\":\"connected\"}}}";
                    sendRawResponse(out, 200, "{\"jsonrpc\":\"2.0\",\"id\":" + reqId + ",\"result\":" + statusResult + "}");
                } else {
                    sendJsonRpcResponse(out, reqId, true);
                }

            } catch (Exception e) {
                Log.e(TAG, "Error procesando cliente POSAgent: " + e.getMessage());
            }
        }).start();
    }

    private void sendJsonRpcResponse(OutputStream out, int id, boolean result) throws Exception {
        String json = "{\"jsonrpc\":\"2.0\",\"id\":" + id + ",\"result\":" + (result ? "true" : "false") + "}";
        sendRawResponse(out, 200, json);
    }

    private void sendRawResponse(OutputStream out, int status, String body) throws Exception {
        byte[] b = body.getBytes("UTF-8");
        String head = "HTTP/1.1 " + status + " OK\r\n"
                + "Access-Control-Allow-Origin: *\r\n"
                + "Access-Control-Allow-Methods: GET, POST, OPTIONS\r\n"
                + "Access-Control-Allow-Headers: Origin, X-Requested-With, Content-Type, Accept, Authorization\r\n"
                + "Content-Type: application/json\r\n"
                + "Content-Length: " + b.length + "\r\n"
                + "Connection: close\r\n\r\n";
        out.write(head.getBytes("UTF-8"));
        out.write(b);
        out.flush();
    }
}
