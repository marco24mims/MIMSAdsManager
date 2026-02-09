// swift-tools-version:5.7
import PackageDescription

let package = Package(
    name: "MIMSAds",
    platforms: [
        .iOS(.v13)
    ],
    products: [
        .library(
            name: "MIMSAds",
            targets: ["MIMSAds"]
        ),
    ],
    targets: [
        .target(
            name: "MIMSAds",
            dependencies: [],
            path: "Sources/MIMSAds"
        ),
    ]
)
