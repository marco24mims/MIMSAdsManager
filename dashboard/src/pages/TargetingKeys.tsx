import { useState, useEffect } from 'react';
import {
  getTargetingKeys,
  addTargetingKeyValues,
  updateTargetingKeyValues,
  deleteTargetingKey,
  type TargetingKey,
} from '../api';

export default function TargetingKeys() {
  const [keys, setKeys] = useState<TargetingKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingKey, setEditingKey] = useState<TargetingKey | null>(null);
  const [formKeyName, setFormKeyName] = useState('');
  const [formValues, setFormValues] = useState<string[]>([]);
  const [newValueInput, setNewValueInput] = useState('');

  useEffect(() => {
    loadKeys();
  }, []);

  async function loadKeys() {
    try {
      setLoading(true);
      const data = await getTargetingKeys();
      setKeys(data || []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load targeting keys');
    } finally {
      setLoading(false);
    }
  }

  function openCreateModal() {
    setEditingKey(null);
    setFormKeyName('');
    setFormValues([]);
    setNewValueInput('');
    setShowModal(true);
  }

  function openEditModal(key: TargetingKey) {
    setEditingKey(key);
    setFormKeyName(key.key);
    setFormValues([...(key.values || [])]);
    setNewValueInput('');
    setShowModal(true);
  }

  function addValue() {
    const trimmed = newValueInput.trim();
    if (trimmed && !formValues.includes(trimmed)) {
      setFormValues([...formValues, trimmed]);
    }
    setNewValueInput('');
  }

  function removeValue(value: string) {
    setFormValues(formValues.filter((v) => v !== value));
  }

  function handleValueKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault();
      addValue();
    }
  }

  async function handleSubmit() {
    if (!formKeyName.trim()) {
      setError('Key name is required');
      return;
    }

    try {
      if (editingKey) {
        await updateTargetingKeyValues(editingKey.key, formValues);
      } else {
        await addTargetingKeyValues(formKeyName.trim(), formValues);
      }
      setShowModal(false);
      loadKeys();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save targeting key');
    }
  }

  async function handleDelete(key: string) {
    if (!confirm(`Are you sure you want to delete the targeting key "${key}"?`)) return;

    try {
      await deleteTargetingKey(key);
      loadKeys();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete targeting key');
    }
  }

  const filteredKeys = keys.filter(
    (k) =>
      k.key.toLowerCase().includes(search.toLowerCase()) ||
      (k.values || []).some((v) => v.toLowerCase().includes(search.toLowerCase()))
  );

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
          <h2 className="text-2xl font-bold text-gray-900">Targeting Keys</h2>
          <p className="mt-1 text-sm text-gray-500">
            Manage targeting keys and their allowed values. These are used for line item targeting rules.
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className="mt-3 sm:mt-0 inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
        >
          Create Key
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
          {error}
          <button onClick={() => setError(null)} className="float-right font-bold">&times;</button>
        </div>
      )}

      <div className="mb-4">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search keys or values..."
          className="w-full sm:w-80 border border-gray-300 rounded-md px-3 py-2 text-sm"
        />
      </div>

      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        {filteredKeys.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            {keys.length === 0
              ? 'No targeting keys yet. Create one or they will be auto-captured when saving targeting rules.'
              : 'No keys match your search.'}
          </div>
        ) : (
          <ul className="divide-y divide-gray-200">
            {filteredKeys.map((k) => (
              <li key={k.id} className="px-4 py-4 sm:px-6 hover:bg-gray-50">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-medium text-gray-900 font-mono">{k.key}</span>
                      <span className="text-xs text-gray-400">
                        {(k.values || []).length} value{(k.values || []).length !== 1 ? 's' : ''}
                      </span>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {(k.values || []).map((v) => (
                        <span
                          key={v}
                          className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                        >
                          {v}
                        </span>
                      ))}
                      {(k.values || []).length === 0 && (
                        <span className="text-sm text-gray-400 italic">No values</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <button
                      onClick={() => openEditModal(k)}
                      className="text-blue-600 hover:text-blue-800 text-sm"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(k.key)}
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
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-medium mb-4">
              {editingKey ? `Edit Key: ${editingKey.key}` : 'Create Targeting Key'}
            </h3>
            <div className="space-y-4">
              {!editingKey && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Key Name</label>
                  <input
                    type="text"
                    value={formKeyName}
                    onChange={(e) => setFormKeyName(e.target.value)}
                    placeholder="e.g., country, section, category"
                    className="w-full border border-gray-300 rounded-md px-3 py-2 font-mono text-sm"
                  />
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Values</label>
                <div className="flex flex-wrap gap-1.5 mb-2 min-h-[32px] p-2 border border-gray-200 rounded-md bg-gray-50">
                  {formValues.map((v) => (
                    <span
                      key={v}
                      className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                    >
                      {v}
                      <button
                        type="button"
                        onClick={() => removeValue(v)}
                        className="text-blue-600 hover:text-blue-900 font-bold"
                      >
                        &times;
                      </button>
                    </span>
                  ))}
                  {formValues.length === 0 && (
                    <span className="text-xs text-gray-400">No values added yet</span>
                  )}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newValueInput}
                    onChange={(e) => setNewValueInput(e.target.value)}
                    onKeyDown={handleValueKeyDown}
                    placeholder="Type a value and press Enter"
                    className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm"
                  />
                  <button
                    type="button"
                    onClick={addValue}
                    className="px-3 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 border border-blue-300 rounded-md"
                  >
                    Add
                  </button>
                </div>
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
                disabled={!editingKey && !formKeyName.trim()}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md disabled:opacity-50"
              >
                {editingKey ? 'Save' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
