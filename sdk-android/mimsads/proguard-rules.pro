# MIMS Ads SDK ProGuard Rules

# Keep public API
-keep public class com.mims.ads.MIMSAds { *; }
-keep public class com.mims.ads.BannerView { *; }
-keep public class com.mims.ads.AdSize { *; }
-keep public interface com.mims.ads.AdListener { *; }

# Keep Gson annotations
-keepattributes Signature
-keepattributes *Annotation*
-keep class com.google.gson.** { *; }
