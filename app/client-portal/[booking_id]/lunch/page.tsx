import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { itineraryService } from '@/lib/services/itinerary.service';
import { getAllMenus } from '@/lib/menus';
import { getSmartModifications } from '@/lib/ai-modifications';
import LunchOrderClient from './components/LunchOrderClient';

interface PageProps {
  params: Promise<{ booking_id: string }>;
}

export default async function LunchOrderPage({ params }: PageProps) {
  const { booking_id } = await params;
  const bookingId = parseInt(booking_id);

  if (isNaN(bookingId)) {
    notFound();
  }

  // Fetch booking and restaurants in parallel
  const [bookingRaw, restaurants] = await Promise.all([
    prisma.bookings.findUnique({
      where: { id: bookingId },
      select: { id: true, tour_date: true, party_size: true },
    }),
    prisma.restaurants.findMany({
      where: { is_active: true },
      select: { id: true, name: true, cuisine_type: true, phone: true, email: true },
      orderBy: { name: 'asc' },
    }),
  ]);

  if (!bookingRaw) {
    notFound();
  }

  // Convert Date → serializable string for client component
  const booking = {
    id: bookingRaw.id,
    tour_date: bookingRaw.tour_date.toISOString().split('T')[0],
    party_size: bookingRaw.party_size,
  };

  // Fetch itinerary stops (optional — no itinerary is OK)
  let itineraryStops: Array<{
    id: number;
    stop_order: number;
    arrival_time: string | null;
    departure_time: string | null;
  }> = [];

  try {
    const itinerary = await itineraryService.getByBookingId(bookingId);
    itineraryStops = (itinerary.stops ?? []).map((s) => ({
      id: s.id,
      stop_order: s.stop_order,
      arrival_time: s.arrival_time,
      departure_time: s.departure_time,
    }));
  } catch {
    // No itinerary found — lunch ordering proceeds without stop times
  }

  // Load menus and pre-compute smart modifications server-side
  const restaurantMenus = getAllMenus();
  const smartModificationsMap: Record<string, string[]> = {};
  for (const menu of Object.values(restaurantMenus)) {
    for (const item of menu.items) {
      smartModificationsMap[item.id] = getSmartModifications(item);
    }
  }

  return (
    <LunchOrderClient
      booking={booking}
      restaurants={restaurants}
      itineraryStops={itineraryStops}
      restaurantMenus={restaurantMenus}
      smartModificationsMap={smartModificationsMap}
      bookingId={bookingId}
    />
  );
}
