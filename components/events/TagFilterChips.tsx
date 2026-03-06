import Link from 'next/link';
import type { EventTag } from '@/lib/types/events';

interface TagFilterChipsProps {
  tags: EventTag[];
  activeTags?: string;
}

export function TagFilterChips({ tags, activeTags }: TagFilterChipsProps) {
  const activeTagSlugs = activeTags ? activeTags.split(',').map(t => t.trim()) : [];

  return (
    <div className="flex flex-wrap gap-2 items-center">
      <span className="text-sm font-medium text-gray-700 mr-1">Filter:</span>
      {tags.map((tag) => {
        const isActive = activeTagSlugs.includes(tag.slug);

        // Build the new tags param
        let newTags: string;
        if (isActive) {
          // Remove this tag
          newTags = activeTagSlugs.filter(s => s !== tag.slug).join(',');
        } else {
          // Add this tag
          newTags = [...activeTagSlugs, tag.slug].join(',');
        }

        const href = newTags ? `/events?tags=${newTags}` : '/events';

        return (
          <Link
            key={tag.id}
            href={href}
            className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              isActive
                ? 'bg-[#8B1538] text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {tag.name}
          </Link>
        );
      })}
      {activeTagSlugs.length > 0 && (
        <Link
          href="/events"
          className="text-sm text-[#8B1538] hover:underline ml-2"
        >
          Clear tags
        </Link>
      )}
    </div>
  );
}
