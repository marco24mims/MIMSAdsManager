import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  getLineItem,
  updateLineItem,
  getTargetingRules,
  setTargetingRules,
  getCreatives,
  createCreative,
  updateCreative,
  deleteCreative,
  uploadImage,
  getAdUnits,
  getLineItemAdUnits,
  setLineItemAdUnits,
  getTargetingKeys,
  type LineItem,
  type TargetingRule,
  type Creative,
  type AdUnit,
  type TargetingKey,
} from '../api';

export default function LineItemDetail() {
  const { id } = useParams<{ id: string }>();
  const [lineItem, setLineItem] = useState<LineItem | null>(null);
  const [targetingRules, setTargetingRulesState] = useState<TargetingRule[]>([]);
  const [creatives, setCreatives] = useState<Creative[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [adUnits, setAdUnits] = useState<AdUnit[]>([]);
  const [selectedAdUnitIds, setSelectedAdUnitIds] = useState<number[]>([]);

  // Settings modal
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [editingSettings, setEditingSettings] = useState({
    priority: 5,
    weight: 100,
    sov_percentage: 0,
    frequency_cap: 0,
    frequency_cap_period: 'day'
  });

  // Targeting modal
  const [showTargetingModal, setShowTargetingModal] = useState(false);
  const [editingRules, setEditingRules] = useState<{ key: string; operator: string; values: string }[]>([]);

  // Creative modal
  const [showCreativeModal, setShowCreativeModal] = useState(false);
  const [editingCreative, setEditingCreative] = useState<Creative | null>(null);
  const [imageSource, setImageSource] = useState<'url' | 'upload'>('url');
  const [uploading, setUploading] = useState(false);
  const [uploadPreview, setUploadPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [newCreative, setNewCreative] = useState({
    name: '',
    width: 728,
    height: 90,
    image_url: '',
    click_url: '',
  });

  // Targeting keys for auto-suggest
  const [targetingKeys, setTargetingKeys] = useState<TargetingKey[]>([]);

  useEffect(() => {
    if (id) {
      loadData();
    }
  }, [id]);

  async function loadData() {
    try {
      setLoading(true);
      const [lineItemData, rulesData, creativesData, adUnitsData, lineItemAdUnits, targetingKeysData] = await Promise.all([
        getLineItem(Number(id)),
        getTargetingRules(Number(id)),
        getCreatives(Number(id)),
        getAdUnits(),
        getLineItemAdUnits(Number(id)),
        getTargetingKeys(),
      ]);
      setLineItem(lineItemData);
      setTargetingRulesState(rulesData);
      setCreatives(creativesData);
      setAdUnits(adUnitsData || []);
      setSelectedAdUnitIds(lineItemAdUnits?.ad_unit_ids || []);
      setTargetingKeys(targetingKeysData || []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load line item');
    } finally {
      setLoading(false);
    }
  }

  async function handleToggleStatus() {
    if (!lineItem) return;
    try {
      const newStatus = lineItem.status === 'active' ? 'paused' : 'active';
      const updated = await updateLineItem(lineItem.id, { status: newStatus });
      setLineItem(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update line item');
    }
  }

  function openSettingsModal() {
    if (!lineItem) return;
    setEditingSettings({
      priority: lineItem.priority,
      weight: lineItem.weight || 100,
      sov_percentage: lineItem.sov_percentage || 0,
      frequency_cap: lineItem.frequency_cap || 0,
      frequency_cap_period: lineItem.frequency_cap_period || 'day'
    });
    setShowSettingsModal(true);
  }

  async function handleSaveSettings() {
    if (!lineItem) return;
    try {
      const updated = await updateLineItem(lineItem.id, {
        priority: editingSettings.priority,
        weight: editingSettings.weight,
        sov_percentage: editingSettings.sov_percentage,
        frequency_cap: editingSettings.frequency_cap,
        frequency_cap_period: editingSettings.frequency_cap_period,
      });
      setLineItem(updated);
      setShowSettingsModal(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update settings');
    }
  }

  async function handleAdUnitToggle(adUnitId: number) {
    const newIds = selectedAdUnitIds.includes(adUnitId)
      ? selectedAdUnitIds.filter((id) => id !== adUnitId)
      : [...selectedAdUnitIds, adUnitId];

    try {
      await setLineItemAdUnits(Number(id), newIds);
      setSelectedAdUnitIds(newIds);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update ad units');
    }
  }

  function openTargetingModal() {
    setEditingRules(
      targetingRules.length > 0
        ? targetingRules.map((r) => ({ key: r.key, operator: r.operator, values: r.values.join(', ') }))
        : [{ key: '', operator: 'IN', values: '' }]
    );
    setShowTargetingModal(true);
  }

  async function handleSaveTargeting() {
    try {
      const rules = editingRules
        .filter((r) => r.key.trim() && r.values.trim())
        .map((r) => ({
          key: r.key.trim(),
          operator: r.operator,
          values: r.values.split(',').map((v) => v.trim()).filter(Boolean),
        }));

      const updated = await setTargetingRules(Number(id), rules);
      setTargetingRulesState(updated);
      setShowTargetingModal(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save targeting rules');
    }
  }

  function addRule() {
    setEditingRules([...editingRules, { key: '', operator: 'IN', values: '' }]);
  }

  function removeRule(index: number) {
    setEditingRules(editingRules.filter((_, i) => i !== index));
  }

  function updateRule(index: number, field: string, value: string) {
    const updated = [...editingRules];
    updated[index] = { ...updated[index], [field]: value };
    setEditingRules(updated);
  }

  function openCreativeModal(creative?: Creative) {
    if (creative) {
      setEditingCreative(creative);
      setNewCreative({
        name: creative.name,
        width: creative.width,
        height: creative.height,
        image_url: creative.image_url,
        click_url: creative.click_url,
      });
    } else {
      setEditingCreative(null);
      setNewCreative({ name: '', width: 728, height: 90, image_url: '', click_url: '' });
    }
    setImageSource('url');
    setUploadPreview(null);
    setShowCreativeModal(true);
  }

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setError('Invalid file type. Allowed: jpg, png, gif, webp');
      return;
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('File too large. Maximum size is 5MB');
      return;
    }

    // Show preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setUploadPreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);

    // Upload file
    try {
      setUploading(true);
      setError(null);
      const result = await uploadImage(file);
      setNewCreative({ ...newCreative, image_url: result.image_url });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload image');
      setUploadPreview(null);
    } finally {
      setUploading(false);
    }
  }

  async function handleSaveCreative() {
    if (!newCreative.name.trim() || !newCreative.image_url.trim() || !newCreative.click_url.trim()) return;

    try {
      if (editingCreative) {
        await updateCreative(editingCreative.id, {
          name: newCreative.name,
          width: newCreative.width,
          height: newCreative.height,
          image_url: newCreative.image_url,
          click_url: newCreative.click_url,
        });
      } else {
        await createCreative({
          line_item_id: Number(id),
          ...newCreative,
        });
      }
      setNewCreative({ name: '', width: 728, height: 90, image_url: '', click_url: '' });
      setEditingCreative(null);
      setUploadPreview(null);
      setShowCreativeModal(false);
      loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save creative');
    }
  }

  async function handleDeleteCreative(creativeId: number) {
    if (!confirm('Are you sure you want to delete this creative?')) return;

    try {
      await deleteCreative(creativeId);
      loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete creative');
    }
  }

  // Check which ad unit sizes match the line item's creatives
  function getAdUnitSizeMatch(unit: AdUnit): { size: number[]; matched: boolean }[] {
    if (!unit.sizes || unit.sizes.length === 0) return [];
    return unit.sizes.map((size) => {
      const matched = creatives.some(
        (c) => c.width === size[0] && c.height === size[1]
      );
      return { size, matched };
    });
  }

  function isAdUnitDisabled(unit: AdUnit): boolean {
    // If no creatives yet, allow all (user may add creatives later)
    if (creatives.length === 0) return false;
    const matches = getAdUnitSizeMatch(unit);
    return matches.length > 0 && !matches.some((m) => m.matched);
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  if (!lineItem) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-500">Line item not found</div>
        <Link to="/" className="text-blue-600 hover:text-blue-800 mt-2 inline-block">
          Back to Campaigns
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <Link to={`/campaigns/${lineItem.campaign_id}`} className="text-blue-600 hover:text-blue-800 text-sm">
          &larr; Back to Campaign
        </Link>
      </div>

      <div className="bg-white shadow rounded-lg p-6 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{lineItem.name}</h2>
            <div className="mt-2 flex items-center gap-4 flex-wrap">
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  lineItem.status === 'active'
                    ? 'bg-green-100 text-green-800'
                    : 'bg-gray-100 text-gray-800'
                }`}
              >
                {lineItem.status}
              </span>
              <span className="text-sm text-gray-500">Priority: {lineItem.priority}</span>
              <span className="text-sm text-gray-500">Weight: {lineItem.weight || 100}</span>
              <span className="text-sm text-gray-500">
                SOV: {lineItem.sov_percentage > 0 ? `${lineItem.sov_percentage}%` : 'None'}
              </span>
              <span className="text-sm text-gray-500">
                Freq Cap: {lineItem.frequency_cap || 'None'}
                {lineItem.frequency_cap > 0 && `/${lineItem.frequency_cap_period}`}
              </span>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={openSettingsModal}
              className="px-4 py-2 rounded-md text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200"
            >
              Settings
            </button>
            <button
              onClick={handleToggleStatus}
              className={`px-4 py-2 rounded-md text-sm font-medium ${
                lineItem.status === 'active'
                  ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
                  : 'bg-green-100 text-green-800 hover:bg-green-200'
              }`}
            >
              {lineItem.status === 'active' ? 'Pause' : 'Activate'}
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
          {error}
          <button onClick={() => setError(null)} className="float-right font-bold">&times;</button>
        </div>
      )}

      {/* Targeting Rules Section */}
      <div className="bg-white shadow rounded-lg p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">Targeting Rules</h3>
          <button
            onClick={openTargetingModal}
            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
          >
            Edit Targeting
          </button>
        </div>
        {targetingRules.length === 0 ? (
          <div className="text-gray-500 text-sm">No targeting rules. This line item will match all requests.</div>
        ) : (
          <div className="space-y-2">
            {targetingRules.map((rule) => (
              <div key={rule.id} className="flex items-center gap-2 text-sm">
                <span className="font-medium text-gray-700">{rule.key}</span>
                <span className="text-gray-500">{rule.operator}</span>
                <span className="bg-gray-100 px-2 py-1 rounded">{rule.values.join(', ')}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Ad Units Section */}
      <div className="bg-white shadow rounded-lg p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">Ad Unit Targeting</h3>
        </div>
        {adUnits.length === 0 ? (
          <div className="text-gray-500 text-sm">No ad units available.</div>
        ) : (
          <div className="space-y-2">
            <p className="text-sm text-gray-500 mb-3">
              Select which ad units this line item can serve to. If none selected, it can serve to all ad units.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {adUnits.map((unit) => {
                const disabled = isAdUnitDisabled(unit);
                const sizeMatches = getAdUnitSizeMatch(unit);
                return (
                  <label
                    key={unit.id}
                    className={`flex items-start p-3 rounded-lg border transition-colors ${
                      disabled
                        ? 'border-gray-200 bg-gray-50 cursor-not-allowed opacity-70'
                        : selectedAdUnitIds.includes(unit.id)
                          ? 'border-blue-500 bg-blue-50 cursor-pointer'
                          : 'border-gray-200 hover:border-gray-300 cursor-pointer'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedAdUnitIds.includes(unit.id)}
                      onChange={() => handleAdUnitToggle(unit.id)}
                      disabled={disabled}
                      className="h-4 w-4 text-blue-600 rounded mt-0.5"
                    />
                    <div className="ml-3">
                      <div className="text-sm font-medium text-gray-900">{unit.name}</div>
                      <div className="text-xs text-gray-500">{unit.code}</div>
                      {sizeMatches.length > 0 && creatives.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {sizeMatches.map(({ size, matched }) => (
                            <span
                              key={`${size[0]}x${size[1]}`}
                              className={`inline-flex items-center text-xs px-1.5 py-0.5 rounded ${
                                matched
                                  ? 'bg-green-100 text-green-700'
                                  : 'bg-red-100 text-red-700'
                              }`}
                            >
                              {matched ? '\u2713' : '\u2717'} {size[0]}x{size[1]}
                            </span>
                          ))}
                        </div>
                      )}
                      {disabled && (
                        <div className="text-xs text-red-600 mt-1">
                          No creatives match this ad unit's sizes
                        </div>
                      )}
                    </div>
                  </label>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Creatives Section */}
      <div className="sm:flex sm:items-center sm:justify-between mb-4">
        <h3 className="text-lg font-medium text-gray-900">Creatives</h3>
        <button
          onClick={() => openCreativeModal()}
          className="mt-3 sm:mt-0 inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
        >
          Add Creative
        </button>
      </div>

      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        {creatives.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            No creatives yet. Add a creative to start serving ads.
          </div>
        ) : (
          <ul className="divide-y divide-gray-200">
            {creatives.map((creative) => (
              <li key={creative.id} className="px-4 py-4 sm:px-6">
                <div className="flex items-start gap-4">
                  <img
                    src={creative.image_url}
                    alt={creative.name}
                    className="w-32 h-auto border border-gray-200 rounded"
                  />
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">{creative.name}</div>
                    <div className="mt-1 text-sm text-gray-500">
                      Size: {creative.width}x{creative.height}
                    </div>
                    <div className="mt-1 text-sm text-gray-500 truncate">
                      Click URL: {creative.click_url}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => openCreativeModal(creative)}
                      className="text-blue-600 hover:text-blue-800 text-sm"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteCreative(creative.id)}
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

      {/* Targeting Modal */}
      {showTargetingModal && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto">
            <h3 className="text-lg font-medium mb-4">Edit Targeting Rules</h3>
            <p className="text-sm text-gray-500 mb-4">
              Add key-value targeting rules. Known keys and values will be suggested as you type.
            </p>
            <div className="space-y-4">
              {editingRules.map((rule, index) => {
                const keyData = targetingKeys.find(k => k.key === rule.key);
                const suggestedValues = keyData?.values || [];
                return (
                <div key={index} className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="flex-1">
                      <input
                        type="text"
                        list={`keys-${index}`}
                        value={rule.key}
                        onChange={(e) => updateRule(index, 'key', e.target.value)}
                        placeholder="Key (e.g., country)"
                        className="w-full border border-gray-300 rounded-md px-3 py-2"
                      />
                      <datalist id={`keys-${index}`}>
                        {targetingKeys.map(k => (
                          <option key={k.key} value={k.key} />
                        ))}
                      </datalist>
                    </div>
                    <select
                      value={rule.operator}
                      onChange={(e) => updateRule(index, 'operator', e.target.value)}
                      className="border border-gray-300 rounded-md px-3 py-2"
                    >
                      <option value="IN">IN</option>
                      <option value="EQ">EQ</option>
                      <option value="NOT_IN">NOT_IN</option>
                    </select>
                    <div className="flex-1">
                      <input
                        type="text"
                        value={rule.values}
                        onChange={(e) => updateRule(index, 'values', e.target.value)}
                        placeholder="Values (comma-separated)"
                        className="w-full border border-gray-300 rounded-md px-3 py-2"
                      />
                    </div>
                    <button
                      onClick={() => removeRule(index)}
                      className="text-red-600 hover:text-red-800 px-2"
                    >
                      Remove
                    </button>
                  </div>
                  {suggestedValues.length > 0 && (
                    <div className="flex flex-wrap gap-1 ml-0 pl-0">
                      <span className="text-xs text-gray-500">Suggested:</span>
                      {suggestedValues.slice(0, 8).map(v => (
                        <button
                          key={v}
                          type="button"
                          onClick={() => {
                            const current = rule.values ? rule.values.split(',').map(s => s.trim()).filter(Boolean) : [];
                            if (!current.includes(v)) {
                              updateRule(index, 'values', [...current, v].join(', '));
                            }
                          }}
                          className="text-xs px-2 py-0.5 bg-blue-50 text-blue-700 rounded hover:bg-blue-100"
                        >
                          {v}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )})}
            </div>
            <button onClick={addRule} className="mt-4 text-blue-600 hover:text-blue-800 text-sm">
              + Add Rule
            </button>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowTargetingModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 border border-gray-300 rounded-md"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveTargeting}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Creative Modal */}
      {showCreativeModal && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-lg">
            <h3 className="text-lg font-medium mb-4">{editingCreative ? 'Edit Creative' : 'Add Creative'}</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input
                  type="text"
                  value={newCreative.name}
                  onChange={(e) => setNewCreative({ ...newCreative, name: e.target.value })}
                  placeholder="Creative name"
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Width</label>
                  <input
                    type="number"
                    value={newCreative.width}
                    onChange={(e) => setNewCreative({ ...newCreative, width: Number(e.target.value) })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Height</label>
                  <input
                    type="number"
                    value={newCreative.height}
                    onChange={(e) => setNewCreative({ ...newCreative, height: Number(e.target.value) })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                  />
                </div>
              </div>

              {/* Image Source Toggle */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Image Source</label>
                <div className="flex gap-4">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="imageSource"
                      value="url"
                      checked={imageSource === 'url'}
                      onChange={() => setImageSource('url')}
                      className="mr-2"
                    />
                    <span className="text-sm">URL (Hosted Image)</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="imageSource"
                      value="upload"
                      checked={imageSource === 'upload'}
                      onChange={() => setImageSource('upload')}
                      className="mr-2"
                    />
                    <span className="text-sm">Upload Image</span>
                  </label>
                </div>
              </div>

              {/* URL Input */}
              {imageSource === 'url' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Image URL</label>
                  <input
                    type="text"
                    value={newCreative.image_url}
                    onChange={(e) => setNewCreative({ ...newCreative, image_url: e.target.value })}
                    placeholder="https://..."
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                  />
                  {newCreative.image_url && (
                    <div className="mt-2">
                      <img
                        src={newCreative.image_url}
                        alt="Preview"
                        className="max-w-full h-auto max-h-32 border border-gray-200 rounded"
                        onError={(e) => (e.currentTarget.style.display = 'none')}
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Upload Input */}
              {imageSource === 'upload' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Upload Image</label>
                  <div
                    className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-blue-400 transition-colors"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    {uploading ? (
                      <div className="text-gray-500">Uploading...</div>
                    ) : uploadPreview ? (
                      <div>
                        <img
                          src={uploadPreview}
                          alt="Preview"
                          className="max-w-full h-auto max-h-32 mx-auto border border-gray-200 rounded"
                        />
                        <p className="mt-2 text-sm text-green-600">Image uploaded successfully!</p>
                      </div>
                    ) : (
                      <div>
                        <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                          <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        <p className="mt-2 text-sm text-gray-600">Click to upload an image</p>
                        <p className="mt-1 text-xs text-gray-500">PNG, JPG, GIF, WebP up to 5MB</p>
                      </div>
                    )}
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/gif,image/webp"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Click URL</label>
                <input
                  type="text"
                  value={newCreative.click_url}
                  onChange={(e) => setNewCreative({ ...newCreative, click_url: e.target.value })}
                  placeholder="https://..."
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => {
                  setShowCreativeModal(false);
                  setUploadPreview(null);
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 border border-gray-300 rounded-md"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveCreative}
                disabled={!newCreative.name.trim() || !newCreative.image_url.trim() || !newCreative.click_url.trim() || uploading}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md disabled:opacity-50"
              >
                {editingCreative ? 'Save' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {showSettingsModal && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-medium mb-4">Line Item Settings</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={editingSettings.priority}
                  onChange={(e) => setEditingSettings({ ...editingSettings, priority: Number(e.target.value) })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Lower number = higher priority. Line items with priority 1 are served first.
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Weight</label>
                <input
                  type="number"
                  min="1"
                  max="1000"
                  value={editingSettings.weight}
                  onChange={(e) => setEditingSettings({ ...editingSettings, weight: Number(e.target.value) })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                />
                <p className="mt-1 text-xs text-gray-500">
                  When multiple line items have the same priority, weight determines rotation ratio.
                  E.g., weight 200 vs 100 means 2:1 serving ratio.
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Share of Voice (%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={editingSettings.sov_percentage}
                  onChange={(e) => setEditingSettings({ ...editingSettings, sov_percentage: Number(e.target.value) })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Set the percentage of ad requests this line item should fill (e.g., 25 = 25% of requests).
                  When total SOV of competing items is less than 100%, remaining requests return no ad.
                  Set to 0 to use weight-based rotation instead.
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Frequency Cap</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    min="0"
                    value={editingSettings.frequency_cap}
                    onChange={(e) => setEditingSettings({ ...editingSettings, frequency_cap: Number(e.target.value) })}
                    className="flex-1 border border-gray-300 rounded-md px-3 py-2"
                    placeholder="0 = unlimited"
                  />
                  <select
                    value={editingSettings.frequency_cap_period}
                    onChange={(e) => setEditingSettings({ ...editingSettings, frequency_cap_period: e.target.value })}
                    className="border border-gray-300 rounded-md px-3 py-2"
                  >
                    <option value="day">per day</option>
                    <option value="hour">per hour</option>
                    <option value="session">per session</option>
                  </select>
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  Maximum impressions per user. Set to 0 for unlimited.
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowSettingsModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 border border-gray-300 rounded-md"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveSettings}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
