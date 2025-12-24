package com.gurudodindin.app;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;
import com.codetrix.plugins.googleauth.GoogleAuth;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        registerPlugin(GoogleAuth.class);
    }
}
