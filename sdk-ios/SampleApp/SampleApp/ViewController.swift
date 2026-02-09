import UIKit
import MIMSAds

class ViewController: UIViewController {

    private let titleLabel: UILabel = {
        let label = UILabel()
        label.text = "MIMS Ads Sample"
        label.font = .boldSystemFont(ofSize: 24)
        label.translatesAutoresizingMaskIntoConstraints = false
        return label
    }()

    private let statusLabel: UILabel = {
        let label = UILabel()
        label.text = "Ready"
        label.font = .systemFont(ofSize: 16)
        label.textColor = .gray
        label.translatesAutoresizingMaskIntoConstraints = false
        return label
    }()

    private let loadButton: UIButton = {
        let button = UIButton(type: .system)
        button.setTitle("Load Ad", for: .normal)
        button.titleLabel?.font = .systemFont(ofSize: 18)
        button.translatesAutoresizingMaskIntoConstraints = false
        return button
    }()

    private let bannerContainer: UIView = {
        let view = UIView()
        view.backgroundColor = UIColor(white: 0.95, alpha: 1)
        view.layer.cornerRadius = 8
        view.translatesAutoresizingMaskIntoConstraints = false
        return view
    }()

    private var bannerView: BannerView!

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = .white

        setupUI()
        setupSDK()
        loadAd()
    }

    private func setupUI() {
        view.addSubview(titleLabel)
        view.addSubview(statusLabel)
        view.addSubview(loadButton)
        view.addSubview(bannerContainer)

        loadButton.addTarget(self, action: #selector(loadButtonTapped), for: .touchUpInside)

        NSLayoutConstraint.activate([
            titleLabel.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor, constant: 20),
            titleLabel.leadingAnchor.constraint(equalTo: view.leadingAnchor, constant: 20),

            statusLabel.topAnchor.constraint(equalTo: titleLabel.bottomAnchor, constant: 12),
            statusLabel.leadingAnchor.constraint(equalTo: view.leadingAnchor, constant: 20),

            loadButton.topAnchor.constraint(equalTo: statusLabel.bottomAnchor, constant: 20),
            loadButton.leadingAnchor.constraint(equalTo: view.leadingAnchor, constant: 20),

            bannerContainer.topAnchor.constraint(equalTo: loadButton.bottomAnchor, constant: 30),
            bannerContainer.leadingAnchor.constraint(equalTo: view.leadingAnchor, constant: 20),
            bannerContainer.trailingAnchor.constraint(equalTo: view.trailingAnchor, constant: -20),
            bannerContainer.heightAnchor.constraint(equalToConstant: 70),
        ])

        // Create banner view
        bannerView = BannerView()
        bannerView.translatesAutoresizingMaskIntoConstraints = false
        bannerView.backgroundColor = UIColor(white: 0.9, alpha: 1)
        bannerContainer.addSubview(bannerView)

        NSLayoutConstraint.activate([
            bannerView.centerXAnchor.constraint(equalTo: bannerContainer.centerXAnchor),
            bannerView.centerYAnchor.constraint(equalTo: bannerContainer.centerYAnchor),
            bannerView.widthAnchor.constraint(equalToConstant: 320),
            bannerView.heightAnchor.constraint(equalToConstant: 50),
        ])
    }

    private func setupSDK() {
        // Initialize SDK - change this to your server URL
        // For simulator, use localhost; for device, use your Mac's IP
        MIMSAds.shared.initialize(serverUrl: "http://localhost:8080")

        // Configure banner
        bannerView.slotId = "ios_banner_1"
        bannerView.adSize = .banner
        bannerView.targeting = [
            "section": "home",
            "country": "sg"
        ]
        bannerView.delegate = self
    }

    @objc private func loadButtonTapped() {
        loadAd()
    }

    private func loadAd() {
        statusLabel.text = "Loading ad..."
        bannerView.loadAd()
    }
}

// MARK: - AdDelegate

extension ViewController: AdDelegate {
    func adDidLoad(_ bannerView: BannerView) {
        print("Ad loaded successfully")
        statusLabel.text = "Ad loaded"
    }

    func adDidFailToLoad(_ bannerView: BannerView, error: Error) {
        print("Ad failed to load: \(error.localizedDescription)")
        statusLabel.text = "Failed: \(error.localizedDescription)"
    }

    func adDidClick(_ bannerView: BannerView) {
        print("Ad clicked")
        statusLabel.text = "Ad clicked"
    }
}
