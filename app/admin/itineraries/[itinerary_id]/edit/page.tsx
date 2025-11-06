'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { SmartTimeInput } from '@/components/shared/form-inputs/SmartTimeInput';
import { SmartLocationInput } from '@/components/shared/form-inputs/SmartLocationInput';
import { WinerySelector } from '@/app/admin/proposals/new/winery-selector';
import type { Itinerary, ItineraryDay, ItineraryActivity, ActivityType } from '@/types/itinerary';

interface PageProps {
  params: Promise<{ itinerary_id: string }>;
}

export default function ItineraryBuilderPage({ params }: PageProps) {
  const router = useRouter();
  const [itineraryId, setItineraryId] = useState<string | null>(null);
  const [itinerary, setItinerary] = useState<Itinerary | null>(null);
  const [days, setDays] = useState<ItineraryDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [wineries, setWineries] = useState<Array<{ id: number; name: string; city: string }>>([]);

  // Unwrap params Promise
  useEffect(() => {
    params.then(p => setItineraryId(p.itinerary_id));
  }, [params]);

  // Load itinerary data
  useEffect(() => {
    if (!itineraryId) return;

    const loadData = async () => {
      try {
        const response = await fetch(`/api/itineraries/${itineraryId}`);
        if (!response.ok) throw new Error('Failed to load itinerary');
        
        const data = await response.json();
        setItinerary(data.itinerary);
        setDays(data.days || []);
      } catch (error) {
        console.error('Error loading itinerary:', error);
        alert('Failed to load itinerary');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [itineraryId]);

  // Load wineries
  useEffect(() => {
    const loadWineries = async () => {
      try {
        const response = await fetch('/api/wineries');
        if (!response.ok) throw new Error('Failed to load wineries');
        const data = await response.json();
        setWineries(data);
      } catch (error) {
        console.error('Error loading wineries:', error);
      }
    };

    loadWineries();
  }, []);

  const addDay = () => {
    if (!itinerary) return;

    const newDayNumber = days.length + 1;
    const startDate = new Date(itinerary.start_date);
    const newDate = new Date(startDate);
    newDate.setDate(startDate.getDate() + newDayNumber - 1);

    const newDay: ItineraryDay = {
      id: Date.now(), // Temporary ID
      itinerary_id: itinerary.id,
      day_number: newDayNumber,
      date: newDate.toISOString().split('T')[0],
      title: `Day ${newDayNumber}`,
      description: '',
      display_order: newDayNumber,
      activities: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    setDays([...days, newDay]);
  };

  const addActivity = (dayId: number, activityType: ActivityType) => {
    const dayIndex = days.findIndex(d => d.id === dayId);
    if (dayIndex === -1) return;

    const day = days[dayIndex];
    const activities = day.activities || [];

    const newActivity: ItineraryActivity = {
      id: Date.now(), // Temporary ID
      itinerary_day_id: dayId,
      activity_type: activityType,
      title: getActivityTitle(activityType),
      display_order: activities.length,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const updatedDays = [...days];
    updatedDays[dayIndex] = {
      ...day,
      activities: [...activities, newActivity]
    };

    setDays(updatedDays);
  };

  const updateActivity = (dayId: number, activityId: number, updates: Partial<ItineraryActivity>) => {
    const dayIndex = days.findIndex(d => d.id === dayId);
    if (dayIndex === -1) return;

    const day = days[dayIndex];
    const activityIndex = (day.activities || []).findIndex(a => a.id === activityId);
    if (activityIndex === -1) return;

    const updatedDays = [...days];
    const updatedActivities = [...(day.activities || [])];
    updatedActivities[activityIndex] = {
      ...updatedActivities[activityIndex],
      ...updates,
      updated_at: new Date().toISOString()
    };

    updatedDays[dayIndex] = {
      ...day,
      activities: updatedActivities
    };

    setDays(updatedDays);
  };

  const deleteActivity = (dayId: number, activityId: number) => {
    const dayIndex = days.findIndex(d => d.id === dayId);
    if (dayIndex === -1) return;

    const day = days[dayIndex];
    const updatedActivities = (day.activities || []).filter(a => a.id !== activityId);

    const updatedDays = [...days];
    updatedDays[dayIndex] = {
      ...day,
      activities: updatedActivities
    };

    setDays(updatedDays);
  };

  const getActivityTitle = (type: ActivityType): string => {
    const titles = {
      winery_visit: 'Winery Visit',
      transfer: 'Transfer',
      meal: 'Meal',
      accommodation: 'Accommodation',
      custom: 'Custom Activity'
    };
    return titles[type] || 'Activity';
  };

  const getActivityIcon = (type: ActivityType): string => {
    const icons = {
      winery_visit: '🍷',
      transfer: '🚐',
      meal: '🍽️',
      accommodation: '🏨',
      custom: '📍'
    };
    return icons[type] || '📍';
  };

  const saveItinerary = async () => {
    if (!itinerary || !itineraryId) return;

    setSaving(true);
    try {
      const response = await fetch(`/api/itineraries/${itineraryId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itinerary,
          days
        })
      });

      if (!response.ok) throw new Error('Failed to save itinerary');

      alert('Itinerary saved successfully!');
    } catch (error) {
      console.error('Error saving itinerary:', error);
      alert('Failed to save itinerary');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#8B1538] mx-auto mb-4"></div>
          <p className="text-gray-600">Loading itinerary...</p>
        </div>
      </div>
    );
  }

  if (!itinerary) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Itinerary not found</p>
          <Link href="/admin/itineraries" className="text-[#8B1538] hover:underline">
            ← Back to Itineraries
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-5xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <Link href="/admin/itineraries" className="text-[#8B1538] hover:underline mb-4 inline-block">
            ← Back to Itineraries
          </Link>
          
          <div className="bg-white rounded-lg border-2 border-gray-200 p-6">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">{itinerary.title}</h1>
            <div className="flex items-center gap-6 text-sm text-gray-600">
              <span>👤 {itinerary.client_name}</span>
              <span>👥 {itinerary.party_size} guests</span>
              <span>📅 {new Date(itinerary.start_date).toLocaleDateString()} - {new Date(itinerary.end_date).toLocaleDateString()}</span>
              <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium capitalize">
                {itinerary.status}
              </span>
            </div>
          </div>
        </div>

        {/* Days */}
        <div className="space-y-6">
          {days.map((day, dayIndex) => (
            <DayCard
              key={day.id}
              day={day}
              dayIndex={dayIndex}
              wineries={wineries}
              onAddActivity={addActivity}
              onUpdateActivity={updateActivity}
              onDeleteActivity={deleteActivity}
            />
          ))}
        </div>

        {/* Add Day Button */}
        <button
          onClick={addDay}
          className="w-full mt-6 py-4 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-[#8B1538] hover:text-[#8B1538] transition-colors font-medium"
        >
          + Add Day
        </button>

        {/* Save Button */}
        <div className="mt-8 flex justify-end gap-4">
          <button
            onClick={() => router.push('/admin/itineraries')}
            className="px-6 py-3 border-2 border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={saveItinerary}
            disabled={saving}
            className="px-6 py-3 bg-[#8B1538] text-white rounded-lg font-medium hover:bg-[#6B1028] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Saving...' : 'Save Itinerary'}
          </button>
        </div>
      </div>
    </div>
  );
}

// Day Card Component
interface DayCardProps {
  day: ItineraryDay;
  dayIndex: number;
  wineries: Array<{ id: number; name: string; city: string }>;
  onAddActivity: (dayId: number, activityType: ActivityType) => void;
  onUpdateActivity: (dayId: number, activityId: number, updates: Partial<ItineraryActivity>) => void;
  onDeleteActivity: (dayId: number, activityId: number) => void;
}

function DayCard({ day, dayIndex, wineries, onAddActivity, onUpdateActivity, onDeleteActivity }: DayCardProps) {
  const [showActivityMenu, setShowActivityMenu] = useState(false);

  const activityTypes: Array<{ type: ActivityType; icon: string; label: string }> = [
    { type: 'winery_visit', icon: '🍷', label: 'Winery Visit' },
    { type: 'transfer', icon: '🚐', label: 'Transfer' },
    { type: 'meal', icon: '🍽️', label: 'Meal' },
    { type: 'accommodation', icon: '🏨', label: 'Accommodation' },
    { type: 'custom', icon: '📍', label: 'Custom Activity' }
  ];

  return (
    <div className="bg-white rounded-lg border-2 border-gray-200 p-6">
      {/* Day Header */}
      <div className="mb-4">
        <h2 className="text-2xl font-bold text-gray-900 mb-1">
          📅 Day {day.day_number} - {new Date(day.date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
        </h2>
        {day.title && day.title !== `Day ${day.day_number}` && (
          <p className="text-gray-600">{day.title}</p>
        )}
      </div>

      {/* Activities */}
      <div className="space-y-3">
        {(day.activities || []).map((activity) => (
          <ActivityCard
            key={activity.id}
            activity={activity}
            dayId={day.id}
            wineries={wineries}
            onUpdate={onUpdateActivity}
            onDelete={onDeleteActivity}
          />
        ))}
      </div>

      {/* Add Activity Button */}
      <div className="mt-4 relative">
        <button
          onClick={() => setShowActivityMenu(!showActivityMenu)}
          className="w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-[#8B1538] hover:text-[#8B1538] transition-colors font-medium text-sm"
        >
          + Add Activity
        </button>

        {showActivityMenu && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-white border-2 border-gray-200 rounded-lg shadow-lg z-10">
            {activityTypes.map((type) => (
              <button
                key={type.type}
                onClick={() => {
                  onAddActivity(day.id, type.type);
                  setShowActivityMenu(false);
                }}
                className="w-full text-left px-4 py-3 hover:bg-[#FDF2F4] transition-colors flex items-center gap-3"
              >
                <span className="text-2xl">{type.icon}</span>
                <span className="font-medium text-gray-900">{type.label}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Activity Card Component
interface ActivityCardProps {
  activity: ItineraryActivity;
  dayId: number;
  wineries: Array<{ id: number; name: string; city: string }>;
  onUpdate: (dayId: number, activityId: number, updates: Partial<ItineraryActivity>) => void;
  onDelete: (dayId: number, activityId: number) => void;
}

function ActivityCard({ activity, dayId, wineries, onUpdate, onDelete }: ActivityCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const getActivityIcon = (type: ActivityType): string => {
    const icons = {
      winery_visit: '🍷',
      transfer: '🚐',
      meal: '🍽️',
      accommodation: '🏨',
      custom: '📍'
    };
    return icons[type] || '📍';
  };

  return (
    <div className="border-2 border-gray-200 rounded-lg p-4">
      {/* Activity Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-start gap-3 flex-1">
          <span className="text-2xl">{getActivityIcon(activity.activity_type)}</span>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              {activity.start_time && (
                <span className="text-sm font-bold text-gray-900">
                  {activity.start_time.slice(0, 5)}
                </span>
              )}
              <h3 className="text-lg font-bold text-gray-900">{activity.title}</h3>
            </div>
            {activity.description && (
              <p className="text-sm text-gray-600 mt-1">{activity.description}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-sm text-[#8B1538] hover:underline font-medium"
          >
            {isExpanded ? 'Collapse' : 'Edit'}
          </button>
          <button
            onClick={() => onDelete(dayId, activity.id)}
            className="text-sm text-red-600 hover:underline font-medium"
          >
            Delete
          </button>
        </div>
      </div>

      {/* Expanded Edit Form */}
      {isExpanded && (
        <div className="mt-4 pt-4 border-t-2 border-gray-200 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <SmartTimeInput
              value={activity.start_time || ''}
              onChange={(time) => onUpdate(dayId, activity.id, { start_time: time })}
              label="Start Time"
              serviceType="custom"
            />

            <div>
              <label className="block text-sm font-bold text-gray-900 mb-2">Duration (minutes)</label>
              <input
                type="number"
                min="0"
                step="15"
                value={activity.duration_minutes || ''}
                onChange={(e) => onUpdate(dayId, activity.id, { duration_minutes: parseInt(e.target.value) || undefined })}
                className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-[#8B1538] focus:ring-4 focus:ring-[#FDF2F4]"
              />
            </div>
          </div>

          {activity.activity_type === 'winery_visit' && (
            <div>
              <label className="block text-sm font-bold text-gray-900 mb-2">Winery</label>
              <select
                value={activity.winery_id || ''}
                onChange={(e) => onUpdate(dayId, activity.id, { winery_id: parseInt(e.target.value) || undefined })}
                className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-[#8B1538] focus:ring-4 focus:ring-[#FDF2F4]"
              >
                <option value="">Select a winery...</option>
                {wineries.map((winery) => (
                  <option key={winery.id} value={winery.id}>
                    {winery.name} - {winery.city}
                  </option>
                ))}
              </select>
            </div>
          )}

          {activity.activity_type === 'transfer' && (
            <div className="grid grid-cols-2 gap-4">
              <SmartLocationInput
                value={activity.pickup_location || ''}
                onChange={(location) => onUpdate(dayId, activity.id, { pickup_location: location })}
                label="Pickup Location"
              />

              <SmartLocationInput
                value={activity.dropoff_location || ''}
                onChange={(location) => onUpdate(dayId, activity.id, { dropoff_location: location })}
                label="Dropoff Location"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-bold text-gray-900 mb-2">Notes</label>
            <textarea
              value={activity.notes || ''}
              onChange={(e) => onUpdate(dayId, activity.id, { notes: e.target.value })}
              rows={2}
              className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-[#8B1538] focus:ring-4 focus:ring-[#FDF2F4]"
              placeholder="Add any notes or special instructions..."
            />
          </div>
        </div>
      )}
    </div>
  );
}

