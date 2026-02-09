import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  getCampaign,
  getLineItems,
  createLineItem,
  deleteLineItem,
  updateCampaign,
  type Campaign,
  type LineItem,
} from '../api';

export default function CampaignDetail() {
  const { id } = useParams<{ id: string }>();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [lineItems, setLineItems] = useState<LineItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [newLineItem, setNewLineItem] = useState({ name: '', priority: 5, frequency_cap: 0 });
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (id) {
      loadData();
    }
  }, [id]);

  async function loadData() {
    try {
      setLoading(true);
      const [campaignData, lineItemsData] = await Promise.all([
        getCampaign(Number(id)),
        getLineItems(Number(id)),
      ]);
      setCampaign(campaignData);
      setLineItems(lineItemsData);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load campaign');
    } finally {
      setLoading(false);
    }
  }

  async function handleToggleStatus() {
    if (!campaign) return;
    try {
      const newStatus = campaign.status === 'active' ? 'paused' : 'active';
      const updated = await updateCampaign(campaign.id, { status: newStatus });
      setCampaign(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update campaign');
    }
  }

  async function handleCreateLineItem() {
    if (!newLineItem.name.trim()) return;

    try {
      setCreating(true);
      await createLineItem({
        campaign_id: Number(id),
        name: newLineItem.name,
        priority: newLineItem.priority,
        frequency_cap: newLineItem.frequency_cap,
        status: 'active',
      });
      setNewLineItem({ name: '', priority: 5, frequency_cap: 0 });
      setShowModal(false);
      loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create line item');
    } finally {
      setCreating(false);
    }
  }

  async function handleDeleteLineItem(lineItemId: number) {
    if (!confirm('Are you sure you want to delete this line item?')) return;

    try {
      await deleteLineItem(lineItemId);
      loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete line item');
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-500">Campaign not found</div>
        <Link to="/" className="text-blue-600 hover:text-blue-800 mt-2 inline-block">
          Back to Campaigns
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <Link to="/" className="text-blue-600 hover:text-blue-800 text-sm">
          &larr; Back to Campaigns
        </Link>
      </div>

      <div className="bg-white shadow rounded-lg p-6 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{campaign.name}</h2>
            <div className="mt-2 flex items-center gap-4">
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  campaign.status === 'active'
                    ? 'bg-green-100 text-green-800'
                    : 'bg-gray-100 text-gray-800'
                }`}
              >
                {campaign.status}
              </span>
              <span className="text-sm text-gray-500">
                Created: {new Date(campaign.created_at).toLocaleDateString()}
              </span>
            </div>
          </div>
          <button
            onClick={handleToggleStatus}
            className={`px-4 py-2 rounded-md text-sm font-medium ${
              campaign.status === 'active'
                ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
                : 'bg-green-100 text-green-800 hover:bg-green-200'
            }`}
          >
            {campaign.status === 'active' ? 'Pause' : 'Activate'}
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      <div className="sm:flex sm:items-center sm:justify-between mb-4">
        <h3 className="text-lg font-medium text-gray-900">Line Items</h3>
        <button
          onClick={() => setShowModal(true)}
          className="mt-3 sm:mt-0 inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
        >
          Add Line Item
        </button>
      </div>

      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        {lineItems.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            No line items yet. Add a line item to start serving ads.
          </div>
        ) : (
          <ul className="divide-y divide-gray-200">
            {lineItems.map((lineItem) => (
              <li key={lineItem.id}>
                <div className="px-4 py-4 sm:px-6 flex items-center justify-between">
                  <div className="flex-1">
                    <Link
                      to={`/line-items/${lineItem.id}`}
                      className="text-lg font-medium text-blue-600 hover:text-blue-800"
                    >
                      {lineItem.name}
                    </Link>
                    <div className="mt-1 flex items-center gap-4 text-sm text-gray-500">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          lineItem.status === 'active'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {lineItem.status}
                      </span>
                      <span>Priority: {lineItem.priority}</span>
                      <span>
                        Freq Cap: {lineItem.frequency_cap || 'None'}
                        {lineItem.frequency_cap > 0 && `/${lineItem.frequency_cap_period}`}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeleteLineItem(lineItem.id)}
                    className="ml-4 text-red-600 hover:text-red-800 text-sm"
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-medium mb-4">Add Line Item</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input
                  type="text"
                  value={newLineItem.name}
                  onChange={(e) => setNewLineItem({ ...newLineItem, name: e.target.value })}
                  placeholder="Line item name"
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Priority (1-10)</label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={newLineItem.priority}
                  onChange={(e) => setNewLineItem({ ...newLineItem, priority: Number(e.target.value) })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Frequency Cap (0 = unlimited)
                </label>
                <input
                  type="number"
                  min="0"
                  value={newLineItem.frequency_cap}
                  onChange={(e) => setNewLineItem({ ...newLineItem, frequency_cap: Number(e.target.value) })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                />
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
                onClick={handleCreateLineItem}
                disabled={creating || !newLineItem.name.trim()}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md disabled:opacity-50"
              >
                {creating ? 'Creating...' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
