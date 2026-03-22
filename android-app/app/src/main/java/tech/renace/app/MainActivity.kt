package tech.renace.app

import android.os.Bundle
import android.webkit.WebChromeClient
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.appcompat.app.AppCompatActivity

class MainActivity : AppCompatActivity() {
    
    private lateinit var webView: WebView
    private val portalUrl = "https://renace.tech/portal"
    private val userAgent = "RENACE-App/1.0.0 (Android; Native)"
    
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)
        
        webView = findViewById(R.id.webview)
        
        // Configure WebView
        val webSettings: WebSettings = webView.settings
        webSettings.javaScriptEnabled = true
        webSettings.domStorageEnabled = true
        webSettings.cacheMode = WebSettings.LOAD_DEFAULT
        webSettings.userAgentString = userAgent
        
        // Enable mixed content for HTTPS
        webSettings.mixedContentMode = WebSettings.MIXED_CONTENT_ALWAYS_ALLOW
        
        // Set WebView clients
        webView.webViewClient = object : WebViewClient() {
            override fun shouldOverrideUrlLoading(view: WebView?, url: String?): Boolean {
                url?.let {
                    // Handle renace:// protocol
                    if (it.startsWith("renace://")) {
                        handleRenaceProtocol(it)
                        return true
                    }
                    // Handle external URLs
                    if (!it.contains("renace.tech")) {
                        // Open external links in browser
                        return true
                    }
                }
                return false
            }
        }
        
        webView.webChromeClient = WebChromeClient()
        
        // Load portal
        webView.loadUrl(portalUrl)
    }
    
    private fun handleRenaceProtocol(url: String) {
        // Extract token from URL
        val token = url.substringAfter("token=", "")
        if (token.isNotEmpty()) {
            // Handle SSO token
            val redirectUrl = "https://renace.tech/portal?token=$token"
            webView.loadUrl(redirectUrl)
        }
    }
    
    override fun onBackPressed() {
        if (webView.canGoBack()) {
            webView.goBack()
        } else {
            super.onBackPressed()
        }
    }
    
    override fun onPause() {
        super.onPause()
        webView.onPause()
    }
    
    override fun onResume() {
        super.onResume()
        webView.onResume()
    }
    
    override fun onDestroy() {
        webView.destroy()
        super.onDestroy()
    }
}
