import Link from 'next/link';
import type { EventCategory } from '@/lib/types/events';

interface CategoryGridProps {
  categories: EventCategory[];
}

const CATEGORY_ICONS: Record<string, string> = {
  wine: '\uD83C\uDF77',
  music: '\uD83C\uDFB5',
  food: '\uD83C\uDF7D\uFE0F',
  arts: '\uD83C\uDFA8',
  outdoor: '\uD83C\uDFDE\uFE0F',
  festival: '\uD83C\uDF89',
  community: '\uD83E\uDD1D',
  sports: '\u26BD',
  education: '\uD83D\uDCDA',
  family: '\uD83D\uDC68\u200D\uD83D\uDC69\u200D\uD83D\uDC67\u200D\uD83D\uDC66',
};

function getCategoryIcon(category: EventCategory): string {
  if (category.icon) return category.icon;
  if (CATEGORY_ICONS[category.slug]) return CATEGORY_ICONS[category.slug];
  return '\uD83D\uDCC5';
}

export function CategoryGrid({ categories }: CategoryGridProps) {
  const activeCategories = categories
    .filter((c) => c.is_active)
    .sort((a, b) => a.display_order - b.display_order);

  if (activeCategories.length === 0) return null;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {activeCategories.map((category) => (
        <Link
          key={category.id}
          href={`/events/category/${category.slug}`}
          className="group block"
        >
          <div className="rounded-xl border border-gray-200 bg-gray-50 hover:bg-white hover:shadow-md p-6 text-center transition-all duration-200 group-hover:scale-[1.02]">
            <span className="block text-4xl mb-3">{getCategoryIcon(category)}</span>
            <h3 className="text-lg font-semibold text-gray-900 group-hover:text-[#8B1538] transition-colors">
              {category.name}
            </h3>
            {category.description && (
              <p className="mt-1.5 text-sm text-gray-700 line-clamp-2">{category.description}</p>
            )}
          </div>
        </Link>
      ))}
    </div>
  );
}
