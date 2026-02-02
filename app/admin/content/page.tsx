"use client";

/**
 * Content Management Admin Page
 * Edit static page content and collections through a UI
 */

import { useState, useEffect, useCallback } from 'react';
import { logger } from '@/lib/logger';

interface PageContent {
  id: number;
  page_slug: string;
  section_key: string;
  content_type: 'text' | 'html' | 'json' | 'number';
  content: string;
  metadata: Record<string, unknown>;
  updated_at: string;
}

interface CollectionItem {
  id: number;
  collection_type: string;
  slug: string;
  title: string;
  subtitle: string | null;
  description: string | null;
  content: Record<string, unknown>;
  image_url: string | null;
  icon: string | null;
  sort_order: number;
  is_active: boolean;
  updated_at: string;
}

type Tab = 'pages' | 'collections';

export default function ContentManagementPage() {
  const [activeTab, setActiveTab] = useState<Tab>('pages');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Pages state
  const [availablePages, setAvailablePages] = useState<string[]>([]);
  const [selectedPage, setSelectedPage] = useState<string>('');
  const [pageContent, setPageContent] = useState<PageContent[]>([]);
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>('');

  // Collections state
  const [collectionTypes, setCollectionTypes] = useState<string[]>([]);
  const [selectedCollection, setSelectedCollection] = useState<string>('');
  const [collectionItems, setCollectionItems] = useState<CollectionItem[]>([]);
  const [editingItem, setEditingItem] = useState<CollectionItem | null>(null);

  // Load initial data
  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    setLoading(true);
    try {
      // Load available pages
      const pagesRes = await fetch('/api/admin/content/pages');
      if (pagesRes.ok) {
        const data = await pagesRes.json();
        setAvailablePages(data.pages || []);
        if (data.pages?.length > 0) {
          setSelectedPage(data.pages[0]);
        }
      }

      // Load collection types
      const collectionsRes = await fetch('/api/admin/content/collections');
      if (collectionsRes.ok) {
        const data = await collectionsRes.json();
        setCollectionTypes(data.types || []);
        if (data.types?.length > 0) {
          setSelectedCollection(data.types[0]);
        }
      }
    } catch (error) {
      logger.error('Failed to load content data', { error });
      setMessage({ type: 'error', text: 'Failed to load content data' });
    } finally {
      setLoading(false);
    }
  };

  // Load page content when selected page changes
  const loadPageContent = useCallback(async () => {
    if (!selectedPage) return;
    try {
      const res = await fetch(`/api/admin/content/pages?page=${selectedPage}`);
      if (res.ok) {
        const data = await res.json();
        setPageContent(data.content || []);
      }
    } catch (error) {
      logger.error('Failed to load page content', { error });
    }
  }, [selectedPage]);

  useEffect(() => {
    loadPageContent();
  }, [loadPageContent]);

  // Load collection items when selected collection changes
  const loadCollectionItems = useCallback(async () => {
    if (!selectedCollection) return;
    try {
      const res = await fetch(`/api/admin/content/collections?type=${selectedCollection}&includeInactive=true`);
      if (res.ok) {
        const data = await res.json();
        setCollectionItems(data.items || []);
      }
    } catch (error) {
      logger.error('Failed to load collection items', { error });
    }
  }, [selectedCollection]);

  useEffect(() => {
    loadCollectionItems();
  }, [loadCollectionItems]);

  // Save page content
  const savePageContent = async (pageSlug: string, sectionKey: string, content: string) => {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch('/api/admin/content/pages', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ page_slug: pageSlug, section_key: sectionKey, content }),
      });

      if (res.ok) {
        setMessage({ type: 'success', text: 'Content saved successfully!' });
        setEditingSection(null);
        loadPageContent();
      } else {
        throw new Error('Failed to save');
      }
    } catch (error) {
      logger.error('Failed to save content', { error });
      setMessage({ type: 'error', text: 'Failed to save content' });
    } finally {
      setSaving(false);
    }
  };

  // Save collection item
  const saveCollectionItem = async (item: CollectionItem) => {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch('/api/admin/content/collections', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: item.id,
          title: item.title,
          subtitle: item.subtitle,
          description: item.description,
          content: item.content,
          is_active: item.is_active,
          sort_order: item.sort_order,
        }),
      });

      if (res.ok) {
        setMessage({ type: 'success', text: 'Collection item saved!' });
        setEditingItem(null);
        loadCollectionItems();
      } else {
        throw new Error('Failed to save');
      }
    } catch (error) {
      logger.error('Failed to save collection item', { error });
      setMessage({ type: 'error', text: 'Failed to save collection item' });
    } finally {
      setSaving(false);
    }
  };

  const formatPageName = (slug: string) => {
    return slug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  };

  const formatSectionKey = (key: string) => {
    return key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading content...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">📝 Content Management</h1>
              <p className="text-sm text-gray-600">Edit website content without touching code</p>
            </div>
            {message && (
              <div
                className={`px-4 py-2 rounded-lg ${
                  message.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}
              >
                {message.text}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex gap-6">
            {[
              { id: 'pages' as Tab, label: 'Page Content', icon: '📄' },
              { id: 'collections' as Tab, label: 'Collections', icon: '📚' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-3 font-medium border-b-2 transition ${
                  activeTab === tab.id
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.icon} {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Pages Tab */}
        {activeTab === 'pages' && (
          <div className="space-y-6">
            {/* Page Selector */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Select Page</h2>
              <div className="flex flex-wrap gap-2">
                {availablePages.map((page) => (
                  <button
                    key={page}
                    onClick={() => setSelectedPage(page)}
                    className={`px-4 py-2 rounded-lg font-medium transition ${
                      selectedPage === page
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {formatPageName(page)}
                  </button>
                ))}
              </div>
            </div>

            {/* Page Content Editor */}
            {selectedPage && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">
                  {formatPageName(selectedPage)} Content
                </h2>

                {pageContent.length === 0 ? (
                  <p className="text-gray-500">No editable content found for this page.</p>
                ) : (
                  <div className="space-y-4">
                    {pageContent.map((section) => (
                      <div key={section.section_key} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <h3 className="font-semibold text-gray-900">
                              {formatSectionKey(section.section_key)}
                            </h3>
                            <span className="text-xs text-gray-500">
                              Type: {section.content_type} | Last updated:{' '}
                              {new Date(section.updated_at).toLocaleDateString()}
                            </span>
                          </div>
                          {editingSection !== section.section_key && (
                            <button
                              onClick={() => {
                                setEditingSection(section.section_key);
                                setEditValue(section.content);
                              }}
                              className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition"
                            >
                              Edit
                            </button>
                          )}
                        </div>

                        {editingSection === section.section_key ? (
                          <div className="space-y-3">
                            {section.content_type === 'html' ? (
                              <textarea
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                rows={6}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg font-mono text-sm"
                                placeholder="HTML content..."
                              />
                            ) : section.content_type === 'number' ? (
                              <input
                                type="number"
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                              />
                            ) : (
                              <input
                                type="text"
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                                maxLength={
                                  (section.metadata?.maxLength as number) || undefined
                                }
                              />
                            )}

                            {typeof section.metadata?.maxLength === 'number' && (
                              <p className="text-xs text-gray-500">
                                {editValue.length} / {section.metadata.maxLength} characters
                              </p>
                            )}

                            <div className="flex gap-2">
                              <button
                                onClick={() =>
                                  savePageContent(section.page_slug, section.section_key, editValue)
                                }
                                disabled={saving}
                                className="px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition disabled:opacity-50"
                              >
                                {saving ? 'Saving...' : 'Save'}
                              </button>
                              <button
                                onClick={() => {
                                  setEditingSection(null);
                                  setEditValue('');
                                }}
                                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="bg-gray-50 rounded-lg p-3">
                            {section.content_type === 'html' ? (
                              <div
                                className="prose prose-sm max-w-none"
                                dangerouslySetInnerHTML={{ __html: section.content }}
                              />
                            ) : (
                              <p className="text-gray-700">{section.content}</p>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Add New Section */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Add New Content Section</h2>
              <p className="text-gray-600 text-sm mb-4">
                To add a new editable section, run the following SQL or contact your developer:
              </p>
              <pre className="bg-gray-900 text-green-400 p-4 rounded-lg text-sm overflow-x-auto">
                {`INSERT INTO page_content (page_slug, section_key, content_type, content, metadata)
VALUES ('${selectedPage || 'page_name'}', 'section_key', 'text', 'Content here', '{}');`}
              </pre>
            </div>
          </div>
        )}

        {/* Collections Tab */}
        {activeTab === 'collections' && (
          <div className="space-y-6">
            {/* Collection Type Selector */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Select Collection</h2>
              <div className="flex flex-wrap gap-2">
                {collectionTypes.map((type) => (
                  <button
                    key={type}
                    onClick={() => setSelectedCollection(type)}
                    className={`px-4 py-2 rounded-lg font-medium transition ${
                      selectedCollection === type
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {formatPageName(type)}
                  </button>
                ))}
              </div>
            </div>

            {/* Collection Items */}
            {selectedCollection && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">
                  {formatPageName(selectedCollection)} Items
                </h2>

                {collectionItems.length === 0 ? (
                  <p className="text-gray-500">No items found in this collection.</p>
                ) : (
                  <div className="space-y-4">
                    {collectionItems.map((item) => (
                      <div
                        key={item.id}
                        className={`border rounded-lg p-4 ${
                          item.is_active ? 'border-gray-200' : 'border-red-200 bg-red-50'
                        }`}
                      >
                        {editingItem?.id === item.id ? (
                          // Edit Mode
                          <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                  Title
                                </label>
                                <input
                                  type="text"
                                  value={editingItem.title}
                                  onChange={(e) =>
                                    setEditingItem({ ...editingItem, title: e.target.value })
                                  }
                                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                  Subtitle
                                </label>
                                <input
                                  type="text"
                                  value={editingItem.subtitle || ''}
                                  onChange={(e) =>
                                    setEditingItem({ ...editingItem, subtitle: e.target.value })
                                  }
                                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                                />
                              </div>
                            </div>

                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Description
                              </label>
                              <textarea
                                value={editingItem.description || ''}
                                onChange={(e) =>
                                  setEditingItem({ ...editingItem, description: e.target.value })
                                }
                                rows={3}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                              />
                            </div>

                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Content (JSON)
                              </label>
                              <textarea
                                value={JSON.stringify(editingItem.content, null, 2)}
                                onChange={(e) => {
                                  try {
                                    const parsed = JSON.parse(e.target.value);
                                    setEditingItem({ ...editingItem, content: parsed });
                                  } catch {
                                    // Invalid JSON, keep the raw value for editing
                                  }
                                }}
                                rows={6}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg font-mono text-sm"
                              />
                            </div>

                            <div className="flex items-center gap-4">
                              <label className="flex items-center gap-2">
                                <input
                                  type="checkbox"
                                  checked={editingItem.is_active}
                                  onChange={(e) =>
                                    setEditingItem({ ...editingItem, is_active: e.target.checked })
                                  }
                                  className="w-4 h-4 text-blue-600"
                                />
                                <span className="text-sm text-gray-700">Active</span>
                              </label>

                              <div>
                                <label className="text-sm font-medium text-gray-700 mr-2">
                                  Sort Order:
                                </label>
                                <input
                                  type="number"
                                  value={editingItem.sort_order}
                                  onChange={(e) =>
                                    setEditingItem({
                                      ...editingItem,
                                      sort_order: parseInt(e.target.value) || 0,
                                    })
                                  }
                                  className="w-20 px-3 py-1 border border-gray-300 rounded-lg"
                                />
                              </div>
                            </div>

                            <div className="flex gap-2">
                              <button
                                onClick={() => saveCollectionItem(editingItem)}
                                disabled={saving}
                                className="px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition disabled:opacity-50"
                              >
                                {saving ? 'Saving...' : 'Save'}
                              </button>
                              <button
                                onClick={() => setEditingItem(null)}
                                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          // View Mode
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <h3 className="font-semibold text-gray-900">{item.title}</h3>
                                {!item.is_active && (
                                  <span className="px-2 py-0.5 text-xs bg-red-100 text-red-700 rounded">
                                    Inactive
                                  </span>
                                )}
                                <span className="text-xs text-gray-500">#{item.sort_order}</span>
                              </div>
                              {item.subtitle && (
                                <p className="text-sm text-gray-600">{item.subtitle}</p>
                              )}
                              {item.description && (
                                <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                                  {item.description}
                                </p>
                              )}
                              <p className="text-xs text-gray-400 mt-2">
                                Slug: {item.slug} | Updated:{' '}
                                {new Date(item.updated_at).toLocaleDateString()}
                              </p>
                            </div>
                            <button
                              onClick={() => setEditingItem(item)}
                              className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition"
                            >
                              Edit
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Add New Collection Item */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Add New Collection Item</h2>
              <p className="text-gray-600 text-sm mb-4">
                To add a new item to this collection, run the following SQL or contact your developer:
              </p>
              <pre className="bg-gray-900 text-green-400 p-4 rounded-lg text-sm overflow-x-auto">
                {`INSERT INTO content_collections
(collection_type, slug, title, subtitle, description, content, sort_order)
VALUES ('${selectedCollection || 'collection_type'}', 'slug-here', 'Title', 'Subtitle',
'Description text', '{"key": "value"}', 0);`}
              </pre>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
