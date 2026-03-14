'use server';

import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const OrderItemSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(255),
  quantity: z.number().int().positive(),
  price: z.number().nonnegative(),
  modifications: z.string().max(500).nullable().optional(),
  for_person: z.string().max(255).nullable().optional(),
});

const SubmitOrderSchema = z.object({
  booking_id: z.number().int().positive(),
  restaurant_id: z.number().int().positive(),
  party_size: z.number().int().positive(),
  items: z.array(OrderItemSchema).min(1),
  special_requests: z.string().max(2000).optional(),
  dietary_restrictions: z.string().max(1000).optional(),
  estimated_arrival_time: z.string().min(1).max(50),
});

type SubmitOrderInput = z.infer<typeof SubmitOrderSchema>;
type SubmitOrderResult = { error: string } | { success: true; orderId: number };

interface RestaurantRow {
  name: string;
  email: string;
  phone: string;
  contact_name: string | null;
}

interface BookingRow {
  customer_name: string;
  customer_email: string;
  tour_date: string;
}

interface OrderItemRow {
  id: string;
  name: string;
  quantity: number;
  price: number;
  modifications?: string | null;
  for_person?: string | null;
}

interface InsertResult {
  id: number;
}

export async function submitLunchOrder(input: SubmitOrderInput): Promise<SubmitOrderResult> {
  const parsed = SubmitOrderSchema.safeParse(input);
  if (!parsed.success) {
    return { error: 'Invalid order data. Please check your selections.' };
  }

  const {
    booking_id,
    restaurant_id,
    party_size,
    items,
    special_requests,
    dietary_restrictions,
    estimated_arrival_time,
  } = parsed.data;

  // Calculate totals
  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const tax = subtotal * 0.091; // 9.1% Walla Walla rate
  const total = subtotal + tax;

  try {
    // Get restaurant details
    const restaurantRows = await prisma.$queryRawUnsafe<RestaurantRow[]>(
      'SELECT name, email, phone, contact_name FROM restaurants WHERE id = $1',
      restaurant_id
    );
    if (!restaurantRows[0]) {
      return { error: 'Restaurant not found.' };
    }
    const restaurant = restaurantRows[0];

    // Get booking details
    const bookingRows = await prisma.$queryRawUnsafe<BookingRow[]>(
      'SELECT customer_name, customer_email, tour_date FROM bookings WHERE id = $1',
      booking_id
    );
    if (!bookingRows[0]) {
      return { error: 'Booking not found.' };
    }
    const booking = bookingRows[0];

    const emailBody = buildOrderEmail({
      booking,
      restaurant,
      items: items as OrderItemRow[],
      party_size,
      subtotal,
      tax,
      total,
      special_requests,
      dietary_restrictions,
      estimated_arrival_time,
    });

    const insertRows = await prisma.$queryRawUnsafe<InsertResult[]>(
      `INSERT INTO lunch_orders (
        booking_id,
        restaurant_id,
        customer_id,
        order_items,
        subtotal,
        tax,
        total,
        estimated_arrival_time,
        requested_ready_time,
        dietary_restrictions,
        special_instructions,
        status,
        email_body,
        created_at,
        updated_at
      ) VALUES ($1, $2,
        (SELECT id FROM customers WHERE email = $3 LIMIT 1),
        $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW(), NOW()
      ) RETURNING id`,
      booking_id,
      restaurant_id,
      booking.customer_email,
      JSON.stringify(items),
      subtotal,
      tax,
      total,
      estimated_arrival_time,
      estimated_arrival_time,
      dietary_restrictions || null,
      special_requests || null,
      'pending_approval',
      emailBody
    );

    return { success: true, orderId: insertRows[0].id };
  } catch {
    return { error: 'Failed to submit order. Please try again.' };
  }
}

function buildOrderEmail(data: {
  booking: BookingRow;
  restaurant: RestaurantRow;
  items: OrderItemRow[];
  party_size: number;
  subtotal: number;
  tax: number;
  total: number;
  special_requests?: string;
  dietary_restrictions?: string;
  estimated_arrival_time: string;
}): string {
  const { booking, restaurant, items, party_size, subtotal, tax, total, special_requests, dietary_restrictions, estimated_arrival_time } = data;

  let email = `
LUNCH ORDER REQUEST
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CUSTOMER INFORMATION:
  Name: ${booking.customer_name}
  Email: ${booking.customer_email}
  Tour Date: ${booking.tour_date}
  Party Size: ${party_size}
  Estimated Arrival: ${estimated_arrival_time}

RESTAURANT:
  ${restaurant.name}
  ${restaurant.phone || ''}
  ${restaurant.email || ''}
  ${restaurant.contact_name ? `Contact: ${restaurant.contact_name}` : ''}

ORDER DETAILS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`;

  items.forEach((item) => {
    email += `  ${item.quantity}x ${item.name} @ $${item.price.toFixed(2)} = $${(item.quantity * item.price).toFixed(2)}`;
    if (item.for_person) email += ` (for ${item.for_person})`;
    if (item.modifications) email += `\n     Modifications: ${item.modifications}`;
    email += '\n';
  });

  email += `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Subtotal: $${subtotal.toFixed(2)}
  Tax (9.1%): $${tax.toFixed(2)}
  TOTAL: $${total.toFixed(2)}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`;

  if (dietary_restrictions) {
    email += `\nDIETARY RESTRICTIONS / ALLERGIES:\n  ${dietary_restrictions}\n`;
  }
  if (special_requests) {
    email += `\nSPECIAL REQUESTS:\n  ${special_requests}\n`;
  }

  email += `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

TO APPROVE AND SEND:
1. Review order details above
2. Click "Approve & Send to Restaurant"
3. Email will be sent to ${restaurant.email}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`;

  return email;
}
