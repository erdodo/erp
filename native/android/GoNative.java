package com.erp.app;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.os.Bundle;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

/**
 * Minimal Android Activity — WebView shell.
 * Go business logic (tabs, cache, local DB) is provided by the Go library
 * compiled with `gomobile bind`.
 *
 * Build steps:
 *   1. gomobile bind -target android -o erp.aar ./cmd/android/binding
 *   2. Copy erp.aar into this Android project's libs/
 *   3. ./gradlew assembleRelease
 */
public class GoNative extends Activity {

    private WebView webView;
    private String  currentTabId;

    static {
        System.loadLibrary("erp"); // loaded automatically by gomobile
    }

    // JNI methods — implemented in Go (cmd/android/main.go)
    public static native String getInitURL();
    public static native String newTab(String url);
    public static native void   onPageLoaded(String url);

    @SuppressLint("SetJavaScriptEnabled")
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        webView = new WebView(this);
        setContentView(webView);

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setCacheMode(WebSettings.LOAD_DEFAULT);
        settings.setMediaPlaybackRequiresUserGesture(false);

        webView.setWebChromeClient(new WebChromeClient());
        webView.setWebViewClient(new WebViewClient() {
            @Override
            public void onPageFinished(WebView view, String url) {
                super.onPageFinished(view, url);
                onPageLoaded(url);
            }
        });

        // Tab management bridge — callable from JavaScript
        webView.addJavascriptInterface(new Object() {
            @android.webkit.JavascriptInterface
            public String openNewTab(String url) {
                return newTab(url);
            }
            @android.webkit.JavascriptInterface
            public void navigate(String url) {
                runOnUiThread(() -> webView.loadUrl(url));
            }
        }, "AndroidNative");

        String initURL = getInitURL();
        if (initURL == null || initURL.isEmpty()) {
            initURL = "http://10.0.2.2:3000"; // dev server on emulator
        }
        webView.loadUrl(initURL);
    }

    @Override
    public void onBackPressed() {
        if (webView.canGoBack()) {
            webView.goBack();
        } else {
            super.onBackPressed();
        }
    }

    @Override
    protected void onDestroy() {
        super.onDestroy();
        webView.destroy();
    }
}
