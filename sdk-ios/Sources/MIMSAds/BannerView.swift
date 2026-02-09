import UIKit

/// Banner ad view for displaying MIMS ads
public class BannerView: UIView {

    /// Slot ID for this banner
    public var slotId: String = "default"

    /// Ad size
    public var adSize: AdSize = .banner

    /// Targeting key-values
    public var targeting: [String: String] = [:]

    /// Delegate for ad events
    public weak var delegate: AdDelegate?

    private var currentAd: AdResult?
    private var imageView: UIImageView?
    private var viewabilityTimer: Timer?
    private var hasTrackedViewable = false
    private var visibleTime: TimeInterval = 0

    private let session: URLSession = {
        let config = URLSessionConfiguration.default
        config.timeoutIntervalForRequest = 10
        return URLSession(configuration: config)
    }()

    public override init(frame: CGRect) {
        super.init(frame: frame)
        setupView()
    }

    required init?(coder: NSCoder) {
        super.init(coder: coder)
        setupView()
    }

    private func setupView() {
        backgroundColor = .clear
        clipsToBounds = true

        let tapGesture = UITapGestureRecognizer(target: self, action: #selector(handleTap))
        addGestureRecognizer(tapGesture)
        isUserInteractionEnabled = true
    }

    /// Load an ad
    public func loadAd() {
        guard MIMSAds.shared.isInitialized else {
            delegate?.adDidFailToLoad(self, error: MIMSError.notInitialized)
            return
        }

        fetchAd { [weak self] result in
            DispatchQueue.main.async {
                guard let self = self else { return }

                switch result {
                case .success(let ad):
                    self.displayAd(ad)
                case .failure(let error):
                    self.delegate?.adDidFailToLoad(self, error: error)
                }
            }
        }
    }

    private func fetchAd(completion: @escaping (Result<AdResult, Error>) -> Void) {
        let request = AdRequest(
            slots: [AdSlot(id: slotId, width: adSize.width, height: adSize.height)],
            targeting: targeting,
            userId: MIMSAds.shared.userId,
            platform: "ios",
            country: targeting["country"] ?? ""
        )

        guard let url = URL(string: "\(MIMSAds.shared.serverUrl)/v1/ads") else {
            completion(.failure(MIMSError.invalidURL))
            return
        }

        var urlRequest = URLRequest(url: url)
        urlRequest.httpMethod = "POST"
        urlRequest.setValue("application/json", forHTTPHeaderField: "Content-Type")
        urlRequest.setValue(MIMSAds.shared.userId, forHTTPHeaderField: "X-User-ID")

        do {
            urlRequest.httpBody = try JSONEncoder().encode(request)
        } catch {
            completion(.failure(error))
            return
        }

        session.dataTask(with: urlRequest) { data, response, error in
            if let error = error {
                completion(.failure(error))
                return
            }

            guard let data = data else {
                completion(.failure(MIMSError.noData))
                return
            }

            do {
                let adResponse = try JSONDecoder().decode(AdResponse.self, from: data)
                if let ad = adResponse.ads.first {
                    completion(.success(ad))
                } else {
                    completion(.failure(MIMSError.noAdsAvailable))
                }
            } catch {
                completion(.failure(error))
            }
        }.resume()
    }

    private func displayAd(_ ad: AdResult) {
        currentAd = ad
        hasTrackedViewable = false
        visibleTime = 0

        loadImage(from: ad.imageUrl) { [weak self] image in
            DispatchQueue.main.async {
                guard let self = self, let image = image else {
                    self?.delegate?.adDidFailToLoad(self!, error: MIMSError.imageLoadFailed)
                    return
                }

                // Create or reuse image view
                if self.imageView == nil {
                    self.imageView = UIImageView()
                    self.imageView?.contentMode = .scaleAspectFit
                    self.addSubview(self.imageView!)
                }

                self.imageView?.image = image
                self.imageView?.frame = self.bounds

                // Fire impression pixel
                self.firePixel(ad.tracking.impression)

                // Start viewability tracking
                self.startViewabilityTracking(ad)

                self.delegate?.adDidLoad(self)
            }
        }
    }

    private func loadImage(from urlString: String, completion: @escaping (UIImage?) -> Void) {
        guard let url = URL(string: urlString) else {
            completion(nil)
            return
        }

        session.dataTask(with: url) { data, _, _ in
            if let data = data, let image = UIImage(data: data) {
                completion(image)
            } else {
                completion(nil)
            }
        }.resume()
    }

    private func startViewabilityTracking(_ ad: AdResult) {
        viewabilityTimer?.invalidate()
        viewabilityTimer = Timer.scheduledTimer(withTimeInterval: 0.1, repeats: true) { [weak self] _ in
            guard let self = self, !self.hasTrackedViewable else { return }

            if self.isViewable() {
                self.visibleTime += 0.1
                if self.visibleTime >= 1.0 {
                    self.hasTrackedViewable = true
                    self.firePixel(ad.tracking.viewable)
                    self.viewabilityTimer?.invalidate()
                }
            } else {
                self.visibleTime = 0
            }
        }
    }

    private func isViewable() -> Bool {
        guard window != nil, !isHidden, alpha > 0 else { return false }

        guard let windowBounds = window?.bounds else { return false }

        let frameInWindow = convert(bounds, to: window)
        let intersection = frameInWindow.intersection(windowBounds)

        guard !intersection.isNull else { return false }

        let visibleArea = intersection.width * intersection.height
        let totalArea = bounds.width * bounds.height

        return visibleArea >= totalArea * 0.5
    }

    private func firePixel(_ urlString: String) {
        guard let url = URL(string: urlString) else { return }

        session.dataTask(with: url) { _, _, _ in
            // Ignore result
        }.resume()
    }

    @objc private func handleTap() {
        guard let ad = currentAd else { return }

        delegate?.adDidClick(self)

        if let url = URL(string: ad.tracking.click) {
            UIApplication.shared.open(url, options: [:], completionHandler: nil)
        }
    }

    public override func layoutSubviews() {
        super.layoutSubviews()
        imageView?.frame = bounds
    }

    public override func removeFromSuperview() {
        super.removeFromSuperview()
        viewabilityTimer?.invalidate()
    }

    deinit {
        viewabilityTimer?.invalidate()
    }
}

// MARK: - Error Types

public enum MIMSError: Error, LocalizedError {
    case notInitialized
    case invalidURL
    case noData
    case noAdsAvailable
    case imageLoadFailed

