/**
 * Restaurant Selector Component
 * Displays available restaurants for lunch ordering
 */

interface Restaurant {
  id: number;
  name: string;
  cuisine_type: string;
  phone: string;
  email: string;
}

interface RestaurantSelectorProps {
  restaurants: Restaurant[];
  selectedRestaurant: number | null;
  onSelect: (restaurantId: number) => void;
}

export default function RestaurantSelector({
  restaurants,
  selectedRestaurant,
  onSelect,
}: RestaurantSelectorProps) {
  return (
    <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
      <h2 className="text-xl font-bold text-gray-900 mb-4">Select Restaurant</h2>
      <div className="space-y-3">
        {restaurants.map(restaurant => (
          <button
            key={restaurant.id}
            onClick={() => onSelect(restaurant.id)}
            className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
              selectedRestaurant === restaurant.id
                ? 'border-purple-600 bg-purple-50'
                : 'border-gray-200 hover:border-purple-300'
            }`}
          >
            <div className="font-semibold text-gray-900">{restaurant.name}</div>
            <div className="text-sm text-gray-600">{restaurant.cuisine_type}</div>
            <div className="text-xs text-gray-500 mt-1">{restaurant.phone}</div>
          </button>
        ))}
      </div>
    </div>
  );
}

