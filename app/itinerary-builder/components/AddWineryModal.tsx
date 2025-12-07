// Add New Winery Modal Component

import React from 'react';
import { NewWineryData } from '../types';

interface AddWineryModalProps {
  isOpen: boolean;
  wineryData: NewWineryData;
  onClose: () => void;
  onChange: (data: NewWineryData) => void;
  onSubmit: () => void;
}

export const AddWineryModal: React.FC<AddWineryModalProps> = ({
  isOpen,
  wineryData,
  onClose,
  onChange,
  onSubmit,
}) => {
  if (!isOpen) return null;

  const handleReset = () => {
    onChange({
      name: '',
      address: '',
      city: 'Walla Walla',
      state: 'WA',
      zip_code: '',
      tasting_fee: 0,
      average_visit_duration: 75
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Add New Winery</h2>
            <button
              onClick={handleReset}
              className="text-gray-500 hover:text-gray-700 text-3xl font-bold"
            >
              ×
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-gray-900 mb-2">Winery Name *</label>
              <input
                type="text"
                value={wineryData.name}
                onChange={(e) => onChange({ ...wineryData, name: e.target.value })}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-500"
                placeholder="e.g., Woodward Canyon"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-900 mb-2">Address *</label>
              <input
                type="text"
                value={wineryData.address}
                onChange={(e) => onChange({ ...wineryData, address: e.target.value })}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-500"
                placeholder="e.g., 11920 W Highway 12"
                required
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-2">
                <label className="block text-sm font-bold text-gray-900 mb-2">City *</label>
                <input
                  type="text"
                  value={wineryData.city}
                  onChange={(e) => onChange({ ...wineryData, city: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-900 mb-2">State</label>
                <input
                  type="text"
                  value={wineryData.state}
                  onChange={(e) => onChange({ ...wineryData, state: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-500"
                  maxLength={2}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-900 mb-2">ZIP Code</label>
              <input
                type="text"
                value={wineryData.zip_code}
                onChange={(e) => onChange({ ...wineryData, zip_code: e.target.value })}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-500"
                placeholder="99362"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-gray-900 mb-2">Tasting Fee ($)</label>
                <input
                  type="number"
                  value={wineryData.tasting_fee}
                  onChange={(e) => onChange({ ...wineryData, tasting_fee: parseFloat(e.target.value) || 0 })}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-500"
                  min="0"
                  step="5"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-900 mb-2">Visit Duration (min)</label>
                <input
                  type="number"
                  value={wineryData.average_visit_duration}
                  onChange={(e) => onChange({ ...wineryData, average_visit_duration: parseInt(e.target.value) || 75 })}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-500"
                  min="30"
                  step="15"
                />
              </div>
            </div>
          </div>

          <div className="flex gap-3 mt-6 pt-6 border-t border-gray-200">
            <button
              onClick={handleReset}
              className="flex-1 px-6 py-3 bg-gray-200 text-gray-900 rounded-lg font-bold hover:bg-gray-300 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={onSubmit}
              disabled={!wineryData.name || !wineryData.address}
              className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              Create & Add to Tour
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};




