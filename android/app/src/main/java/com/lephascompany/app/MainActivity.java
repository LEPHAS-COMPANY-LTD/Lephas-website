package com.lephascompany.app;

import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.view.View;
import android.view.ViewGroup;
import android.webkit.WebView;

import com.getcapacitor.BridgeActivity;
import com.getcapacitor.WebViewListener;

public class MainActivity extends BridgeActivity {

    private View loadingOverlay;
    private boolean overlayHidden = false;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        loadingOverlay = getLayoutInflater().inflate(R.layout.loading_overlay, null);
        addContentView(
            loadingOverlay,
            new ViewGroup.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT
            )
        );

        getBridge().addWebViewListener(new WebViewListener() {
            @Override
            public void onPageLoaded(WebView webView) {
                hideOverlay();
            }
        });

        new Handler(Looper.getMainLooper()).postDelayed(this::hideOverlay, 15000);
    }

    private void hideOverlay() {
        if (overlayHidden || loadingOverlay == null) {
            return;
        }
        overlayHidden = true;
        runOnUiThread(() ->
            loadingOverlay
                .animate()
                .alpha(0f)
                .setDuration(350)
                .withEndAction(() -> {
                    if (loadingOverlay.getParent() instanceof ViewGroup) {
                        ((ViewGroup) loadingOverlay.getParent()).removeView(loadingOverlay);
                    }
                })
        );
    }
}
