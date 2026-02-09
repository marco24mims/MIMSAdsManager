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

  function getWebIntegrationCode(unit: AdUnit) {
    const size = unit.sizes?.[0] || [728, 90];
    return `<!-- MIMS Ad Manager - ${unit.name} -->
<div id="${unit.code}"></div>
<script src="YOUR_SERVER_URL/static/tag.js"></script>
<script>
  MIMSAds.init({ serverUrl: 'YOUR_SERVER_URL' });
  MIMSAds.defineSlot('${unit.code}', {
    width: ${size[0]},
    height: ${size[1]},
    adUnit: '${unit.code}'
  });
  MIMSAds.setTargeting('section', 'YOUR_SECTION');
  MIMSAds.setTargeting('country', 'YOUR_COUNTRY');
  MIMSAds.display();
</script>`;
  }

  function getAndroidIntegrationCode(unit: AdUnit) {
    const size = unit.sizes?.[0] || [320, 50];
    return `// Add to your build.gradle (app level)
// implementation 'com.mims:ads-sdk:1.0.0'

// In your Activity or Fragment
import com.mims.ads.MIMSAds
import com.mims.ads.BannerView

class MainActivity : AppCompatActivity() {
    private lateinit var bannerView: BannerView

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // Initialize SDK
        MIMSAds.init(this, "YOUR_SERVER_URL")

        // Create banner view
        bannerView = BannerView(this).apply {
            adUnitCode = "${unit.code}"
            adSize = AdSize(${size[0]}, ${size[1]})
        }

        // Set targeting
        MIMSAds.setTargeting("section", "YOUR_SECTION")
        MIMSAds.setTargeting("country", "YOUR_COUNTRY")

        // Add to layout and load
        findViewById<ViewGroup>(R.id.ad_container).addView(bannerView)
        bannerView.loadAd()
    }
}

<!-- In your layout XML -->
<FrameLayout
    android:id="@+id/ad_container"
    android:layout_width="${size[0]}dp"
    android:layout_height="${size[1]}dp" />`;
  }

  function getIOSIntegrationCode(unit: AdUnit) {
    const size = unit.sizes?.[0] || [320, 50];
    return `// Add to your Podfile
// pod 'MIMSAds', '~> 1.0'

// In your ViewController
import MIMSAds

class ViewController: UIViewController {
    var bannerView: MIMSBannerView!

    override func viewDidLoad() {
        super.viewDidLoad()

        // Initialize SDK
        MIMSAds.shared.initialize(serverURL: "YOUR_SERVER_URL")

        // Create banner view
        bannerView = MIMSBannerView(frame: CGRect(
            x: 0, y: 0,
            width: ${size[0]}, height: ${size[1]}
        ))
        bannerView.adUnitCode = "${unit.code}"

        // Set targeting
        MIMSAds.shared.setTargeting(key: "section", value: "YOUR_SECTION")
        MIMSAds.shared.setTargeting(key: "country", value: "YOUR_COUNTRY")

        // Add to view and load
        view.addSubview(bannerView)
        bannerView.loadAd()
    }
}

// SwiftUI
struct ContentView: View {
    var body: some View {
        VStack {
            MIMSBannerViewRepresentable(
                adUnitCode: "${unit.code}",
                size: CGSize(width: ${size[0]}, height: ${size[1]})
            )
            .frame(width: ${size[0]}, height: ${size[1]})
        }
    }
}`;
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
    // Could add a toast notification here
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
      {showIntegrationModal && selectedUnit && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-medium mb-4">
              Integration Code - {selectedUnit.name}
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              Copy the code below to integrate this ad unit into your {selectedUnit.platform === 'mobile' ? 'mobile app' : 'website'}.
              Replace <code className="bg-gray-100 px-1 rounded">YOUR_SERVER_URL</code> with your actual server URL.
            </p>

            {(selectedUnit.platform === 'web' || selectedUnit.platform === 'both') && (
              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-gray-900">Web (JavaScript)</h4>
                  <button
                    onClick={() => copyToClipboard(getWebIntegrationCode(selectedUnit))}
                    className="text-sm text-blue-600 hover:text-blue-800"
                  >
                    Copy
                  </button>
                </div>
                <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg text-sm overflow-x-auto">
                  {getWebIntegrationCode(selectedUnit)}
                </pre>
              </div>
            )}

            {(selectedUnit.platform === 'mobile' || selectedUnit.platform === 'both') && (
              <>
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-gray-900">Android (Kotlin)</h4>
                    <button
                      onClick={() => copyToClipboard(getAndroidIntegrationCode(selectedUnit))}
                      className="text-sm text-blue-600 hover:text-blue-800"
                    >
                      Copy
                    </button>
                  </div>
                  <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg text-sm overflow-x-auto">
                    {getAndroidIntegrationCode(selectedUnit)}
                  </pre>
                </div>

                <div className="mb-6">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-gray-900">iOS (Swift)</h4>
                    <button
                      onClick={() => copyToClipboard(getIOSIntegrationCode(selectedUnit))}
                      className="text-sm text-blue-600 hover:text-blue-800"
                    >
                      Copy
                    </button>
                  </div>
                  <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg text-sm overflow-x-auto">
                    {getIOSIntegrationCode(selectedUnit)}
                  </pre>
                </div>
              </>
            )}

            <div className="flex justify-end">
              <button
                onClick={() => setShowIntegrationModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 border border-gray-300 rounded-md"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
