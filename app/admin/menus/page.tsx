'use client';

import { useState, useEffect, useCallback } from 'react';
import { getCSRFToken } from '@/lib/utils/fetch-utils';

interface MenuItem {
  id?: number;
  category: string;
  name: string;
  description: string;
  price: number;
  dietary_tags: string[];
  is_available: boolean;
  sort_order: number;
}

interface SavedMenu {
  id: number;
  name: string;
  supplier_id: number | null;
  items: MenuItem[];
  created_at: string;
  updated_at: string;
}

const DIETARY_TAGS = ['vegetarian', 'vegan', 'gluten-free', 'dairy-free', 'nut-free'];

const emptyItem = (): MenuItem => ({
  category: '',
  name: '',
  description: '',
  price: 0,
  dietary_tags: [],
  is_available: true,
  sort_order: 0,
});

export default function SavedMenusPage() {
  const [menus, setMenus] = useState<SavedMenu[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingMenu, setEditingMenu] = useState<SavedMenu | null>(null);
  const [menuName, setMenuName] = useState('');
  const [menuItems, setMenuItems] = useState<MenuItem[]>([emptyItem()]);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

  const loadMenus = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/menus');
      const result = await response.json();
      if (result.success) setMenus(result.data || []);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMenus();
  }, [loadMenus]);

  const openCreateModal = () => {
    setEditingMenu(null);
    setMenuName('');
    setMenuItems([emptyItem()]);
    setShowModal(true);
  };

  const openEditModal = (menu: SavedMenu) => {
    setEditingMenu(menu);
    setMenuName(menu.name);
    setMenuItems(
      menu.items.length > 0
        ? menu.items.map((item) => ({ ...item }))
        : [emptyItem()]
    );
    setShowModal(true);
  };

  const addItem = () => {
    setMenuItems((prev) => [...prev, { ...emptyItem(), sort_order: prev.length }]);
  };

  const updateItem = (index: number, updates: Partial<MenuItem>) => {
    setMenuItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, ...updates } : item))
    );
  };

  const removeItem = (index: number) => {
    if (menuItems.length <= 1) return;
    setMenuItems((prev) => prev.filter((_, i) => i !== index));
  };

  const toggleDietaryTag = (index: number, tag: string) => {
    setMenuItems((prev) =>
      prev.map((item, i) => {
        if (i !== index) return item;
        const tags = item.dietary_tags.includes(tag)
          ? item.dietary_tags.filter((t) => t !== tag)
          : [...item.dietary_tags, tag];
        return { ...item, dietary_tags: tags };
      })
    );
  };

  const handleSave = async () => {
    if (!menuName.trim()) return;
    const validItems = menuItems.filter((item) => item.name.trim());
    if (validItems.length === 0) return;

    setSaving(true);
    try {
      const csrfToken = getCSRFToken();
      const url = editingMenu
        ? `/api/admin/menus/${editingMenu.id}`
        : '/api/admin/menus';
      const method = editingMenu ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(csrfToken ? { 'x-csrf-token': csrfToken } : {}),
        },
        body: JSON.stringify({
          name: menuName.trim(),
          items: validItems.map((item, i) => ({
            ...item,
            sort_order: i,
          })),
        }),
      });

      const result = await response.json();
      if (result.success) {
        setShowModal(false);
        await loadMenus();
      }
    } catch {
      // silently fail
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (menuId: number) => {
    try {
      const csrfToken = getCSRFToken();
      await fetch(`/api/admin/menus/${menuId}`, {
        method: 'DELETE',
        headers: {
          ...(csrfToken ? { 'x-csrf-token': csrfToken } : {}),
        },
      });
      setDeleteConfirm(null);
      await loadMenus();
    } catch {
      // silently fail
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-5xl mx-auto">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-1/3" />
            <div className="h-32 bg-gray-200 rounded" />
            <div className="h-32 bg-gray-200 rounded" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Saved Menus</h1>
            <p className="text-gray-600 text-sm mt-1">
              Create reusable menu templates to attach to trip proposal stops
            </p>
          </div>
          <button
            onClick={openCreateModal}
            className="px-4 py-2.5 bg-brand text-white rounded-lg font-medium hover:bg-brand-hover transition-colors"
          >
            + New Menu
          </button>
        </div>

        {menus.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-xl border border-gray-200 shadow-sm">
            <div className="text-4xl mb-3">🍽️</div>
            <p className="text-gray-700 font-bold mb-1">No saved menus yet</p>
            <p className="text-sm text-gray-600 mb-4">
              Create a menu template to reuse across trip proposals
            </p>
            <button
              onClick={openCreateModal}
              className="px-4 py-2 bg-brand text-white rounded-lg text-sm font-medium hover:bg-brand-hover"
            >
              Create First Menu
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {menus.map((menu) => (
              <div
                key={menu.id}
                className="bg-white rounded-xl border border-gray-200 shadow-sm p-5"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-bold text-gray-900">{menu.name}</h3>
                    <p className="text-sm text-gray-600">
                      {menu.items.length} item{menu.items.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => openEditModal(menu)}
                      className="px-3 py-1.5 text-sm font-medium text-brand hover:bg-brand-light rounded-lg transition-colors"
                    >
                      Edit
                    </button>
                    {deleteConfirm === menu.id ? (
                      <div className="flex gap-1">
                        <button
                          onClick={() => handleDelete(menu.id)}
                          className="px-3 py-1.5 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg"
                        >
                          Confirm
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(null)}
                          className="px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setDeleteConfirm(menu.id)}
                        className="px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>

                {/* Items preview */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {menu.items.slice(0, 6).map((item, i) => (
                    <div key={i} className="text-sm px-3 py-2 bg-gray-50 rounded-lg">
                      <div className="flex justify-between items-baseline">
                        <span className="font-medium text-gray-900">{item.name}</span>
                        <span className="text-gray-600 ml-2">
                          ${Number(item.price).toFixed(2)}
                        </span>
                      </div>
                      {item.dietary_tags && item.dietary_tags.length > 0 && (
                        <div className="flex gap-1 mt-1">
                          {item.dietary_tags.map((tag) => (
                            <span
                              key={tag}
                              className="text-xs px-1.5 py-0.5 bg-green-100 text-green-800 rounded"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                  {menu.items.length > 6 && (
                    <div className="text-sm px-3 py-2 text-gray-500 italic">
                      +{menu.items.length - 6} more items
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Create/Edit Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-xl">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-xl font-bold text-gray-900">
                  {editingMenu ? 'Edit Menu' : 'New Menu'}
                </h2>
              </div>

              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-1">
                    Menu Name
                  </label>
                  <input
                    type="text"
                    value={menuName}
                    onChange={(e) => setMenuName(e.target.value)}
                    placeholder="e.g., Olive Marketplace Lunch"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand focus:border-brand"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium text-gray-900">
                      Menu Items
                    </label>
                    <button
                      type="button"
                      onClick={addItem}
                      className="text-sm text-brand hover:text-brand-hover font-medium"
                    >
                      + Add Item
                    </button>
                  </div>

                  <div className="space-y-3">
                    {menuItems.map((item, index) => (
                      <div
                        key={index}
                        className="border border-gray-200 rounded-lg p-3 bg-gray-50"
                      >
                        <div className="flex gap-2 mb-2">
                          <input
                            type="text"
                            value={item.name}
                            onChange={(e) =>
                              updateItem(index, { name: e.target.value })
                            }
                            placeholder="Item name"
                            className="flex-1 px-2 py-1.5 border border-gray-300 rounded text-sm"
                          />
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.price || ''}
                            onChange={(e) =>
                              updateItem(index, {
                                price: parseFloat(e.target.value) || 0,
                              })
                            }
                            placeholder="Price"
                            className="w-24 px-2 py-1.5 border border-gray-300 rounded text-sm"
                          />
                          {menuItems.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeItem(index)}
                              className="text-red-600 hover:text-red-800 text-sm font-bold px-2"
                            >
                              ✕
                            </button>
                          )}
                        </div>
                        <div className="flex gap-2 mb-2">
                          <input
                            type="text"
                            value={item.category}
                            onChange={(e) =>
                              updateItem(index, { category: e.target.value })
                            }
                            placeholder="Category (optional)"
                            className="w-40 px-2 py-1.5 border border-gray-300 rounded text-sm"
                          />
                          <input
                            type="text"
                            value={item.description}
                            onChange={(e) =>
                              updateItem(index, { description: e.target.value })
                            }
                            placeholder="Description (optional)"
                            className="flex-1 px-2 py-1.5 border border-gray-300 rounded text-sm"
                          />
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {DIETARY_TAGS.map((tag) => (
                            <button
                              key={tag}
                              type="button"
                              onClick={() => toggleDietaryTag(index, tag)}
                              className={`text-xs px-2 py-1 rounded-full border transition-colors ${
                                item.dietary_tags.includes(tag)
                                  ? 'bg-green-100 border-green-300 text-green-800'
                                  : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'
                              }`}
                            >
                              {tag}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving || !menuName.trim() || menuItems.every((i) => !i.name.trim())}
                  className="px-4 py-2 bg-brand text-white rounded-lg font-medium hover:bg-brand-hover transition-colors disabled:opacity-50"
                >
                  {saving ? 'Saving...' : editingMenu ? 'Update Menu' : 'Create Menu'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
