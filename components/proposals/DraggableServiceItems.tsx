'use client';

import { useState } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { formatCurrency } from '@/lib/rate-config';

interface Winery {
  id: number;
  name: string;
  city: string;
}

interface SelectedWinery extends Winery {
  display_order: number;
}

interface ServiceItem {
  id: string;
  service_type: string;
  name: string;
  description: string;
  date: string;
  start_time: string;
  party_size: number;
  calculated_price: number;
  duration_hours?: 4 | 6 | 8;
  selected_wineries?: SelectedWinery[];
  wait_hours?: number;
  hourly_rate?: number;
  [key: string]: string | number | boolean | SelectedWinery[] | undefined;
}

interface DraggableServiceItemsProps {
  items: ServiceItem[];
  wineries: Winery[];
  onReorder: (items: ServiceItem[]) => void;
  onUpdate: (id: string, updates: Partial<ServiceItem>) => void;
  onRemove: (id: string) => void;
}

export function DraggableServiceItems({
  items,
  wineries,
  onReorder,
  onUpdate,
  onRemove
}: DraggableServiceItemsProps) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = items.findIndex((item) => item.id === active.id);
      const newIndex = items.findIndex((item) => item.id === over.id);

      const reordered = arrayMove(items, oldIndex, newIndex);
      onReorder(reordered);
    }
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={items.map(item => item.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="space-y-4">
          {items.map((item, index) => (
            <SortableServiceItem
              key={item.id}
              item={item}
              index={index}
              wineries={wineries}
              onUpdate={onUpdate}
              onRemove={onRemove}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}

interface SortableServiceItemProps {
  item: ServiceItem;
  index: number;
  wineries: Winery[];
  onUpdate: (id: string, updates: Partial<ServiceItem>) => void;
  onRemove: (id: string) => void;
}

function SortableServiceItem({
  item,
  index,
  wineries,
  onUpdate,
  onRemove
}: SortableServiceItemProps) {
  const [expanded, setExpanded] = useState(true);
  
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="border-2 border-gray-200 rounded-lg overflow-hidden bg-white"
    >
      {/* Header with drag handle */}
      <div className="bg-[#FDF2F4] p-4 flex items-center justify-between">
        <div className="flex items-center gap-3 flex-1">
          {/* Drag Handle */}
          <button
            type="button"
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600 p-1"
            title="Drag to reorder"
          >
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
              <path d="M7 2a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 2zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 8zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 14zm6-8a2 2 0 1 0-.001-4.001A2 2 0 0 0 13 6zm0 2a2 2 0 1 0 .001 4.001A2 2 0 0 0 13 8zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 13 14z"></path>
            </svg>
          </button>

          {/* Expand/Collapse */}
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="text-gray-600 hover:text-gray-900"
          >
            {expanded ? '▼' : '▶'}
          </button>

          {/* Service Info */}
          <div className="flex-1">
            <div className="font-bold text-gray-900">
              Service #{index + 1}: {item.name}
            </div>
            <div className="text-sm text-gray-600">
              {item.date || 'No date set'} • {item.party_size} guests • {formatCurrency(item.calculated_price)}
            </div>
          </div>
        </div>

        {/* Remove Button */}
        <button
          type="button"
          onClick={() => onRemove(item.id)}
          className="px-3 py-1 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg text-sm font-bold transition-colors"
        >
          Remove
        </button>
      </div>

      {/* Expanded Content */}
      {expanded && (
        <div className="p-4 space-y-4">
          {/* Basic Info */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-gray-900 mb-2">Date *</label>
              <input
                type="date"
                value={item.date}
                onChange={(e) => onUpdate(item.id, { date: e.target.value })}
                className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-[#8B1538] focus:ring-4 focus:ring-[#FDF2F4]"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-900 mb-2">Start Time</label>
              <input
                type="time"
                value={item.start_time}
                onChange={(e) => onUpdate(item.id, { start_time: e.target.value })}
                className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-[#8B1538] focus:ring-4 focus:ring-[#FDF2F4]"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-900 mb-2">Party Size *</label>
            <input
              type="number"
              min="1"
              max="14"
              value={item.party_size}
              onChange={(e) => onUpdate(item.id, { party_size: parseInt(e.target.value) })}
              onFocus={(e) => e.target.select()}
              className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-[#8B1538] focus:ring-4 focus:ring-[#FDF2F4]"
              required
            />
          </div>

          {/* Wine Tour Specific */}
          {item.service_type === 'wine_tour' && (
            <>
              <div>
                <label className="block text-sm font-bold text-gray-900 mb-2">Duration</label>
                <select
                  value={item.duration_hours}
                  onChange={(e) => onUpdate(item.id, { duration_hours: parseInt(e.target.value) as 4 | 6 | 8 })}
                  className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-[#8B1538] focus:ring-4 focus:ring-[#FDF2F4]"
                >
                  <option value={4}>4 hours</option>
                  <option value={6}>6 hours</option>
                  <option value={8}>8 hours</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-900 mb-2">
                  Wineries ({item.selected_wineries?.length || 0} selected)
                </label>
                <DraggableWineryList
                  selectedWineries={item.selected_wineries || []}
                  allWineries={wineries}
                  onUpdate={(wineries) => onUpdate(item.id, { selected_wineries: wineries })}
                />
              </div>
            </>
          )}

          {/* Wait Time Specific */}
          {item.service_type === 'wait_time' && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-gray-900 mb-2">Hours</label>
                <input
                  type="number"
                  min="0.5"
                  step="0.5"
                  value={item.wait_hours}
                  onChange={(e) => onUpdate(item.id, { wait_hours: parseFloat(e.target.value) })}
                  onFocus={(e) => e.target.select()}
                  className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-[#8B1538] focus:ring-4 focus:ring-[#FDF2F4]"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-900 mb-2">Hourly Rate</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600 font-bold">$</span>
                  <input
                    type="number"
                    value={item.hourly_rate}
                    onChange={(e) => onUpdate(item.id, { hourly_rate: parseFloat(e.target.value) })}
                    onFocus={(e) => e.target.select()}
                    className="w-full pl-8 pr-3 py-2 border-2 border-gray-300 rounded-lg focus:border-[#8B1538] focus:ring-4 focus:ring-[#FDF2F4]"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Description */}
          <div>
            <label className="block text-sm font-bold text-gray-900 mb-2">Description (Optional)</label>
            <textarea
              value={item.description}
              onChange={(e) => onUpdate(item.id, { description: e.target.value })}
              rows={2}
              placeholder="Add any notes about this service..."
              className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-[#8B1538] focus:ring-4 focus:ring-[#FDF2F4]"
            />
          </div>

          {/* Price Display */}
          <div className="bg-[#FAF6ED] rounded-lg p-3 border-2 border-[#D4AF37]">
            <div className="flex items-center justify-between">
              <span className="font-bold text-gray-900">Service Price:</span>
              <span className="text-2xl font-bold text-[#8B1538]">{formatCurrency(item.calculated_price)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Draggable Winery List Component
interface DraggableWineryListProps {
  selectedWineries: SelectedWinery[];
  allWineries: Winery[];
  onUpdate: (wineries: SelectedWinery[]) => void;
}

function DraggableWineryList({ selectedWineries, allWineries, onUpdate }: DraggableWineryListProps) {
  const [showPicker, setShowPicker] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = selectedWineries.findIndex((w) => w.id === active.id);
      const newIndex = selectedWineries.findIndex((w) => w.id === over.id);

      const reordered = arrayMove(selectedWineries, oldIndex, newIndex).map((w, idx) => ({
        ...w,
        display_order: idx
      }));
      onUpdate(reordered);
    }
  };

  const addWinery = (winery: Winery) => {
    const newWinery: SelectedWinery = {
      id: winery.id,
      name: winery.name,
      city: winery.city,
      display_order: selectedWineries.length
    };
    onUpdate([...selectedWineries, newWinery]);
    setShowPicker(false);
  };

  const removeWinery = (wineryId: number) => {
    onUpdate(selectedWineries.filter(w => w.id !== wineryId));
  };

  return (
    <div>
      {/* Selected Wineries */}
      {selectedWineries.length > 0 && (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={selectedWineries.map(w => w.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-2 mb-3">
              {selectedWineries.map((winery, index) => (
                <SortableWineryItem
                  key={winery.id}
                  winery={winery}
                  index={index}
                  onRemove={removeWinery}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {/* Add Winery Button */}
      <button
        type="button"
        onClick={() => setShowPicker(!showPicker)}
        className="w-full px-4 py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-[#8B1538] hover:text-[#8B1538] transition-colors"
      >
        + Add Winery
      </button>

      {/* Winery Picker */}
      {showPicker && (
        <div className="mt-2 max-h-60 overflow-y-auto border-2 border-gray-300 rounded-lg p-2 bg-white">
          {allWineries
            .filter(w => !selectedWineries.some(sw => sw.id === w.id))
            .map((winery) => (
              <button
                key={winery.id}
                type="button"
                onClick={() => addWinery(winery)}
                className="w-full text-left p-2 hover:bg-gray-50 rounded text-sm"
              >
                <div className="font-bold">{winery.name}</div>
                <div className="text-xs text-gray-600">{winery.city}</div>
              </button>
            ))}
        </div>
      )}
    </div>
  );
}

interface SortableWineryItemProps {
  winery: SelectedWinery;
  index: number;
  onRemove: (wineryId: number) => void;
}

function SortableWineryItem({ winery, index, onRemove }: SortableWineryItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: winery.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg border border-gray-200"
    >
      {/* Drag Handle */}
      <button
        type="button"
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600"
        title="Drag to reorder"
      >
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path d="M7 2a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 2zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 8zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 14zm6-8a2 2 0 1 0-.001-4.001A2 2 0 0 0 13 6zm0 2a2 2 0 1 0 .001 4.001A2 2 0 0 0 13 8zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 13 14z"></path>
        </svg>
      </button>

      {/* Order Number */}
      <span className="text-sm font-bold text-gray-500 w-6">{index + 1}.</span>

      {/* Winery Info */}
      <div className="flex-1">
        <div className="text-sm font-bold text-gray-900">{winery.name}</div>
        <div className="text-xs text-gray-600">{winery.city}</div>
      </div>

      {/* Remove Button */}
      <button
        type="button"
        onClick={() => onRemove(winery.id)}
        className="text-red-600 hover:text-red-800 p-1"
        title="Remove winery"
      >
        ×
      </button>
    </div>
  );
}

