package com.mims.ads

import android.content.Context
import android.content.SharedPreferences
import java.util.UUID

/**
 * MIMS Ad Manager SDK for Android
 *
 * Usage:
 *   MIMSAds.initialize(context, "http://your-server:8080")
 *   val bannerView = BannerView(context)
 *   bannerView.setSlotId("slot1")
 *   bannerView.setAdSize(AdSize.BANNER)
 *   bannerView.setTargeting(mapOf("section" to "news", "country" to "sg"))
 *   bannerView.loadAd()
 */
object MIMSAds {
    private const val PREFS_NAME = "mims_ads_prefs"
    private const val KEY_USER_ID = "user_id"

    private var serverUrl: String = ""
    private var userId: String = ""
    private var isInitialized = false

    /**
     * Initialize the MIMS Ads SDK
     * @param context Application context
     * @param serverUrl The URL of the MIMS Ad Server
     */
    fun initialize(context: Context, serverUrl: String) {
        this.serverUrl = serverUrl.trimEnd('/')
        this.userId = getOrCreateUserId(context)
        this.isInitialized = true
    }

    /**
     * Check if SDK is initialized
     */
    fun isInitialized(): Boolean = isInitialized

    /**
     * Get the server URL
     */
    fun getServerUrl(): String {
        check(isInitialized) { "MIMSAds SDK not initialized. Call MIMSAds.initialize() first." }
        return serverUrl
    }

    /**
     * Get the user ID
     */
    fun getUserId(): String {
        check(isInitialized) { "MIMSAds SDK not initialized. Call MIMSAds.initialize() first." }
        return userId
    }

    /**
     * Set a custom user ID
     */
    fun setUserId(context: Context, userId: String) {
        this.userId = userId
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        prefs.edit().putString(KEY_USER_ID, userId).apply()
    }

    private fun getOrCreateUserId(context: Context): String {
        val prefs: SharedPreferences = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        var storedUserId = prefs.getString(KEY_USER_ID, null)

        if (storedUserId.isNullOrEmpty()) {
            storedUserId = "android_${UUID.randomUUID()}"
            prefs.edit().putString(KEY_USER_ID, storedUserId).apply()
        }

        return storedUserId
    }
}

/**
 * Standard ad sizes
 */
enum class AdSize(val width: Int, val height: Int) {
    BANNER(320, 50),
    LARGE_BANNER(320, 100),
    MEDIUM_RECTANGLE(300, 250),
    FULL_BANNER(468, 60),
    LEADERBOARD(728, 90)
}
