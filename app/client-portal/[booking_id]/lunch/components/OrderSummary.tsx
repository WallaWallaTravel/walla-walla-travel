/**
 * Order Summary Component
 * Displays the complete order with pricing
 */

import { type MenuItem } from '@/lib/menus';

interface OrderItem {
  itemId: string;
  name?: string;
  modifications: string[];
}

interface OrderSummaryProps {
  orderItems: OrderItem[];
  menuItems: MenuItem[];
  onSubmit: () => void;
  submitting: boolean;
}

export default function OrderSummary({
  orderItems,
  menuItems,
  onSubmit,
  submitting,
}: OrderSummaryProps) {
  const calculateTotal = () => {
    return orderItems.reduce((total, orderItem) => {
      const item = menuItems.find(m => m.id === orderItem.itemId);
      return total + (item ? item.price : 0);
    }, 0);
  };

  if (orderItems.length === 0) {
    return null;
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
      <h2 className="text-xl font-bold text-gray-900 mb-4">Order Summary</h2>
      <div className="space-y-3 mb-4">
        {orderItems.map((orderItem, idx) => {
          const item = menuItems.find(m => m.id === orderItem.itemId);
          if (!item) return null;
          
          return (
            <div key={idx} className="border-b border-gray-100 pb-2">
              <div className="flex justify-between text-sm">
                <div className="flex-1">
                  <span className="text-gray-900 font-medium">
                    {item.name}
                  </span>
                  {orderItem.name && (
                    <span className="text-purple-600 text-xs ml-2">
                      (for {orderItem.name})
                    </span>
                  )}
                </div>
                <span className="font-semibold text-gray-900">
                  ${item.price.toFixed(2)}
                </span>
              </div>
              {orderItem.modifications.length > 0 && (
                <div className="text-xs text-purple-600 mt-1 ml-4">
                  • {orderItem.modifications.join(', ')}
                </div>
              )}
            </div>
          );
        })}
      </div>
      <div className="border-t pt-4">
        <div className="flex justify-between text-lg font-bold mb-4">
          <span className="text-gray-900">Total</span>
          <span className="text-purple-600">${calculateTotal().toFixed(2)}</span>
        </div>
        <button
          onClick={onSubmit}
          disabled={submitting}
          className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-6 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? 'Submitting...' : 'Submit Order'}
        </button>
      </div>
    </div>
  );
}

