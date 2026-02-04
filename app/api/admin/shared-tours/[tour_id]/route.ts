import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth, AuthSession } from '@/lib/api/middleware/auth-wrapper';
import { sharedTourService } from '@/lib/services/shared-tour.service';
import { query } from '@/lib/db';

interface RouteParams {
  params: Promise<{ tour_id: string }>;
}

/**
 * GET /api/admin/shared-tours/[tour_id]
 * Get tour details with tickets and vehicle info
 */
export const GET = withAdminAuth(async (request: NextRequest, _session: AuthSession, context) => {
  const { tour_id } = await (context as RouteParams).params;

  const tour = await sharedTourService.getTourWithAvailability(tour_id);
  if (!tour) {
    return NextResponse.json(
      { success: false, error: 'Tour not found' },
      { status: 404 }
    );
  }

  const tickets = await sharedTourService.getTicketsForTour(tour_id);
  const manifest = await sharedTourService.getTourManifest(tour_id);

  // Get vehicle info if assigned
  let vehicleInfo = null;
  if (tour.vehicle_id) {
    const vehicleResult = await query<{
      id: number;
      make: string;
      model: string;
      capacity: number;
      status: string;
    }>(`
      SELECT id, make, model, capacity, status
      FROM vehicles
      WHERE id = $1
    `, [tour.vehicle_id]);

    if (vehicleResult.rows[0]) {
      const v = vehicleResult.rows[0];
      vehicleInfo = {
        id: v.id,
        name: `${v.make} ${v.model}`,
        capacity: v.capacity,
        status: v.status,
      };
    }
  }

  // Get available vehicles for reassignment
  const { vehicles: availableVehicles, currentTicketsSold } = await sharedTourService.getAvailableVehiclesForTour(tour_id);

  return NextResponse.json({
    success: true,
    data: {
      tour,
      tickets,
      manifest,
      vehicle_info: vehicleInfo,
      available_vehicles: availableVehicles,
      tickets_sold: currentTicketsSold,
    },
  });
});

/**
 * PATCH /api/admin/shared-tours/[tour_id]
 * Update a tour
 *
 * Special handling for vehicle changes:
 * - If vehicle_id changes, validates availability and updates capacity
 * - If max_guests exceeds new vehicle capacity, caps it
 * - Use reassign_vehicle: true to trigger auto-reassignment
 */
export const PATCH = withAdminAuth(async (request: NextRequest, _session: AuthSession, context) => {
  const { tour_id } = await (context as RouteParams).params;
  const body = await request.json();

  // If changing date, validate day of week
  if (body.tour_date) {
    const date = new Date(body.tour_date);
    const dayOfWeek = date.getDay();
    if (dayOfWeek > 3) {
      return NextResponse.json(
        { success: false, error: 'Shared tours can only be scheduled on Sunday through Wednesday' },
        { status: 400 }
      );
    }
  }

  // Special case: reassign_vehicle flag triggers auto-reassignment
  if (body.reassign_vehicle === true) {
    try {
      const result = await sharedTourService.reassignVehicle(tour_id, body.vehicle_id);
      return NextResponse.json({
        success: true,
        data: result.tour,
        vehicle_info: result.vehicle_info,
        max_guests_updated: result.max_guests_updated,
        message: `Vehicle reassigned to ${result.vehicle_info.name}`,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to reassign vehicle';
      return NextResponse.json(
        { success: false, error: errorMessage },
        { status: 409 }
      );
    }
  }

  // If changing vehicle, validate it's available and has sufficient capacity
  if (body.vehicle_id !== undefined) {
    try {
      const { vehicles, currentTicketsSold } = await sharedTourService.getAvailableVehiclesForTour(tour_id);
      const selectedVehicle = vehicles.find(v => v.id === body.vehicle_id);

      if (!selectedVehicle) {
        return NextResponse.json(
          { success: false, error: `Vehicle ID ${body.vehicle_id} not found or not in fleet` },
          { status: 400 }
        );
      }

      if (!selectedVehicle.available) {
        return NextResponse.json(
          { success: false, error: `Vehicle "${selectedVehicle.name}" is not available for this time slot` },
          { status: 409 }
        );
      }

      if (selectedVehicle.capacity < currentTicketsSold) {
        return NextResponse.json(
          { success: false, error: `Vehicle capacity (${selectedVehicle.capacity}) is less than tickets already sold (${currentTicketsSold})` },
          { status: 400 }
        );
      }

      // Cap max_guests to vehicle capacity if provided and exceeds
      if (body.max_guests && body.max_guests > selectedVehicle.capacity) {
        body.max_guests = selectedVehicle.capacity;
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to validate vehicle';
      return NextResponse.json(
        { success: false, error: errorMessage },
        { status: 400 }
      );
    }
  }

  const tour = await sharedTourService.updateTour(tour_id, body);
  if (!tour) {
    return NextResponse.json(
      { success: false, error: 'Tour not found' },
      { status: 404 }
    );
  }

  return NextResponse.json({
    success: true,
    data: tour,
    message: 'Tour updated successfully',
  });
});

/**
 * DELETE /api/admin/shared-tours/[tour_id]
 * Cancel a tour
 */
export const DELETE = withAdminAuth(async (request: NextRequest, _session: AuthSession, context) => {
  const { tour_id } = await (context as RouteParams).params;

  const tour = await sharedTourService.cancelTour(tour_id);
  if (!tour) {
    return NextResponse.json(
      { success: false, error: 'Tour not found' },
      { status: 404 }
    );
  }

  return NextResponse.json({
    success: true,
    data: tour,
    message: 'Tour cancelled successfully',
  });
});
