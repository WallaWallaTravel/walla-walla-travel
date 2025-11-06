/**
 * Special Requests Component
 * Dietary restrictions and additional instructions
 */

interface SpecialRequestsProps {
  dietaryRestrictions: string;
  specialRequests: string;
  onDietaryRestrictionsChange: (value: string) => void;
  onSpecialRequestsChange: (value: string) => void;
}

export default function SpecialRequests({
  dietaryRestrictions,
  specialRequests,
  onDietaryRestrictionsChange,
  onSpecialRequestsChange,
}: SpecialRequestsProps) {
  return (
    <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
      <h2 className="text-xl font-bold text-gray-900 mb-4">Special Requests</h2>
      
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Dietary Restrictions / Allergies
        </label>
        <input
          type="text"
          value={dietaryRestrictions}
          onChange={(e) => onDietaryRestrictionsChange(e.target.value)}
          placeholder="e.g., Gluten-free, Nut allergy, Vegetarian"
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent placeholder:text-gray-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Additional Instructions
        </label>
        <textarea
          value={specialRequests}
          onChange={(e) => onSpecialRequestsChange(e.target.value)}
          placeholder="Any special requests or modifications..."
          rows={3}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent placeholder:text-gray-500"
        />
      </div>
    </div>
  );
}

