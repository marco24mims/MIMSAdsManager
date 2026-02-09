import Foundation

/// MIMS Ad Manager SDK for iOS
///
/// Usage:
/// ```swift
/// MIMSAds.shared.initialize(serverUrl: "http://your-server:8080")
/// let bannerView = BannerView()
/// bannerView.slotId = "slot1"
/// bannerView.adSize = .banner
/// bannerView.targeting = ["section": "news", "country": "sg"]
/// bannerView.loadAd()
/// ```
public final class MIMSAds {

    /// Shared instance
    public static let shared = MIMSAds()

    /// Server URL
    private(set) public var serverUrl: String = ""

    /// User ID
    private(set) public var userId: String = ""

    /// Whether SDK is initialized
    private(set) public var isInitialized: Bool = false

    private let userIdKey = "mims_user_id"

    private init() {}

    /// Initialize the MIMS Ads SDK
    /// - Parameter serverUrl: The URL of the MIMS Ad Server
    public func initialize(serverUrl: String) {
        self.serverUrl = serverUrl.trimmingCharacters(in: CharacterSet(charactersIn: "/"))
        self.userId = getOrCreateUserId()
        self.isInitialized = true
    }

    /// Set a custom user ID
    public func setUserId(_ userId: String) {
        self.userId = userId
        UserDefaults.standard.set(userId, forKey: userIdKey)
    }

    private func getOrCreateUserId() -> String {
        if let storedId = UserDefaults.standard.string(forKey: userIdKey), !storedId.isEmpty {
            return storedId
        }

        let newId = "ios_\(UUID().uuidString.lowercased())"
        UserDefaults.standard.set(newId, forKey: userIdKey)
        return newId
    }
}

/// Standard ad sizes
public enum AdSize {
    case banner          // 320x50
    case largeBanner     // 320x100
    case mediumRectangle // 300x250
    case fullBanner      // 468x60
    case leaderboard     // 728x90

    public var width: Int {
        switch self {
        case .banner, .largeBanner: return 320
        case .mediumRectangle: return 300
        case .fullBanner: return 468
        case .leaderboard: return 728
        }
    }

    public var height: Int {
        switch self {
        case .banner: return 50
        case .largeBanner: return 100
        case .mediumRectangle: return 250
        case .fullBanner: return 60
        case .leaderboard: return 90
        }
    }
}

/// Ad event delegate
public protocol AdDelegate: AnyObject {
    func adDidLoad(_ bannerView: BannerView)
    func adDidFailToLoad(_ bannerView: BannerView, error: Error)
    func adDidClick(_ bannerView: BannerView)
}

/// Default implementation for optional methods
public extension AdDelegate {
    func adDidClick(_ bannerView: BannerView) {}
}
