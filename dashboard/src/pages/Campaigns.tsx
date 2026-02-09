import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getCampaigns, createCampaign, deleteCampaign, type Campaign } from '../api';

export default function Campaigns() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [newCampaignName, setNewCampaignName] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    loadCampaigns();
  }, []);

  async function loadCampaigns() {
    try {
      setLoading(true);
      const data = await getCampaigns();
      setCampaigns(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load campaigns');
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate() {
    if (!newCampaignName.trim()) return;

    try {
      setCreating(true);
      await createCampaign({ name: newCampaignName, status: 'active' });
      setNewCampaignName('');
      setShowModal(false);
      loadCampaigns();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create campaign');
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete(id: number) {
    if (!confirm('Are you sure you want to delete this campaign?')) return;

    try {
      await deleteCampaign(id);
      loadCampaigns();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete campaign');
    }
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
        <h2 className="text-2xl font-bold text-gray-900">Campaigns</h2>
        <button
          onClick={() => setShowModal(true)}
          className="mt-3 sm:mt-0 inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
        >
          Create Campaign
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        {campaigns.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            No campaigns yet. Create your first campaign to get started.
          </div>
        ) : (
          <ul className="divide-y divide-gray-200">
            {campaigns.map((campaign) => (
              <li key={campaign.id}>
                <div className="px-4 py-4 sm:px-6 flex items-center justify-between">
                  <div className="flex-1">
                    <Link
                      to={`/campaigns/${campaign.id}`}
                      className="text-lg font-medium text-blue-600 hover:text-blue-800"
                    >
                      {campaign.name}
                    </Link>
                    <div className="mt-1 flex items-center gap-4 text-sm text-gray-500">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          campaign.status === 'active'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {campaign.status}
                      </span>
                      <span>Created: {new Date(campaign.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDelete(campaign.id)}
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
            <h3 className="text-lg font-medium mb-4">Create Campaign</h3>
            <input
              type="text"
              value={newCampaignName}
              onChange={(e) => setNewCampaignName(e.target.value)}
              placeholder="Campaign name"
              className="w-full border border-gray-300 rounded-md px-3 py-2 mb-4"
              autoFocus
            />
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 border border-gray-300 rounded-md"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={creating || !newCampaignName.trim()}
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
