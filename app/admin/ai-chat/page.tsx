'use client';

/**
 * Admin AI Chat Configuration Page
 *
 * Manage AI chat settings including:
 * - System prompts (AI personality and rules)
 * - Partner notes (partner-specific guidance)
 * - Global knowledge (events, seasonal info)
 * - Example conversations (training examples)
 * - Blocklist (topics/businesses to never recommend)
 */

import { useState, useEffect } from 'react';
import { logger } from '@/lib/logger';

// ============================================================================
// Types
// ============================================================================

type ConfigType = 'system_prompt' | 'partner_note' | 'global_knowledge' | 'example' | 'blocklist';

interface AIConfig {
  id: number;
  config_type: ConfigType;
  key: string | null;
  value: string;
  is_active: boolean;
  priority: number;
  created_at: string;
  updated_at: string;
}

interface ConfigSummary {
  total: number;
  active: number;
  byType: Record<ConfigType, number>;
}

// ============================================================================
// Constants
// ============================================================================

const CONFIG_TYPES: { value: ConfigType; label: string; description: string; icon: string }[] = [
  {
    value: 'system_prompt',
    label: 'System Prompt',
    description: 'AI personality, rules, and core behavior',
    icon: '🤖',
  },
  {
    value: 'partner_note',
    label: 'Partner Notes',
    description: 'Partner-specific guidance and tips',
    icon: '🏠',
  },
  {
    value: 'global_knowledge',
    label: 'Global Knowledge',
    description: 'Events, seasonal info, local facts',
    icon: '🌍',
  },
  {
    value: 'example',
    label: 'Examples',
    description: 'Example Q&A to guide AI responses',
    icon: '💬',
  },
  {
    value: 'blocklist',
    label: 'Blocklist',
    description: 'Topics or businesses to never recommend',
    icon: '🚫',
  },
];

const EMPTY_FORM = {
  config_type: 'global_knowledge' as ConfigType,
  key: '',
  value: '',
  is_active: true,
  priority: 0,
};

// ============================================================================
// Main Component
// ============================================================================

