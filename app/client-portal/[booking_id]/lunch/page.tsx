'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getAllMenus } from '@/lib/menus';
import { getSmartModifications } from '@/lib/ai-modifications';
import RestaurantSelector from './components/RestaurantSelector';
import MenuItemCard from './components/MenuItemCard';
import OrderSummary from './components/OrderSummary';
import SpecialRequests from './components/SpecialRequests';

interface Restaurant {
  id: number;
  name: string;
  cuisine_type: string;
  phone: string;
  email: string;
}

interface ItineraryStop {
  id: number;
  winery_name: string;
  arrival_time: string;
  departure_time: string;
  stop_order: number;
}

interface OrderItemInstance {
  itemId: string;
  modifications: string[];
  name?: string;
}

interface Booking {
  id: number;
  tour_date: string;
  party_size: number;
}

export default function LunchOrderPage() {
  const params = useParams();
  const router = useRouter();
  const booking_id = params.booking_id as string;

  // State
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState<Booking | null>(null);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [selectedRestaurant, setSelectedRestaurant] = useState<number | null>(null);
  const [itinerary, setItinerary] = useState<ItineraryStop[]>([]);
  const [orderItems, setOrderItems] = useState<OrderItemInstance[]>([]);
  const [specialRequests, setSpecialRequests] = useState('');
  const [dietaryRestrictions, setDietaryRestrictions] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Load menus
  const restaurantMenus = getAllMenus();
  const currentMenu = selectedRestaurant ? restaurantMenus[selectedRestaurant] : null;
  const menuItems = currentMenu?.items || [];
  const categories = currentMenu?.categories || [];

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [booking_id]);

  const loadData = async () => {
    try {
      const [bookingRes, restaurantsRes, itineraryRes] = await Promise.all([
        fetch(`/api/bookings/${booking_id}`),
        fetch('/api/restaurants'),
        fetch(`/api/itinerary/${booking_id}`)
      ]);

      if (bookingRes.ok) setBooking(await bookingRes.json());
      if (restaurantsRes.ok) setRestaurants(await restaurantsRes.json());
      if (itineraryRes.ok) setItinerary(await itineraryRes.json());
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Order management
  const handleAddItem = (itemId: string) => {
    setOrderItems(prev => [...prev, { itemId, modifications: [], name: '' }]);
  };

  const handleRemoveItem = (instanceIndex: number) => {
    setOrderItems(prev => prev.filter((_, idx) => idx !== instanceIndex));
  };

  const updateItemName = (instanceIndex: number, name: string) => {
    setOrderItems(prev => prev.map((item, idx) => 
      idx === instanceIndex ? { ...item, name } : item
    ));
  };

  const toggleModification = (instanceIndex: number, modification: string) => {
    setOrderItems(prev => prev.map((item, idx) => {
      if (idx !== instanceIndex) return item;
      const exists = item.modifications.includes(modification);
      return {
        ...item,
        modifications: exists
          ? item.modifications.filter(m => m !== modification)
          : [...item.modifications, modification]
      };
    }));
  };

  const getItemInstances = (itemId: string) => {
    return orderItems
      .map((item, index) => ({ ...item, index }))
      .filter(item => item.itemId === itemId);
  };

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

    try {
      const items = orderItems.map(orderItem => {
        const item = menuItems.find(m => m.id === orderItem.itemId);
        return {
          id: orderItem.itemId,
          name: item?.name,
          quantity: 1,
          price: item?.price,
          modifications: orderItem.modifications.length > 0 ? orderItem.modifications.join(', ') : null,
          for_person: orderItem.name || null,
        };
      });

      const orderData = {
        booking_id: parseInt(booking_id),
        restaurant_id: selectedRestaurant,
        party_size: booking?.party_size || 0,
        items,
        special_requests: specialRequests,
        dietary_restrictions: dietaryRestrictions,
        estimated_arrival_time: itinerary.find(s => s.stop_order === 2)?.arrival_time || '12:00:00',
      };

      const response = await fetch('/api/client-portal/lunch-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData),
      });

      if (response.ok) {
        alert('Lunch order submitted for admin approval!');
        router.push(`/client-portal/${booking_id}`);
      } else {
        throw new Error('Failed to submit order');
      }
    } catch (error) {
      console.error('Error submitting order:', error);
      alert('Failed to submit order. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading menu...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            🍽️ Order Your Lunch
          </h1>
          <p className="text-gray-600">
            Tour Date: {booking?.tour_date} • Party Size: {booking?.party_size}
          </p>
        </div>

        {/* Restaurant Selector */}
        <RestaurantSelector
          restaurants={restaurants}
          selectedRestaurant={selectedRestaurant}
          onSelect={setSelectedRestaurant}
        />

        {/* Menu */}
        {selectedRestaurant && (
          <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-900">Menu</h2>
            </div>

            {categories.map(category => {
              const items = menuItems.filter(item => item.category === category);
              return (
                <div key={category} className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-800 mb-3 border-b pb-2">
                    {category}
                  </h3>
                  <div className="space-y-4">
                    {items.map(item => (
                      <MenuItemCard
                        key={item.id}
                        item={item}
                        instances={getItemInstances(item.id)}
                        smartModifications={getSmartModifications(item)}
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

