import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandling, BadRequestError } from '@/lib/api-errors';
import { prisma } from '@/lib/prisma';
import { withCSRF } from '@/lib/api/middleware/csrf';
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

interface LunchOrderResult {
  id: number;
}

export const POST = withCSRF(
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
  const restaurantResult = await prisma.$queryRawUnsafe(
    'SELECT name, email, phone, contact_name FROM restaurants WHERE id = $1',
    restaurant_id
  ) as Restaurant[];

  const restaurant = restaurantResult[0];
  if (!restaurant) {
    throw new BadRequestError('Restaurant not found');
  }

  // Get booking details
  const bookingResult = await prisma.$queryRawUnsafe(
    'SELECT customer_name, customer_email, tour_date FROM bookings WHERE id = $1',
    booking_id
  ) as Booking[];

  const booking = bookingResult[0];
  if (!booking) {
    throw new BadRequestError('Booking not found');
  }

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
  const insertResult = await prisma.$queryRawUnsafe(
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
    estimated_arrival_time, // requested_ready_time same as arrival
    dietary_restrictions || null,
    special_requests || null,
    'pending_approval', // Status
    emailBody,
  ) as LunchOrderResult[];
  const result = insertResult[0];

  return NextResponse.json({
    success: true,
    order_id: result.id,
    message: 'Lunch order submitted for admin approval',
  });
})
);

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
