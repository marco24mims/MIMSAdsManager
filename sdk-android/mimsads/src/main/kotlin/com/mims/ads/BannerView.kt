package com.mims.ads

import android.content.Context
import android.content.Intent
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.net.Uri
import android.os.Handler
import android.os.Looper
import android.util.AttributeSet
import android.view.View
import android.widget.FrameLayout
import android.widget.ImageView
import com.google.gson.Gson
import com.google.gson.annotations.SerializedName
import kotlinx.coroutines.*
import okhttp3.*
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.RequestBody.Companion.toRequestBody
import java.io.IOException
import java.util.concurrent.TimeUnit

/**
 * Banner ad view for displaying MIMS ads
 */
class BannerView @JvmOverloads constructor(
    context: Context,
    attrs: AttributeSet? = null,
    defStyleAttr: Int = 0
) : FrameLayout(context, attrs, defStyleAttr) {

    private var slotId: String = "default"
    private var adSize: AdSize = AdSize.BANNER
    private var targeting: Map<String, String> = emptyMap()
    private var listener: AdListener? = null

    private var currentAd: AdResult? = null
    private var imageView: ImageView? = null
    private var viewabilityJob: Job? = null
    private var hasTrackedViewable = false

    private val client = OkHttpClient.Builder()
        .connectTimeout(10, TimeUnit.SECONDS)
        .readTimeout(10, TimeUnit.SECONDS)
        .build()

    private val gson = Gson()
    private val mainHandler = Handler(Looper.getMainLooper())
    private val coroutineScope = CoroutineScope(Dispatchers.Main + SupervisorJob())

    init {
        // Set up click handling
        setOnClickListener {
            currentAd?.let { ad ->
                listener?.onAdClicked()
                openUrl(ad.tracking.click)
            }
        }
    }

    /**
     * Set the slot ID for this banner
     */
    fun setSlotId(slotId: String) {
        this.slotId = slotId
    }

    /**
     * Set the ad size
     */
    fun setAdSize(adSize: AdSize) {
        this.adSize = adSize
    }

    /**
     * Set targeting key-values
     */
    fun setTargeting(targeting: Map<String, String>) {
        this.targeting = targeting
    }

    /**
     * Set the ad listener
     */
    fun setAdListener(listener: AdListener) {
        this.listener = listener
    }

    /**
     * Load an ad
     */
    fun loadAd() {
        if (!MIMSAds.isInitialized()) {
            listener?.onAdFailedToLoad("SDK not initialized")
            return
        }

        coroutineScope.launch {
            try {
                val ad = fetchAd()
                if (ad != null) {
                    displayAd(ad)
                } else {
                    listener?.onAdFailedToLoad("No ad available")
                }
            } catch (e: Exception) {
                listener?.onAdFailedToLoad(e.message ?: "Unknown error")
            }
        }
    }

    private suspend fun fetchAd(): AdResult? = withContext(Dispatchers.IO) {
        val request = AdRequest(
            slots = listOf(
                AdSlot(
                    id = slotId,
                    width = adSize.width,
                    height = adSize.height
                )
            ),
            targeting = targeting,
            userId = MIMSAds.getUserId(),
            platform = "android",
            country = targeting["country"] ?: ""
        )

        val json = gson.toJson(request)
        val body = json.toRequestBody("application/json".toMediaType())

        val httpRequest = Request.Builder()
            .url("${MIMSAds.getServerUrl()}/v1/ads")
            .post(body)
            .header("X-User-ID", MIMSAds.getUserId())
            .build()

        val response = client.newCall(httpRequest).execute()

        if (!response.isSuccessful) {
            throw IOException("HTTP ${response.code}")
        }

        val responseBody = response.body?.string() ?: return@withContext null
        val adResponse = gson.fromJson(responseBody, AdResponse::class.java)

        adResponse.ads.firstOrNull()
    }

    private suspend fun displayAd(ad: AdResult) {
        currentAd = ad
        hasTrackedViewable = false

        // Load image
        val bitmap = loadImage(ad.imageUrl)

        withContext(Dispatchers.Main) {
            if (bitmap != null) {
                // Create or reuse ImageView
                if (imageView == null) {
                    imageView = ImageView(context).apply {
                        scaleType = ImageView.ScaleType.FIT_XY
                        layoutParams = LayoutParams(
                            LayoutParams.MATCH_PARENT,
                            LayoutParams.MATCH_PARENT
                        )
                    }
                    addView(imageView)
                }

                imageView?.setImageBitmap(bitmap)

                // Fire impression pixel
                firePixel(ad.tracking.impression)

                // Start viewability tracking
                startViewabilityTracking(ad)

                listener?.onAdLoaded()
            } else {
                listener?.onAdFailedToLoad("Failed to load ad image")
            }
        }
    }

    private suspend fun loadImage(url: String): Bitmap? = withContext(Dispatchers.IO) {
        try {
            val request = Request.Builder().url(url).build()
            val response = client.newCall(request).execute()

            if (response.isSuccessful) {
                response.body?.byteStream()?.use { inputStream ->
                    BitmapFactory.decodeStream(inputStream)
                }
            } else {
                null
            }
        } catch (e: Exception) {
            null
        }
    }

    private fun startViewabilityTracking(ad: AdResult) {
        viewabilityJob?.cancel()
        viewabilityJob = coroutineScope.launch {
            // Check viewability every 100ms
            var visibleTime = 0L
            val requiredTime = 1000L // 1 second

            while (!hasTrackedViewable) {
                delay(100)

                if (isViewable()) {
                    visibleTime += 100
                    if (visibleTime >= requiredTime) {
                        hasTrackedViewable = true
                        firePixel(ad.tracking.viewable)
                    }
                } else {
                    visibleTime = 0
                }
            }
        }
    }

    private fun isViewable(): Boolean {
        if (!isAttachedToWindow || visibility != View.VISIBLE) {
            return false
        }

        val location = IntArray(2)
        getLocationOnScreen(location)

        val viewRect = android.graphics.Rect(
            location[0],
            location[1],
            location[0] + width,
            location[1] + height
        )

        val screenWidth = context.resources.displayMetrics.widthPixels
        val screenHeight = context.resources.displayMetrics.heightPixels

        val screenRect = android.graphics.Rect(0, 0, screenWidth, screenHeight)

        if (!android.graphics.Rect.intersects(viewRect, screenRect)) {
            return false
        }

        val intersect = android.graphics.Rect(viewRect)
        intersect.intersect(screenRect)

        val visibleArea = intersect.width() * intersect.height()
        val totalArea = width * height

        // 50% or more visible
        return visibleArea >= totalArea * 0.5
    }

    private fun firePixel(url: String) {
        coroutineScope.launch(Dispatchers.IO) {
            try {
                val request = Request.Builder().url(url).build()
                client.newCall(request).execute().close()
            } catch (e: Exception) {
                // Ignore pixel errors
            }
        }
    }

    private fun openUrl(url: String) {
        try {
            val intent = Intent(Intent.ACTION_VIEW, Uri.parse(url))
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            context.startActivity(intent)
        } catch (e: Exception) {
            // Handle error
        }
    }

    override fun onDetachedFromWindow() {
        super.onDetachedFromWindow()
        viewabilityJob?.cancel()
        coroutineScope.cancel()
    }
}

/**
 * Ad event listener
 */
interface AdListener {
    fun onAdLoaded()
    fun onAdFailedToLoad(error: String)
    fun onAdClicked()
}

// Data classes for API communication
internal data class AdRequest(
    val slots: List<AdSlot>,
    val targeting: Map<String, String>,
    @SerializedName("user_id") val userId: String,
    val platform: String,
    val country: String
)

internal data class AdSlot(
    val id: String,
    val width: Int,
    val height: Int
)

internal data class AdResponse(
    val ads: List<AdResult>
)

internal data class AdResult(
    @SerializedName("slot_id") val slotId: String,
    @SerializedName("impression_id") val impressionId: String,
    @SerializedName("line_item_id") val lineItemId: Int,
    @SerializedName("creative_id") val creativeId: Int,
    val width: Int,
    val height: Int,
    @SerializedName("image_url") val imageUrl: String,
    @SerializedName("click_url") val clickUrl: String,
    val tracking: Tracking
)

internal data class Tracking(
    val impression: String,
    val viewable: String,
    val click: String
)