    public var errorDescription: String? {
        switch self {
        case .notInitialized:
            return "MIMS SDK not initialized. Call MIMSAds.shared.initialize() first."
        case .invalidURL:
            return "Invalid server URL"
        case .noData:
            return "No data received from server"
        case .noAdsAvailable:
            return "No ads available"
        case .imageLoadFailed:
            return "Failed to load ad image"
        }
    }
}

// MARK: - API Models

struct AdRequest: Encodable {
    let slots: [AdSlot]
    let targeting: [String: String]
    let userId: String
    let platform: String
    let country: String

    enum CodingKeys: String, CodingKey {
        case slots, targeting, platform, country
        case userId = "user_id"
    }
}

struct AdSlot: Encodable {
    let id: String
    let width: Int
    let height: Int
}

struct AdResponse: Decodable {
    let ads: [AdResult]
}

struct AdResult: Decodable {
    let slotId: String
    let impressionId: String
    let lineItemId: Int
    let creativeId: Int
    let width: Int
    let height: Int
    let imageUrl: String
    let clickUrl: String
    let tracking: Tracking

    enum CodingKeys: String, CodingKey {
        case slotId = "slot_id"
        case impressionId = "impression_id"
        case lineItemId = "line_item_id"
        case creativeId = "creative_id"
        case width, height
        case imageUrl = "image_url"
        case clickUrl = "click_url"
        case tracking
    }
}

struct Tracking: Decodable {
    let impression: String
    let viewable: String
    let click: String
}
