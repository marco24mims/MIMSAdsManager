import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  getLineItem,
  updateLineItem,
  getTargetingRules,
  setTargetingRules,
  getCreatives,
  createCreative,
  deleteCreative,
  type LineItem,
  type TargetingRule,
  type Creative,
} from '../api';

export default function LineItemDetail() {
  const { id } = useParams<{ id: string }>();
  const [lineItem, setLineItem] = useState<LineItem | null>(null);
  const [targetingRules, setTargetingRulesState] = useState<TargetingRule[]>([]);
  const [creatives, setCreatives] = useState<Creative[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Targeting modal
  const [showTargetingModal, setShowTargetingModal] = useState(false);
  const [editingRules, setEditingRules] = useState<{ key: string; operator: string; values: string }[]>([]);

  // Creative modal
  const [showCreativeModal, setShowCreativeModal] = useState(false);
  const [newCreative, setNewCreative] = useState({
    name: '',
    width: 728,
    height: 90,
    image_url: '',
    click_url: '',
  });

  useEffect(() => {
    if (id) {
      loadData();
    }
  }, [id]);

  async function loadData() {
    try {
      setLoading(true);
      const [lineItemData, rulesData, creativesData] = await Promise.all([
        getLineItem(Number(id)),
        getTargetingRules(Number(id)),
        getCreatives(Number(id)),
      ]);
      setLineItem(lineItemData);
      setTargetingRulesState(rulesData);
      setCreatives(creativesData);
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

  async function handleCreateCreative() {
    if (!newCreative.name.trim() || !newCreative.image_url.trim() || !newCreative.click_url.trim()) return;

    try {
      await createCreative({
        line_item_id: Number(id),
        ...newCreative,
      });
      setNewCreative({ name: '', width: 728, height: 90, image_url: '', click_url: '' });
      setShowCreativeModal(false);
      loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create creative');
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
            <div className="mt-2 flex items-center gap-4">
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
              <span className="text-sm text-gray-500">
                Freq Cap: {lineItem.frequency_cap || 'None'}
                {lineItem.frequency_cap > 0 && `/${lineItem.frequency_cap_period}`}
              </span>
            </div>
          </div>
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

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
          {error}
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

      {/* Creatives Section */}
      <div className="sm:flex sm:items-center sm:justify-between mb-4">
        <h3 className="text-lg font-medium text-gray-900">Creatives</h3>
        <button
          onClick={() => setShowCreativeModal(true)}
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
                  <button
                    onClick={() => handleDeleteCreative(creative.id)}
                    className="text-red-600 hover:text-red-800 text-sm"
                  >
                    Delete
                  </button>
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
            <div className="space-y-4">
              {editingRules.map((rule, index) => (
                <div key={index} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={rule.key}
                    onChange={(e) => updateRule(index, 'key', e.target.value)}
                    placeholder="Key (e.g., country)"
                    className="flex-1 border border-gray-300 rounded-md px-3 py-2"
                  />
                  <select
                    value={rule.operator}
                    onChange={(e) => updateRule(index, 'operator', e.target.value)}
                    className="border border-gray-300 rounded-md px-3 py-2"
                  >
                    <option value="IN">IN</option>
                    <option value="EQ">EQ</option>
                    <option value="NOT_IN">NOT_IN</option>
                  </select>
                  <input
                    type="text"
                    value={rule.values}
                    onChange={(e) => updateRule(index, 'values', e.target.value)}
                    placeholder="Values (comma-separated)"
                    className="flex-1 border border-gray-300 rounded-md px-3 py-2"
                  />
                  <button
                    onClick={() => removeRule(index)}
                    className="text-red-600 hover:text-red-800 px-2"
                  >
                    Remove
                  </button>
                </div>
              ))}
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
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-medium mb-4">Add Creative</h3>
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
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Image URL</label>
                <input
                  type="text"
                  value={newCreative.image_url}
                  onChange={(e) => setNewCreative({ ...newCreative, image_url: e.target.value })}
                  placeholder="https://..."
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                />
              </div>
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
                onClick={() => setShowCreativeModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 border border-gray-300 rounded-md"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateCreative}
                disabled={!newCreative.name.trim() || !newCreative.image_url.trim() || !newCreative.click_url.trim()}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md disabled:opacity-50"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
