// Pickup and Dropoff Location Components

import React from 'react';

interface PickupDropoffProps {
  type: 'pickup' | 'dropoff';
  location: string;
  time: string;
  driveTime?: number;
  showDriveTime: boolean;
  onLocationChange: (value: string) => void;
  onTimeChange: (value: string) => void;
  onCalculateDriveTime?: () => void;
  handleFocusSelect: (e: React.FocusEvent<HTMLInputElement>) => void;
}

export const PickupDropoff: React.FC<PickupDropoffProps> = ({
  type,
  location,
  time,
  driveTime,
  showDriveTime,
  onLocationChange,
  onTimeChange,
  onCalculateDriveTime,
  handleFocusSelect,
}) => {
  const isPickup = type === 'pickup';
  const icon = isPickup ? '🚗' : '🏁';
  const title = isPickup ? 'PICKUP LOCATION' : 'DROPOFF LOCATION';
  const timeLabel = isPickup ? 'Pickup Time' : 'Estimated Dropoff Time';
  const driveLabel = isPickup ? 'Drive to first stop:' : 'Drive from last stop:';

  return (
    <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-slate-400">
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 bg-slate-100 text-slate-700 rounded-lg flex items-center justify-center text-2xl font-bold flex-shrink-0">
          {icon}
        </div>
        <div className="flex-1">
          {/* Show drive time at top for dropoff, at bottom for pickup */}
          {!isPickup && showDriveTime && (
            <div className="mb-4 pb-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-700">
                  <span className="font-semibold">{driveLabel}</span>{' '}
                  <span className="text-blue-600 font-bold">
                    {driveTime || '—'} {driveTime ? 'min' : ''}
                  </span>
                </div>
                {onCalculateDriveTime && (
                  <button
                    onClick={onCalculateDriveTime}
                    className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold text-sm transition-colors"
                  >
                    📍 Auto-Calculate
                  </button>
                )}
              </div>
            </div>
          )}

          <h3 className="text-lg font-bold text-slate-700 mb-3">{title}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Location</label>
              <input
                type="text"
                value={location}
                onChange={(e) => onLocationChange(e.target.value)}
                onFocus={handleFocusSelect}
                className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg text-gray-900 font-semibold focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">{timeLabel}</label>
              <input
                type="time"
                value={time}
                onChange={(e) => onTimeChange(e.target.value)}
                onFocus={handleFocusSelect}
                className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg text-slate-700 font-bold text-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
              />
            </div>
          </div>

          {/* Show drive time at bottom for pickup */}
          {isPickup && showDriveTime && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-700">
                  <span className="font-semibold">{driveLabel}</span>{' '}
                  <span className="text-blue-600 font-bold">
                    {driveTime || '—'} {driveTime ? 'min' : ''}
                  </span>
                </div>
                {onCalculateDriveTime && (
                  <button
                    onClick={onCalculateDriveTime}
                    className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold text-sm transition-colors"
                  >
                    📍 Auto-Calculate
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};




