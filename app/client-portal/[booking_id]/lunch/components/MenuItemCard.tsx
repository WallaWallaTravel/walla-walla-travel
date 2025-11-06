/**
 * Menu Item Card Component
 * Displays a single menu item with add button and instances
 */

import { type MenuItem } from '@/lib/menus';
import MenuItemInstance from './MenuItemInstance';

interface MenuItemCardProps {
  item: MenuItem;
  instances: Array<{ index: number; name?: string; modifications: string[] }>;
  smartModifications: string[];
  onAdd: () => void;
  onRemove: (instanceIndex: number) => void;
  onUpdateName: (instanceIndex: number, name: string) => void;
  onToggleModification: (instanceIndex: number, modification: string) => void;
}

export default function MenuItemCard({
  item,
  instances,
  smartModifications,
  onAdd,
  onRemove,
  onUpdateName,
  onToggleModification,
}: MenuItemCardProps) {
  return (
    <div className="border border-gray-200 rounded-lg p-4">
      {/* Item Header */}
      <div className="flex justify-between items-start mb-3">
        <div className="flex-1">
          <div className="font-medium text-gray-900">{item.name}</div>
          <div className="text-sm text-gray-600">{item.description}</div>
          <div className="text-sm font-semibold text-purple-600 mt-1">
            ${item.price.toFixed(2)}
          </div>
        </div>
        <button
          onClick={onAdd}
          className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-medium text-sm"
        >
          + Add
        </button>
      </div>

      {/* Individual Item Instances */}
      {instances.length > 0 && (
        <div className="space-y-3 mt-4 pt-4 border-t border-gray-200">
          {instances.map((instance, localIdx) => (
            <MenuItemInstance
              key={instance.index}
              instanceNumber={localIdx + 1}
              name={instance.name}
              modifications={instance.modifications}
              smartModifications={smartModifications}
              onRemove={() => onRemove(instance.index)}
              onUpdateName={(name) => onUpdateName(instance.index, name)}
              onToggleModification={(mod) => onToggleModification(instance.index, mod)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