export default function AdminAIChatPage() {
  const [configs, setConfigs] = useState<AIConfig[]>([]);
  const [summary, setSummary] = useState<ConfigSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<ConfigType>('system_prompt');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Load configs on mount
  useEffect(() => {
    loadConfigs();
  }, []);

  const loadConfigs = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/ai-chat');
      if (response.ok) {
        const data = await response.json();
        setConfigs(data.data.configs || []);
        setSummary(data.data.summary || null);
      }
    } catch (error) {
      logger.error('Failed to load AI configs', { error });
      setMessage({ type: 'error', text: 'Failed to load configurations' });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.value.trim()) {
      setMessage({ type: 'error', text: 'Content is required' });
      return;
    }

    setSaving(true);
    setMessage(null);

    try {
      const url = '/api/admin/ai-chat';
      const method = editingId ? 'PUT' : 'POST';
      const body = editingId
        ? { id: editingId, ...formData }
        : formData;

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (data.success) {
        setMessage({ type: 'success', text: editingId ? 'Updated successfully' : 'Created successfully' });
        setShowForm(false);
        setEditingId(null);
        setFormData(EMPTY_FORM);
        loadConfigs();
      } else {
        setMessage({ type: 'error', text: data.error?.message || 'Failed to save' });
      }
    } catch (error) {
      logger.error('Failed to save config', { error });
      setMessage({ type: 'error', text: 'Failed to save' });
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (config: AIConfig) => {
    setFormData({
      config_type: config.config_type,
      key: config.key || '',
      value: config.value,
      is_active: config.is_active,
      priority: config.priority,
    });
    setEditingId(config.id);
    setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this configuration?')) return;

    try {
      const response = await fetch('/api/admin/ai-chat', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });

      if (response.ok) {
        setMessage({ type: 'success', text: 'Deleted successfully' });
        loadConfigs();
      } else {
        setMessage({ type: 'error', text: 'Failed to delete' });
      }
    } catch (error) {
      logger.error('Failed to delete config', { error });
      setMessage({ type: 'error', text: 'Failed to delete' });
    }
  };

  const handleToggleActive = async (id: number) => {
    try {
      const response = await fetch('/api/admin/ai-chat', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'toggle', id }),
      });

      if (response.ok) {
        loadConfigs();
      }
    } catch (error) {
      logger.error('Failed to toggle config', { error });
    }
  };

  const handleAddNew = () => {
    setFormData({ ...EMPTY_FORM, config_type: activeTab });
    setEditingId(null);
    setShowForm(true);
  };

  const filteredConfigs = configs.filter(c => c.config_type === activeTab);
  const activeTabInfo = CONFIG_TYPES.find(t => t.value === activeTab);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto p-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">AI Chat Configuration</h1>
          <p className="text-gray-600 mt-1">
            Tune and train the AI concierge with custom knowledge and guidelines
          </p>
        </div>

        {/* Message */}
        {message && (
          <div
            className={`mb-4 p-4 rounded-lg ${
              message.type === 'success'
                ? 'bg-green-50 text-green-800 border border-green-200'
                : 'bg-red-50 text-red-800 border border-red-200'
            }`}
          >
            {message.text}
            <button
              onClick={() => setMessage(null)}
              className="float-right text-current opacity-50 hover:opacity-100"
            >
              ×
            </button>
          </div>
        )}

        {/* Summary Cards */}
        {summary && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
            {CONFIG_TYPES.map(type => (
              <div
                key={type.value}
                onClick={() => setActiveTab(type.value)}
                className={`p-4 rounded-lg cursor-pointer transition-all ${
                  activeTab === type.value
                    ? 'bg-purple-100 border-2 border-purple-500'
                    : 'bg-white border border-gray-200 hover:border-purple-300'
                }`}
              >
                <div className="text-2xl mb-1">{type.icon}</div>
                <div className="text-sm font-medium text-gray-900">{type.label}</div>
                <div className="text-xs text-gray-500">
                  {summary.byType[type.value]} entries
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Tab Content */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          {/* Tab Header */}
          <div className="flex items-center justify-between border-b border-gray-200 p-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                {activeTabInfo?.icon} {activeTabInfo?.label}
              </h2>
              <p className="text-sm text-gray-500">{activeTabInfo?.description}</p>
            </div>
            <button
              onClick={handleAddNew}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              + Add New
            </button>
          </div>

          {/* Loading */}
          {loading && (
            <div className="p-8 text-center text-gray-500">
              <div className="animate-spin w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full mx-auto mb-2"></div>
              Loading...
            </div>
          )}

          {/* Empty State */}
          {!loading && filteredConfigs.length === 0 && (
            <div className="p-8 text-center text-gray-500">
              <div className="text-4xl mb-2">{activeTabInfo?.icon}</div>
              <p>No {activeTabInfo?.label.toLowerCase()} configured yet.</p>
              <button
                onClick={handleAddNew}
                className="mt-4 px-4 py-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200"
              >
                Add your first one
              </button>
            </div>
          )}

          {/* Config List */}
          {!loading && filteredConfigs.length > 0 && (
            <div className="divide-y divide-gray-100">
              {filteredConfigs.map(config => (
                <div key={config.id} className="p-4 hover:bg-gray-50">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      {config.key && (
                        <div className="text-sm font-medium text-purple-600 mb-1">
                          {config.key}
                        </div>
                      )}
                      <div className="text-gray-900 whitespace-pre-wrap text-sm">
                        {config.value.length > 300
                          ? config.value.substring(0, 300) + '...'
                          : config.value}
                      </div>
                      <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                        <span>Priority: {config.priority}</span>
                        <span>•</span>
                        <span>Updated: {new Date(config.updated_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleToggleActive(config.id)}
                        className={`px-3 py-1 text-xs rounded-full ${
                          config.is_active
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-500'
                        }`}
                      >
                        {config.is_active ? 'Active' : 'Inactive'}
                      </button>
                      <button
                        onClick={() => handleEdit(config)}
                        className="px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(config.id)}
                        className="px-3 py-1 text-xs text-red-600 hover:bg-red-50 rounded"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Form Modal */}
        {showForm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <form onSubmit={handleSubmit}>
                <div className="p-6 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {editingId ? 'Edit Configuration' : 'Add New Configuration'}
                  </h3>
                </div>

                <div className="p-6 space-y-4">
                  {/* Config Type */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Type
                    </label>
                    <select
                      value={formData.config_type}
                      onChange={e => setFormData({ ...formData, config_type: e.target.value as ConfigType })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      disabled={!!editingId}
                    >
                      {CONFIG_TYPES.map(type => (
                        <option key={type.value} value={type.value}>
                          {type.icon} {type.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Key (optional) */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Key / Label (optional)
                    </label>
                    <input
                      type="text"
                      value={formData.key}
                      onChange={e => setFormData({ ...formData, key: e.target.value })}
                      placeholder={
                        formData.config_type === 'partner_note'
                          ? 'Partner ID or name'
                          : formData.config_type === 'global_knowledge'
                          ? 'Topic (e.g., Spring Barrel Weekend)'
                          : 'Optional identifier'
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  </div>

                  {/* Value */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Content *
                    </label>
                    <textarea
                      value={formData.value}
                      onChange={e => setFormData({ ...formData, value: e.target.value })}
                      rows={formData.config_type === 'system_prompt' ? 12 : 6}
                      placeholder={
                        formData.config_type === 'system_prompt'
                          ? 'Enter the AI personality and rules...'
                          : formData.config_type === 'example'
                          ? 'Q: What winery has the best views?\nA: Echolands has stunning architecture and valley views...'
                          : formData.config_type === 'blocklist'
                          ? 'Business name or topic to never recommend'
                          : 'Enter the knowledge or note content...'
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent font-mono text-sm"
                      required
                    />
                  </div>

                  {/* Priority */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Priority
                      </label>
                      <input
                        type="number"
                        value={formData.priority}
                        onChange={e => setFormData({ ...formData, priority: parseInt(e.target.value) || 0 })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      />
                      <p className="text-xs text-gray-500 mt-1">Higher = more important</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Status
                      </label>
                      <label className="flex items-center gap-2 mt-2">
                        <input
                          type="checkbox"
                          checked={formData.is_active}
                          onChange={e => setFormData({ ...formData, is_active: e.target.checked })}
                          className="w-4 h-4 text-purple-600 rounded"
                        />
                        <span className="text-sm text-gray-700">Active</span>
                      </label>
                    </div>
                  </div>
                </div>

                <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowForm(false);
                      setEditingId(null);
                      setFormData(EMPTY_FORM);
                    }}
                    className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
                  >
                    {saving ? 'Saving...' : editingId ? 'Update' : 'Create'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
