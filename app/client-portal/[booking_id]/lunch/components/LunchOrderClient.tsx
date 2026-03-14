'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import RestaurantSelector from './RestaurantSelector';
import MenuItemCard from './MenuItemCard';
import OrderSummary from './OrderSummary';
import SpecialRequests from './SpecialRequests';
import { submitLunchOrder } from '@/lib/actions/client-portal-lunch';
import type { RestaurantMenu, MenuItem } from '@/lib/menus';

interface Restaurant {
  id: number;
  name: string;
  cuisine_type: string | null;
  phone: string | null;
  email: string | null;
}

interface ItineraryStop {
  id: number;
  stop_order: number;
  arrival_time: string | null;
  departure_time: string | null;
}

interface Booking {
  id: number;
  tour_date: string;
  party_size: number;
}

interface OrderItemInstance {
  itemId: string;
  modifications: string[];
  name?: string;
}

interface Props {
  booking: Booking;
  restaurants: Restaurant[];
  itineraryStops: ItineraryStop[];
  restaurantMenus: Record<number, RestaurantMenu>;
  smartModificationsMap: Record<string, string[]>;
  bookingId: number;
}

export default function LunchOrderClient({
  booking,
  restaurants,
  itineraryStops,
  restaurantMenus,
  smartModificationsMap,
  bookingId,
}: Props) {
  const router = useRouter();

  const [selectedRestaurant, setSelectedRestaurant] = useState<number | null>(null);
  const [orderItems, setOrderItems] = useState<OrderItemInstance[]>([]);
  const [specialRequests, setSpecialRequests] = useState('');
  const [dietaryRestrictions, setDietaryRestrictions] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const currentMenu = selectedRestaurant ? restaurantMenus[selectedRestaurant] : null;
  const menuItems: MenuItem[] = currentMenu?.items || [];
  const categories: string[] = currentMenu?.categories || [];

  const handleAddItem = (itemId: string) => {
    setOrderItems((prev) => [...prev, { itemId, modifications: [], name: '' }]);
  };

  const handleRemoveItem = (instanceIndex: number) => {
    setOrderItems((prev) => prev.filter((_, idx) => idx !== instanceIndex));
  };

  const updateItemName = (instanceIndex: number, name: string) => {
    setOrderItems((prev) =>
      prev.map((item, idx) => (idx === instanceIndex ? { ...item, name } : item))
    );
  };

  const toggleModification = (instanceIndex: number, modification: string) => {
    setOrderItems((prev) =>
      prev.map((item, idx) => {
        if (idx !== instanceIndex) return item;
        const exists = item.modifications.includes(modification);
        return {
          ...item,
          modifications: exists
            ? item.modifications.filter((m) => m !== modification)
            : [...item.modifications, modification],
        };
      })
    );
  };

  const getItemInstances = (itemId: string) =>
    orderItems.map((item, index) => ({ ...item, index })).filter((item) => item.itemId === itemId);

  const handleSubmit = async () => {
    if (!selectedRestaurant) {
      alert('Please select a restaurant');
      return;
    }
    if (orderItems.length === 0) {
      alert('Please add items to your order');
      return;
    }

    setSubmitting(true);

    const items = orderItems.map((orderItem) => {
      const item = menuItems.find((m) => m.id === orderItem.itemId);
      return {
        id: orderItem.itemId,
        name: item?.name ?? orderItem.itemId,
        quantity: 1,
        price: item?.price ?? 0,
        modifications: orderItem.modifications.length > 0 ? orderItem.modifications.join(', ') : null,
        for_person: orderItem.name || null,
      };
    });

    const estimatedArrival =
      itineraryStops.find((s) => s.stop_order === 2)?.arrival_time ?? '12:00:00';

    const result = await submitLunchOrder({
      booking_id: bookingId,
      restaurant_id: selectedRestaurant,
      party_size: booking.party_size,
      items,
      special_requests: specialRequests,
      dietary_restrictions: dietaryRestrictions,
      estimated_arrival_time: estimatedArrival,
    });

    setSubmitting(false);

    if ('error' in result) {
      alert(result.error);
    } else {
      alert('Lunch order submitted for admin approval!');
      router.push(`/client-portal/${bookingId}`);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            🍽️ Order Your Lunch
          </h1>
          <p className="text-gray-600">
            Tour Date: {booking.tour_date} • Party Size: {booking.party_size}
          </p>
        </div>

        {/* Restaurant Selector */}
        <RestaurantSelector
          restaurants={restaurants.map((r) => ({
            ...r,
            cuisine_type: r.cuisine_type ?? '',
            phone: r.phone ?? '',
            email: r.email ?? '',
          }))}
          selectedRestaurant={selectedRestaurant}
          onSelect={setSelectedRestaurant}
        />

        {/* Menu */}
        {selectedRestaurant && (
          <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-900">Menu</h2>
            </div>

            {categories.map((category) => {
              const items = menuItems.filter((item) => item.category === category);
              return (
                <div key={category} className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-800 mb-3 border-b pb-2">
                    {category}
                  </h3>
                  <div className="space-y-4">
                    {items.map((item) => (
                      <MenuItemCard
                        key={item.id}
                        item={item}
                        instances={getItemInstances(item.id)}
                        smartModifications={smartModificationsMap[item.id] ?? []}
                        onAdd={() => handleAddItem(item.id)}
                        onRemove={handleRemoveItem}
                        onUpdateName={updateItemName}
                        onToggleModification={toggleModification}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Special Requests */}
        {selectedRestaurant && orderItems.length > 0 && (
          <SpecialRequests
            dietaryRestrictions={dietaryRestrictions}
            specialRequests={specialRequests}
            onDietaryRestrictionsChange={setDietaryRestrictions}
            onSpecialRequestsChange={setSpecialRequests}
          />
        )}

        {/* Order Summary */}
        <OrderSummary
          orderItems={orderItems}
          menuItems={menuItems}
          onSubmit={handleSubmit}
          submitting={submitting}
        />
      </div>
    </div>
  );
}
