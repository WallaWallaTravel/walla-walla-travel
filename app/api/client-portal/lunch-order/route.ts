import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandling, BadRequestError } from '@/lib/api-errors';
import { prisma } from '@/lib/prisma';

import { z } from 'zod';

const OrderItemSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(255),
  quantity: z.number().int().positive(),
  price: z.number().nonnegative(),
  modifications: z.string().max(500).optional(),
  for_person: z.string().max(255).optional(),
});

const BodySchema = z.object({
  booking_id: z.number().int().positive(),
  restaurant_id: z.number().int().positive(),
  party_size: z.number().int().positive(),
  items: z.array(OrderItemSchema).min(1),
  special_requests: z.string().max(2000).optional(),
  dietary_restrictions: z.string().max(1000).optional(),
  estimated_arrival_time: z.string().min(1).max(50),
});

interface Restaurant {
  name: string;
  email: string;
  phone: string;
  contact_name?: string;
}

interface Booking {
  customer_name: string;
  customer_email: string;
  tour_date: string;
}

interface OrderItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
  modifications?: string;
  for_person?: string;
}

interface LunchOrderRequest {
  booking_id: number;
  restaurant_id: number;
  party_size: number;
  items: OrderItem[];
  special_requests?: string;
  dietary_restrictions?: string;
  estimated_arrival_time: string;
}

export const POST =
  withErrorHandling(async (request: NextRequest) => {
  const body: LunchOrderRequest = BodySchema.parse(await request.json());
  const {
    booking_id,
    restaurant_id,
    party_size,
    items,
    special_requests,
    dietary_restrictions,
    estimated_arrival_time,
  } = body;

  // Validate required fields
  if (!booking_id || !restaurant_id || !items || items.length === 0) {
    throw new BadRequestError('Missing required fields: booking_id, restaurant_id, and items are required');
  }

  // Calculate totals
  const subtotal = items.reduce((sum: number, item: OrderItem) => {
    return sum + (item.price * item.quantity);
  }, 0);

  const tax = subtotal * 0.091; // 9.1% WA state + local tax
  const total = subtotal + tax;

  // Get restaurant details for email
  const restaurantRows = await prisma.$queryRaw<Restaurant[]>`
    SELECT name, email, phone, contact_name FROM restaurants WHERE id = ${restaurant_id}`;

  if (restaurantRows.length === 0) {
    throw new BadRequestError('Restaurant not found');
  }
  const restaurant = restaurantRows[0];

  // Get booking details
  const bookingRows = await prisma.$queryRaw<Booking[]>`
    SELECT customer_name, customer_email, tour_date FROM bookings WHERE id = ${booking_id}`;

  if (bookingRows.length === 0) {
    throw new BadRequestError('Booking not found');
  }
  const booking = bookingRows[0];

  // Generate email body for admin approval
  const emailBody = generateOrderEmail({
    booking,
    restaurant,
    items,
    party_size,
    subtotal,
    tax,
    total,
    special_requests,
    dietary_restrictions,
    estimated_arrival_time,
  });

  // Insert lunch order
  const itemsJson = JSON.stringify(items);
  const dietaryVal = dietary_restrictions || null;
  const specialVal = special_requests || null;
  const statusVal = 'pending_approval';

  const insertResult = await prisma.$queryRaw<{ id: number }[]>`
    INSERT INTO lunch_orders (
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
    ) VALUES (${booking_id}, ${restaurant_id},
      (SELECT id FROM customers WHERE email = ${booking.customer_email} LIMIT 1),
      ${itemsJson}::jsonb, ${subtotal}, ${tax}, ${total}, ${estimated_arrival_time}, ${estimated_arrival_time}, ${dietaryVal}, ${specialVal}, ${statusVal}, ${emailBody}, NOW(), NOW()
    ) RETURNING id`;

  const result = insertResult[0];

  return NextResponse.json({
    success: true,
    order_id: result.id,
    message: 'Lunch order submitted for admin approval',
  });
});

function generateOrderEmail(data: {
  booking: Booking;
  restaurant: Restaurant;
  items: OrderItem[];
  party_size: number;
  subtotal: number;
  tax: number;
  total: number;
  special_requests?: string;
  dietary_restrictions?: string;
  estimated_arrival_time: string;
}): string {
  const {
    booking,
    restaurant,
    items,
    party_size,
    subtotal,
    tax,
    total,
    special_requests,
    dietary_restrictions,
    estimated_arrival_time,
  } = data;

  let email = `
LUNCH ORDER REQUEST
\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501

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
\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501
`;

  items.forEach((item: OrderItem) => {
    email += `  ${item.quantity}x ${item.name} @ $${item.price.toFixed(2)} = $${(item.quantity * item.price).toFixed(2)}`;
    if (item.for_person) {
      email += ` (for ${item.for_person})`;
    }
    if (item.modifications) {
      email += `\n     Modifications: ${item.modifications}`;
    }
    email += '\n';
  });

  email += `
\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501
  Subtotal: $${subtotal.toFixed(2)}
  Tax (9.1%): $${tax.toFixed(2)}
  TOTAL: $${total.toFixed(2)}
\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501
`;

  if (dietary_restrictions) {
    email += `\nDIETARY RESTRICTIONS / ALLERGIES:\n  ${dietary_restrictions}\n`;
  }

  if (special_requests) {
    email += `\nSPECIAL REQUESTS:\n  ${special_requests}\n`;
  }

  email += `
\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501

TO APPROVE AND SEND:
1. Review order details above
2. Click "Approve & Send to Restaurant"
3. Email will be sent to ${restaurant.email}

\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501
`;

  return email;
}
