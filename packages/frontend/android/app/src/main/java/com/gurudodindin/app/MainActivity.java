package com.gurudodindin.app;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;
import com.capacitorjs.plugins.splashscreen.SplashScreenPlugin;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Registrar o plugin de splash screen
        registerPlugin(SplashScreenPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
