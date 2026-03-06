'use client';

import type { EventTag } from '@/lib/types/events';

interface TagSelectorProps {
  availableTags: EventTag[];
  selectedTagIds: number[];
  onChange: (tagIds: number[]) => void;
}

export function TagSelector({ availableTags, selectedTagIds, onChange }: TagSelectorProps) {
  const toggleTag = (tagId: number) => {
    if (selectedTagIds.includes(tagId)) {
      onChange(selectedTagIds.filter((id) => id !== tagId));
    } else {
      onChange([...selectedTagIds, tagId]);
    }
  };

  if (availableTags.length === 0) {
    return <p className="text-sm text-gray-600">No tags available</p>;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {availableTags.map((tag) => {
        const isSelected = selectedTagIds.includes(tag.id);
        return (
          <button
            key={tag.id}
            type="button"
            onClick={() => toggleTag(tag.id)}
            className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              isSelected
                ? 'bg-[#1E3A5F] text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {tag.name}
          </button>
        );
      })}
    </div>
  );
}
