/**
 * Menu Item Instance Component
 * Represents a single instance of an ordered item with customizations
 */

import ModificationButtons from './ModificationButtons';

interface MenuItemInstanceProps {
  instanceNumber: number;
  name?: string;
  modifications: string[];
  smartModifications: string[];
  onRemove: () => void;
  onUpdateName: (name: string) => void;
  onToggleModification: (modification: string) => void;
}

export default function MenuItemInstance({
  instanceNumber,
  name,
  modifications,
  smartModifications,
  onRemove,
  onUpdateName,
  onToggleModification,
}: MenuItemInstanceProps) {
  return (
    <div className="bg-gray-50 rounded-lg p-3">
      <div className="flex justify-between items-center mb-3">
        <span className="text-sm font-medium text-gray-700">
          #{instanceNumber}
        </span>
        <button
          onClick={onRemove}
          className="text-xs text-red-600 hover:text-red-700 font-medium"
        >
          Remove
        </button>
      </div>

      {/* Optional Name Input */}
      <div className="mb-3">
        <label className="block text-xs font-medium text-gray-600 mb-1">
          For: (optional)
        </label>
        <input
          type="text"
          value={name || ''}
          onChange={(e) => onUpdateName(e.target.value)}
          placeholder="e.g., John, Mom, Guest 1"
          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent placeholder:text-gray-500"
        />
      </div>

      {/* Modification Buttons */}
      {smartModifications.length > 0 && (
        <ModificationButtons
          smartModifications={smartModifications}
          selectedModifications={modifications}
          onToggle={onToggleModification}
        />
      )}
    </div>
  );
}

