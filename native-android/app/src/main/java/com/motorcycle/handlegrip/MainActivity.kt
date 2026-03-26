package com.motorcycle.handlegrip

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.Surface
import androidx.compose.ui.Modifier
import com.motorcycle.handlegrip.ui.HandlegripScreen
import com.motorcycle.handlegrip.ui.theme.HandlegripTheme

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            HandlegripTheme {
                Surface(modifier = Modifier.fillMaxSize()) {
                    HandlegripScreen()
                }
            }
        }
    }
}
