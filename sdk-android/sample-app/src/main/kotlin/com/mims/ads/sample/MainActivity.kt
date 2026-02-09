package com.mims.ads.sample

import android.os.Bundle
import android.util.Log
import android.widget.Button
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import com.mims.ads.AdListener
import com.mims.ads.AdSize
import com.mims.ads.BannerView
import com.mims.ads.MIMSAds

class MainActivity : AppCompatActivity() {

    private lateinit var bannerView: BannerView
    private lateinit var statusText: TextView

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        statusText = findViewById(R.id.statusText)
        bannerView = findViewById(R.id.bannerView)

        // Initialize SDK - change this to your server URL
        // For local development with emulator, use 10.0.2.2 instead of localhost
        MIMSAds.initialize(this, "http://10.0.2.2:8080")

        // Configure banner
        bannerView.setSlotId("android_banner_1")
        bannerView.setAdSize(AdSize.BANNER)
        bannerView.setTargeting(mapOf(
            "section" to "home",
            "country" to "sg"
        ))

        // Set ad listener
        bannerView.setAdListener(object : AdListener {
            override fun onAdLoaded() {
                Log.d(TAG, "Ad loaded successfully")
                statusText.text = "Ad loaded"
                Toast.makeText(this@MainActivity, "Ad loaded!", Toast.LENGTH_SHORT).show()
            }

            override fun onAdFailedToLoad(error: String) {
                Log.e(TAG, "Ad failed to load: $error")
                statusText.text = "Failed: $error"
                Toast.makeText(this@MainActivity, "Failed: $error", Toast.LENGTH_SHORT).show()
            }

            override fun onAdClicked() {
                Log.d(TAG, "Ad clicked")
                statusText.text = "Ad clicked"
            }
        })

        // Load ad button
        findViewById<Button>(R.id.loadAdButton).setOnClickListener {
            statusText.text = "Loading ad..."
            bannerView.loadAd()
        }

        // Auto-load ad on start
        statusText.text = "Loading ad..."
        bannerView.loadAd()
    }

    companion object {
        private const val TAG = "MIMSAdsSample"
    }
}
