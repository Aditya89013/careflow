package com.careflow.app

import android.annotation.SuppressLint
import android.content.res.Configuration
import android.graphics.Bitmap
import android.os.Bundle
import android.view.View
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.ProgressBar
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity

class MainActivity : AppCompatActivity() {

    private lateinit var webView: WebView
    private lateinit var progressBar: ProgressBar

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        // Setup simple layout with full-screen WebView and a progress bar
        val rootView = android.widget.FrameLayout(this)
        
        webView = WebView(this).apply {
            layoutParams = android.widget.FrameLayout.LayoutParams(
                android.widget.FrameLayout.LayoutParams.MATCH_PARENT,
                android.widget.FrameLayout.LayoutParams.MATCH_PARENT
            )
            visibility = View.INVISIBLE
        }
        
        progressBar = ProgressBar(this, null, android.R.attr.progressBarStyleLarge).apply {
            val size = (64 * resources.displayMetrics.density).toInt()
            layoutParams = android.widget.FrameLayout.LayoutParams(size, size).apply {
                gravity = android.view.Gravity.CENTER
            }
        }
        
        rootView.addView(webView)
        rootView.addView(progressBar)
        setContentView(rootView)

        // Configure WebView parameters for tablet-scale views
        webView.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            databaseEnabled = true
            useWideViewPort = true
            loadWithOverviewMode = true
            cacheMode = WebSettings.LOAD_DEFAULT
            mediaPlaybackRequiresUserGesture = false
            
            // Adjust scaling specifically for tablets vs phones
            if (isTablet()) {
                setSupportZoom(true)
                builtInZoomControls = true
                displayZoomControls = false
                textZoom = 100
            } else {
                setSupportZoom(false)
                textZoom = 95
            }
        }

        webView.webViewClient = object : WebViewClient() {
            override fun onPageStarted(view: WebView?, url: String?, favicon: Bitmap?) {
                progressBar.visibility = View.VISIBLE
            }

            override fun onPageFinished(view: WebView?, url: String?) {
                progressBar.visibility = View.GONE
                webView.visibility = View.VISIBLE
            }

            override fun onReceivedError(
                view: WebView?,
                errorCode: Int,
                description: String?,
                failingUrl: String?
            ) {
                progressBar.visibility = View.GONE
                Toast.makeText(
                    this@MainActivity,
                    "Failed to connect to CareFlow Server: $description (URL: $failingUrl)",
                    Toast.LENGTH_LONG
                ).show()
                
                // Load local static backup page if server is offline
                webView.loadData(
                    "<html><body style='background-color:#0f172a;color:#94a3b8;font-family:sans-serif;text-align:center;padding-top:20%;'>" +
                            "<h2>Connection Offline</h2>" +
                            "<p>Cannot reach the CareFlow HIS network ($description). Please check your connection.</p>" +
                            "<p style='font-size:12px;color:#64748b;'>URL: $failingUrl</p>" +
                            "<button onclick='location.reload()' style='padding:10px 20px;background:#3b82f6;color:white;border:none;border-radius:4px;'>Retry</button>" +
                            "</body></html>",
                    "text/html",
                    "UTF-8"
                )
            }

            @SuppressLint("WebViewClientOnReceivedSslError")
            override fun onReceivedSslError(
                view: WebView?,
                handler: android.webkit.SslErrorHandler?,
                error: android.net.http.SslError?
            ) {
                handler?.proceed() // Proceed past SSL validation failure (specifically for Let's Encrypt trust on old Android WebViews)
            }
        }

        // Point to deployed hospital server or local intranet node
        webView.loadUrl("https://careflow-med-inky.vercel.app")
    }

    private fun isTablet(): Boolean {
        val screenLayout = resources.configuration.screenLayout
        val size = screenLayout and Configuration.SCREENLAYOUT_SIZE_MASK
        return size == Configuration.SCREENLAYOUT_SIZE_LARGE || size == Configuration.SCREENLAYOUT_SIZE_XLARGE
    }

    override fun onBackPressed() {
        if (webView.canGoBack()) {
            webView.goBack()
        } else {
            super.onBackPressed()
        }
    }
}
