/**
 * Modification Buttons Component
 * AI-powered smart modification suggestions
 */

interface ModificationButtonsProps {
  smartModifications: string[];
  selectedModifications: string[];
  onToggle: (modification: string) => void;
}

export default function ModificationButtons({
  smartModifications,
  selectedModifications,
  onToggle,
}: ModificationButtonsProps) {
  return (
    <div>
      <div className="text-xs font-semibold text-gray-500 mb-2">
        🤖 Customize:
      </div>
      <div className="flex flex-wrap gap-2">
        {smartModifications.map(mod => (
          <button
            key={mod}
            onClick={() => onToggle(mod)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
              selectedModifications.includes(mod)
                ? 'bg-purple-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
            }`}
          >
            {selectedModifications.includes(mod) ? '✓ ' : ''}{mod}
          </button>
        ))}
      </div>
    </div>
  );
}

