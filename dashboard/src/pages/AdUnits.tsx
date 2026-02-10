import { useState, useEffect } from 'react';
import {
  getAdUnits,
  createAdUnit,
  updateAdUnit,
  deleteAdUnit,
  type AdUnit,
} from '../api';

export default function AdUnits() {
  const [adUnits, setAdUnits] = useState<AdUnit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingUnit, setEditingUnit] = useState<AdUnit | null>(null);
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    description: '',
    platform: 'web',
    sizes: '[[728, 90], [300, 250]]',
  });

  // Integration code modal
  const [showIntegrationModal, setShowIntegrationModal] = useState(false);
  const [selectedUnit, setSelectedUnit] = useState<AdUnit | null>(null);
  const [integrationTab, setIntegrationTab] = useState<'web' | 'android' | 'ios'>('web');
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [selectedSizeIndex, setSelectedSizeIndex] = useState(0);

  useEffect(() => {
    loadAdUnits();
  }, []);

  async function loadAdUnits() {
    try {
      setLoading(true);
      const data = await getAdUnits();
      setAdUnits(data || []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load ad units');
    } finally {
      setLoading(false);
    }
  }

  function openCreateModal() {
    setEditingUnit(null);
    setFormData({
      code: '',
      name: '',
      description: '',
      platform: 'web',
      sizes: '[[728, 90], [300, 250]]',
    });
    setShowModal(true);
  }

  function openEditModal(unit: AdUnit) {
    setEditingUnit(unit);
    setFormData({
      code: unit.code,
      name: unit.name,
      description: unit.description || '',
      platform: unit.platform || 'web',
      sizes: JSON.stringify(unit.sizes || []),
    });
    setShowModal(true);
  }

  function openIntegrationModal(unit: AdUnit) {
    setSelectedUnit(unit);
    setSelectedSizeIndex(0);
    setIntegrationTab(
      unit.platform === 'mobile' ? 'android' : 'web'
    );
    setShowIntegrationModal(true);
  }

  async function handleSubmit() {
    if (!formData.code.trim() || !formData.name.trim()) {
      setError('Code and name are required');
      return;
    }

    let sizes: number[][];
    try {
      sizes = JSON.parse(formData.sizes);
      if (!Array.isArray(sizes)) throw new Error('Invalid');
    } catch {
      setError('Sizes must be valid JSON array (e.g., [[728, 90], [300, 250]])');
      return;
    }

    try {
      if (editingUnit) {
        await updateAdUnit(editingUnit.id, {
          code: formData.code.trim(),
          name: formData.name.trim(),
          description: formData.description.trim(),
          platform: formData.platform,
          sizes,
        });
      } else {
        await createAdUnit({
          code: formData.code.trim(),
          name: formData.name.trim(),
          description: formData.description.trim(),
          platform: formData.platform,
          sizes,
        });
      }
      setShowModal(false);
      loadAdUnits();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save ad unit');
    }
  }

  async function handleDelete(id: number) {
    if (!confirm('Are you sure you want to delete this ad unit?')) return;

    try {
      await deleteAdUnit(id);
      loadAdUnits();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete ad unit');
    }
  }

  async function handleToggleStatus(unit: AdUnit) {
    try {
      const newStatus = unit.status === 'active' ? 'paused' : 'active';
      await updateAdUnit(unit.id, { status: newStatus });
      loadAdUnits();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update status');
    }
  }

  function getServerUrl() {
    const apiUrl = import.meta.env.VITE_API_URL;
    if (apiUrl) return apiUrl;
    return window.location.origin;
  }

  function getWebIntegrationCode(unit: AdUnit, sizeIndex: number) {
    const size = unit.sizes?.[sizeIndex] || unit.sizes?.[0] || [728, 90];
    const serverUrl = getServerUrl();
    return `<!-- MIMS Ad Manager - ${unit.name} -->
<!-- Step 1: Add a container div where the ad will render -->
<div id="${unit.code}"></div>

<!-- Step 2: Load the MIMS Ad tag script -->
<script src="${serverUrl}/static/tag.js"></script>

<!-- Step 3: Initialize and request the ad -->
<script>
  MIMSAds.init({ serverUrl: '${serverUrl}' });

  MIMSAds.defineSlot('${unit.code}', {
    width: ${size[0]},
    height: ${size[1]},
    adUnit: '${unit.code}'
  });

  // Optional: Set targeting key-values for this page
  MIMSAds.setTargeting('section', 'news');

  MIMSAds.display();
</script>`;
  }

  function getWebResponsiveCode(unit: AdUnit) {
    const serverUrl = getServerUrl();
    return `<!-- MIMS Ad Manager - ${unit.name} (Responsive) -->
<!-- The ad slot will auto-detect the container width -->
<!-- and the server will pick the best-fitting creative size. -->
<div id="${unit.code}" style="width: 100%;"></div>

<script src="${serverUrl}/static/tag.js"></script>
<script>
  MIMSAds.init({ serverUrl: '${serverUrl}' });

  // No width/height needed - the tag measures the container
  MIMSAds.defineSlot('${unit.code}', {
    adUnit: '${unit.code}'
  });

  // Optional: Set targeting key-values for this page
  MIMSAds.setTargeting('section', 'news');

  MIMSAds.display();
</script>`;
  }

  function getWebMultiSlotCode(unit: AdUnit) {
    const serverUrl = getServerUrl();
    const slots = (unit.sizes || [[728, 90]]).map((size, i) => {
      const slotId = i === 0 ? unit.code : `${unit.code}_${i + 1}`;
      return { slotId, width: size[0], height: size[1] };
    });

    const divs = slots.map(s => `<div id="${s.slotId}"></div>`).join('\n');
    const defines = slots.map(s =>
      `  MIMSAds.defineSlot('${s.slotId}', {\n    width: ${s.width},\n    height: ${s.height},\n    adUnit: '${unit.code}'\n  });`
    ).join('\n\n');

    return `<!-- MIMS Ad Manager - ${unit.name} (All Sizes) -->
${divs}

<script src="${serverUrl}/static/tag.js"></script>
<script>
  MIMSAds.init({ serverUrl: '${serverUrl}' });

${defines}

  // Optional: Set targeting key-values for this page
  MIMSAds.setTargeting('section', 'news');

  MIMSAds.display();
</script>`;
  }

  function getAndroidIntegrationCode(unit: AdUnit, sizeIndex: number) {
    const size = unit.sizes?.[sizeIndex] || unit.sizes?.[0] || [320, 50];
    const serverUrl = getServerUrl();
    return `// ----- Android Integration (WebView) -----
// Use a WebView to load the MIMS ad tag in your Android app.

// 1. Add internet permission to AndroidManifest.xml:
// <uses-permission android:name="android.permission.INTERNET" />

// 2. Add a WebView to your layout (res/layout/activity_main.xml):
// <WebView
//     android:id="@+id/ad_webview"
//     android:layout_width="${size[0]}dp"
//     android:layout_height="${size[1]}dp" />

// 3. Load the ad in your Activity:
import android.os.Bundle
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.appcompat.app.AppCompatActivity

class MainActivity : AppCompatActivity() {
    private lateinit var adWebView: WebView

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        adWebView = findViewById(R.id.ad_webview)
        adWebView.webViewClient = WebViewClient()
        adWebView.settings.javaScriptEnabled = true
        adWebView.settings.domStorageEnabled = true

        val adHtml = """
            <!DOCTYPE html>
            <html>
            <head>
              <meta name="viewport"
                content="width=device-width, initial-scale=1.0">
              <style>
                body { margin: 0; padding: 0; }
              </style>
            </head>
            <body>
              <div id="${unit.code}"></div>
              <script src="${serverUrl}/static/tag.js"></script>
              <script>
                MIMSAds.init({
                  serverUrl: '${serverUrl}',
                  platform: 'android'
                });
                MIMSAds.defineSlot('${unit.code}', {
                  width: ${size[0]},
                  height: ${size[1]},
                  adUnit: '${unit.code}'
                });
                MIMSAds.setTargeting('section', 'news');
                MIMSAds.display();
              </script>
            </body>
            </html>
        """.trimIndent()

        adWebView.loadDataWithBaseURL(
            "${serverUrl}",
            adHtml,
            "text/html",
            "UTF-8",
            null
        )
    }

    override fun onDestroy() {
        adWebView.destroy()
        super.onDestroy()
    }
}`;
  }

  function getIOSIntegrationCode(unit: AdUnit, sizeIndex: number) {
    const size = unit.sizes?.[sizeIndex] || unit.sizes?.[0] || [320, 50];
    const serverUrl = getServerUrl();
    return `// ----- iOS Integration (WKWebView) -----
// Use a WKWebView to load the MIMS ad tag in your iOS app.

import UIKit
import WebKit

class AdBannerViewController: UIViewController, WKNavigationDelegate {
    private var webView: WKWebView!

    override func viewDidLoad() {
        super.viewDidLoad()

        // 1. Create and configure WKWebView
        let config = WKWebViewConfiguration()
        config.allowsInlineMediaPlayback = true

        webView = WKWebView(
            frame: CGRect(x: 0, y: 0,
                          width: ${size[0]}, height: ${size[1]}),
            configuration: config
        )
        webView.navigationDelegate = self
        webView.scrollView.isScrollEnabled = false
        view.addSubview(webView)

        // 2. Load the ad HTML
        let adHTML = """
        <!DOCTYPE html>
        <html>
        <head>
          <meta name="viewport"
            content="width=device-width, initial-scale=1.0">
          <style>body { margin: 0; padding: 0; }</style>
        </head>
        <body>
          <div id="${unit.code}"></div>
          <script src="${serverUrl}/static/tag.js"></script>
          <script>
            MIMSAds.init({
              serverUrl: '${serverUrl}',
              platform: 'ios'
            });
            MIMSAds.defineSlot('${unit.code}', {
              width: ${size[0]},
              height: ${size[1]},
              adUnit: '${unit.code}'
            });
            MIMSAds.setTargeting('section', 'news');
            MIMSAds.display();
          </script>
        </body>
        </html>
        """

        webView.loadHTMLString(
            adHTML,
            baseURL: URL(string: "${serverUrl}")
        )
    }

    // 3. Handle ad clicks - open in Safari
    func webView(_ webView: WKWebView,
                 decidePolicyFor navigationAction: WKNavigationAction,
                 decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
        if navigationAction.navigationType == .linkActivated,
           let url = navigationAction.request.url {
            UIApplication.shared.open(url)
            decisionHandler(.cancel)
            return
        }
        decisionHandler(.allow)
    }
}

// ----- SwiftUI Wrapper -----
import SwiftUI

struct AdBannerView: UIViewControllerRepresentable {
    func makeUIViewController(context: Context)
        -> AdBannerViewController {
        return AdBannerViewController()
    }

    func updateUIViewController(
        _ uiViewController: AdBannerViewController,
        context: Context) {}
}

// Usage in SwiftUI:
// struct ContentView: View {
//     var body: some View {
//         VStack {
//             AdBannerView()
//                 .frame(width: ${size[0]}, height: ${size[1]})
//             Spacer()
//         }
//     }
// }`;
  }

  function copyToClipboard(text: string, field: string) {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  return (
    <div>
      <div className="sm:flex sm:items-center sm:justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Ad Units</h2>
          <p className="mt-1 text-sm text-gray-500">
            Manage your ad inventory slots. Ad units define where ads can be displayed.
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className="mt-3 sm:mt-0 inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
        >
          Create Ad Unit
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
          {error}
          <button onClick={() => setError(null)} className="float-right font-bold">&times;</button>
        </div>
      )}

      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        {adUnits.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            No ad units yet. Create one to get started.
          </div>
        ) : (
          <ul className="divide-y divide-gray-200">
            {adUnits.map((unit) => (
              <li key={unit.id} className="px-4 py-4 sm:px-6 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <span className="text-lg font-medium text-gray-900">{unit.name}</span>
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          unit.status === 'active'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {unit.status}
                      </span>
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          unit.platform === 'mobile'
                            ? 'bg-purple-100 text-purple-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}
                      >
                        {unit.platform || 'web'}
                      </span>
                    </div>
                    <div className="mt-1 text-sm text-gray-500">
                      <span className="font-mono bg-gray-100 px-1 rounded">{unit.code}</span>
                    </div>
                    {unit.description && (
                      <div className="mt-1 text-sm text-gray-500">{unit.description}</div>
                    )}
                    <div className="mt-2 text-sm text-gray-500">
                      Sizes: {(unit.sizes || []).map((s) => `${s[0]}x${s[1]}`).join(', ') || 'None'}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => openIntegrationModal(unit)}
                      className="px-3 py-1 text-sm rounded bg-gray-100 text-gray-700 hover:bg-gray-200"
                    >
                      Get Code
                    </button>
                    <button
                      onClick={() => handleToggleStatus(unit)}
                      className={`px-3 py-1 text-sm rounded ${
                        unit.status === 'active'
                          ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
                          : 'bg-green-100 text-green-800 hover:bg-green-200'
                      }`}
                    >
                      {unit.status === 'active' ? 'Pause' : 'Activate'}
                    </button>
                    <button
                      onClick={() => openEditModal(unit)}
                      className="text-blue-600 hover:text-blue-800 text-sm"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(unit.id)}
                      className="text-red-600 hover:text-red-800 text-sm"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-medium mb-4">
              {editingUnit ? 'Edit Ad Unit' : 'Create Ad Unit'}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Platform</label>
                <select
                  value={formData.platform}
                  onChange={(e) => setFormData({ ...formData, platform: e.target.value })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                >
                  <option value="web">Web</option>
                  <option value="mobile">Mobile (Android/iOS)</option>
                  <option value="both">Both</option>
                </select>
                <p className="mt-1 text-xs text-gray-500">
                  Platform determines the integration code shown
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Code</label>
                <input
                  type="text"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  placeholder="e.g., homepage_leaderboard"
                  className="w-full border border-gray-300 rounded-md px-3 py-2 font-mono text-sm"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Unique identifier used in ad requests
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Homepage Leaderboard"
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Optional description"
                  rows={2}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Sizes (JSON)</label>
                <input
                  type="text"
                  value={formData.sizes}
                  onChange={(e) => setFormData({ ...formData, sizes: e.target.value })}
                  placeholder="[[728, 90], [300, 250]]"
                  className="w-full border border-gray-300 rounded-md px-3 py-2 font-mono text-sm"
                />
                <p className="mt-1 text-xs text-gray-500">
                  {formData.platform === 'mobile'
                    ? 'Common mobile sizes: [[320, 50], [320, 100], [300, 250]]'
                    : 'Common web sizes: [[728, 90], [300, 250], [160, 600]]'}
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 border border-gray-300 rounded-md"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md"
              >
                {editingUnit ? 'Save' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Integration Code Modal */}
      {showIntegrationModal && selectedUnit && (() => {
        const sizes = selectedUnit.sizes || [[728, 90]];
        const selectedSize = sizes[selectedSizeIndex] || sizes[0];
        const showWebTab = selectedUnit.platform === 'web' || selectedUnit.platform === 'both';
        const showMobileTabs = selectedUnit.platform === 'mobile' || selectedUnit.platform === 'both';
        const tabs = [
          ...(showWebTab ? [{ key: 'web' as const, label: 'Web (HTML/JS)' }] : []),
          ...(showMobileTabs ? [
            { key: 'android' as const, label: 'Android (Kotlin)' },
            { key: 'ios' as const, label: 'iOS (Swift)' },
          ] : []),
        ];

        return (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="px-6 pt-6 pb-4 border-b border-gray-200">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    Integration Guide - {selectedUnit.name}
                  </h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Ad Unit Code: <code className="bg-gray-100 px-1.5 py-0.5 rounded font-mono text-xs">{selectedUnit.code}</code>
                    {' | '}Sizes: {sizes.map(s => `${s[0]}x${s[1]}`).join(', ')}
                  </p>
                </div>
                <button
                  onClick={() => setShowIntegrationModal(false)}
                  className="text-gray-400 hover:text-gray-500 text-xl leading-none"
                >
                  &times;
                </button>
              </div>

              {/* Size Selector */}
              {sizes.length > 1 && (
                <div className="mt-3 flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-700">Size:</span>
                  {sizes.map((size, i) => (
                    <button
                      key={i}
                      onClick={() => setSelectedSizeIndex(i)}
                      className={`px-3 py-1 text-xs rounded-full font-medium ${
                        selectedSizeIndex === i
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {size[0]}x{size[1]}
                    </button>
                  ))}
                </div>
              )}

              {/* Platform Tabs */}
              <div className="mt-3 flex gap-1 border-b border-gray-200 -mb-4">
                {tabs.map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setIntegrationTab(tab.key)}
                    className={`px-4 py-2 text-sm font-medium rounded-t-md border-b-2 ${
                      integrationTab === tab.key
                        ? 'border-blue-600 text-blue-600 bg-blue-50'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-6 py-5">
              {/* Web Tab */}
              {integrationTab === 'web' && showWebTab && (
                <div>
                  <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <h4 className="font-medium text-blue-900 mb-2">How it works</h4>
                    <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
                      <li>Add a <code className="bg-blue-100 px-1 rounded">&lt;div&gt;</code> container where the ad banner will appear</li>
                      <li>Load the MIMS Ad tag script from your ad server</li>
                      <li>Initialize the SDK, define the ad slot with the size, and call <code className="bg-blue-100 px-1 rounded">display()</code></li>
                      <li>The script automatically handles ad loading, impression tracking, viewability, and click tracking</li>
                    </ol>
                  </div>

                  {/* Single size code */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-gray-900">
                        Integration Code ({selectedSize[0]}x{selectedSize[1]})
                      </h4>
                      <button
                        onClick={() => copyToClipboard(getWebIntegrationCode(selectedUnit, selectedSizeIndex), 'web-single')}
                        className={`px-3 py-1 text-sm rounded ${
                          copiedField === 'web-single'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {copiedField === 'web-single' ? 'Copied!' : 'Copy Code'}
                      </button>
                    </div>
                    <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg text-sm overflow-x-auto whitespace-pre">{getWebIntegrationCode(selectedUnit, selectedSizeIndex)}</pre>
                  </div>

                  {/* Multi-size code */}
                  {sizes.length > 1 && (
                    <div className="mb-4">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-gray-900">
                          All Sizes on One Page
                        </h4>
                        <button
                          onClick={() => copyToClipboard(getWebMultiSlotCode(selectedUnit), 'web-multi')}
                          className={`px-3 py-1 text-sm rounded ${
                            copiedField === 'web-multi'
                              ? 'bg-green-100 text-green-700'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          {copiedField === 'web-multi' ? 'Copied!' : 'Copy Code'}
                        </button>
                      </div>
                      <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg text-sm overflow-x-auto whitespace-pre">{getWebMultiSlotCode(selectedUnit)}</pre>
                    </div>
                  )}

                  {/* Responsive code */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-gray-900">
                        Responsive (Auto-Size)
                      </h4>
                      <button
                        onClick={() => copyToClipboard(getWebResponsiveCode(selectedUnit), 'web-responsive')}
                        className={`px-3 py-1 text-sm rounded ${
                          copiedField === 'web-responsive'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {copiedField === 'web-responsive' ? 'Copied!' : 'Copy Code'}
                      </button>
                    </div>
                    <p className="text-sm text-gray-500 mb-2">
                      No fixed dimensions -- the tag measures the container width and the server picks the best-fitting creative.
                    </p>
                    <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg text-sm overflow-x-auto whitespace-pre">{getWebResponsiveCode(selectedUnit)}</pre>
                  </div>

                  <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-600">
                    <strong>Targeting:</strong> Use <code className="bg-gray-200 px-1 rounded">MIMSAds.setTargeting(key, value)</code> to pass page-level
                    targeting (e.g., section, category, keywords). These values are matched against line item targeting rules to serve the right ad.
                    You can call <code className="bg-gray-200 px-1 rounded">MIMSAds.refresh()</code> to reload ads without a full page reload.
                  </div>
                </div>
              )}

              {/* Android Tab */}
              {integrationTab === 'android' && showMobileTabs && (
                <div>
                  <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                    <h4 className="font-medium text-green-900 mb-2">How it works</h4>
                    <ol className="text-sm text-green-800 space-y-1 list-decimal list-inside">
                      <li>Add a <code className="bg-green-100 px-1 rounded">WebView</code> to your layout with the ad banner dimensions</li>
                      <li>Load an HTML snippet that includes the MIMS Ad tag into the WebView</li>
                      <li>The ad tag handles rendering, tracking, and click-through automatically</li>
                      <li>Ad clicks open in the device browser via WebViewClient</li>
                    </ol>
                  </div>

                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-gray-900">
                        Android WebView Integration ({selectedSize[0]}x{selectedSize[1]})
                      </h4>
                      <button
                        onClick={() => copyToClipboard(getAndroidIntegrationCode(selectedUnit, selectedSizeIndex), 'android')}
                        className={`px-3 py-1 text-sm rounded ${
                          copiedField === 'android'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {copiedField === 'android' ? 'Copied!' : 'Copy Code'}
                      </button>
                    </div>
                    <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg text-sm overflow-x-auto whitespace-pre">{getAndroidIntegrationCode(selectedUnit, selectedSizeIndex)}</pre>
                  </div>

                  <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-600">
                    <strong>Note:</strong> The WebView approach uses the same JavaScript ad tag as web, ensuring consistent behavior and tracking.
                    Set <code className="bg-gray-200 px-1 rounded">platform: 'android'</code> in <code className="bg-gray-200 px-1 rounded">MIMSAds.init()</code> so
                    impressions are attributed to the correct platform in reports.
                  </div>
                </div>
              )}

              {/* iOS Tab */}
              {integrationTab === 'ios' && showMobileTabs && (
                <div>
                  <div className="mb-4 p-4 bg-purple-50 border border-purple-200 rounded-lg">
                    <h4 className="font-medium text-purple-900 mb-2">How it works</h4>
                    <ol className="text-sm text-purple-800 space-y-1 list-decimal list-inside">
                      <li>Create a <code className="bg-purple-100 px-1 rounded">WKWebView</code> sized to the ad banner dimensions</li>
                      <li>Load an HTML snippet containing the MIMS Ad tag into the web view</li>
                      <li>The ad tag handles rendering, impression and viewability tracking automatically</li>
                      <li>Ad clicks are intercepted by the navigation delegate and opened in Safari</li>
                    </ol>
                  </div>

                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-gray-900">
                        iOS WKWebView Integration ({selectedSize[0]}x{selectedSize[1]})
                      </h4>
                      <button
                        onClick={() => copyToClipboard(getIOSIntegrationCode(selectedUnit, selectedSizeIndex), 'ios')}
                        className={`px-3 py-1 text-sm rounded ${
                          copiedField === 'ios'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {copiedField === 'ios' ? 'Copied!' : 'Copy Code'}
                      </button>
                    </div>
                    <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg text-sm overflow-x-auto whitespace-pre">{getIOSIntegrationCode(selectedUnit, selectedSizeIndex)}</pre>
                  </div>

                  <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-600">
                    <strong>Note:</strong> Set <code className="bg-gray-200 px-1 rounded">platform: 'ios'</code> in <code className="bg-gray-200 px-1 rounded">MIMSAds.init()</code> so
                    impressions are attributed correctly. The <code className="bg-gray-200 px-1 rounded">WKNavigationDelegate</code> ensures ad clicks
                    open in Safari rather than within the web view. A SwiftUI wrapper is included for use in SwiftUI-based apps.
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end">
              <button
                onClick={() => setShowIntegrationModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 border border-gray-300 rounded-md"
              >
                Close
              </button>
            </div>
          </div>
        </div>
        );
      })()}
    </div>
  );
}
