/**
 * Entity Service
 * Manages service entities, booking sources, and commission calculations
 */

import { query } from '@/lib/db';
import {
  ServiceEntity,
  ServiceType,
  BookingSource,
  CommissionRate,
  CalculatedCommission,
  CommissionLedgerEntry,
  BookingLineItem,
  VehicleIncident,
  IncidentFeeSchedule,
  CommissionSummary,
  EntityRevenueSummary,
  ENTITY_CODES,
  CommissionStatus,
  IncidentType,
} from '@/lib/types/entities';

// ============================================================================
// SERVICE ENTITIES
// ============================================================================

export async function getAllEntities(): Promise<ServiceEntity[]> {
  const result = await query(
    `SELECT * FROM service_entities WHERE is_active = true ORDER BY display_name`
  );
  return result.rows;
}

export async function getEntityByCode(code: string): Promise<ServiceEntity | null> {
  const result = await query(
    `SELECT * FROM service_entities WHERE code = $1`,
    [code]
  );
  return result.rows[0] || null;
}

export async function getEntityById(id: string): Promise<ServiceEntity | null> {
  const result = await query(
    `SELECT * FROM service_entities WHERE id = $1`,
    [id]
  );
  return result.rows[0] || null;
}

export async function getNWTouringEntity(): Promise<ServiceEntity | null> {
  return getEntityByCode(ENTITY_CODES.NW_TOURING);
}

export async function getWWTEntity(): Promise<ServiceEntity | null> {
  return getEntityByCode(ENTITY_CODES.WALLA_WALLA_TRAVEL);
}

// ============================================================================
// SERVICE TYPES
// ============================================================================

export async function getAllServiceTypes(): Promise<ServiceType[]> {
  const result = await query(`
    SELECT st.*, se.display_name as default_entity_name
    FROM service_types st
    LEFT JOIN service_entities se ON st.default_entity_id = se.id
    WHERE st.is_active = true
    ORDER BY st.display_order, st.name
  `);
  return result.rows;
}

export async function getServiceTypeByCode(code: string): Promise<ServiceType | null> {
  const result = await query(
    `SELECT * FROM service_types WHERE code = $1`,
    [code]
  );
  return result.rows[0] || null;
}

export async function getTransportationServiceTypes(): Promise<ServiceType[]> {
  const result = await query(`
    SELECT * FROM service_types
    WHERE category = 'transportation' AND is_active = true
    ORDER BY display_order
  `);
  return result.rows;
}

// ============================================================================
// BOOKING SOURCES
// ============================================================================

export async function getAllBookingSources(): Promise<BookingSource[]> {
  const result = await query(`
    SELECT bs.*, se.display_name as owner_entity_name
    FROM booking_sources bs
    LEFT JOIN service_entities se ON bs.owner_entity_id = se.id
    WHERE bs.is_active = true
    ORDER BY bs.name
  `);
  return result.rows;
}

export async function getBookingSourceByCode(code: string): Promise<BookingSource | null> {
  const result = await query(
    `SELECT * FROM booking_sources WHERE code = $1`,
    [code]
  );
  return result.rows[0] || null;
}

export async function getBookingSourceById(id: string): Promise<BookingSource | null> {
  const result = await query(
    `SELECT * FROM booking_sources WHERE id = $1`,
    [id]
  );
  return result.rows[0] || null;
}

// ============================================================================
// COMMISSION CALCULATION
// ============================================================================

export async function calculateCommission(
  bookingAmount: number,
  bookingSourceId: string,
  serviceTypeId?: string,
  providerEntityId?: string
): Promise<CalculatedCommission> {
  const result = await query(
    `SELECT * FROM calculate_commission($1, $2, $3, $4)`,
    [bookingAmount, bookingSourceId, serviceTypeId || null, providerEntityId || null]
  );

  if (result.rows.length === 0) {
    return {
      commission_type: 'none',
      commission_amount: 0,
    };
  }

  return {
    commission_type: result.rows[0].commission_type,
    commission_rate: result.rows[0].commission_rate,
    commission_amount: result.rows[0].commission_amount,
  };
}

export async function getCommissionRates(
  bookingSourceId?: string,
  serviceTypeId?: string,
  providerEntityId?: string
): Promise<CommissionRate[]> {
  let whereClause = 'WHERE is_active = true AND effective_from <= CURRENT_DATE AND (effective_until IS NULL OR effective_until >= CURRENT_DATE)';
  const params: (string | null)[] = [];

  if (bookingSourceId) {
    params.push(bookingSourceId);
    whereClause += ` AND booking_source_id = $${params.length}`;
  }

  if (serviceTypeId) {
    params.push(serviceTypeId);
    whereClause += ` AND service_type_id = $${params.length}`;
  }

  if (providerEntityId) {
    params.push(providerEntityId);
    whereClause += ` AND provider_entity_id = $${params.length}`;
  }

  const result = await query(`SELECT * FROM commission_rates ${whereClause}`, params);
  return result.rows;
}

export async function createCommissionRate(data: {
  booking_source_id?: string;
  service_type_id?: string;
  provider_entity_id?: string;
  commission_type: 'percentage' | 'flat';
  commission_rate?: number;
  commission_flat?: number;
  notes?: string;
  effective_from?: string;
  effective_until?: string;
}): Promise<CommissionRate> {
  const result = await query(`
    INSERT INTO commission_rates (
      booking_source_id, service_type_id, provider_entity_id,
      commission_type, commission_rate, commission_flat,
      notes, effective_from, effective_until
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    RETURNING *
  `, [
    data.booking_source_id || null,
    data.service_type_id || null,
    data.provider_entity_id || null,
    data.commission_type,
    data.commission_rate || null,
    data.commission_flat || null,
    data.notes || null,
    data.effective_from || new Date().toISOString().split('T')[0],
    data.effective_until || null,
  ]);

  return result.rows[0];
}

// ============================================================================
// COMMISSION LEDGER
// ============================================================================

export async function createCommissionEntry(data: {
  booking_id?: number;
  line_item_id?: string;
  payer_entity_id: string;
  payee_entity_id: string;
  booking_source_id?: string;
  booking_amount: number;
  commission_type: 'percentage' | 'flat';
  commission_rate?: number;
  commission_amount: number;
}): Promise<CommissionLedgerEntry> {
  const result = await query(`
    INSERT INTO commission_ledger (
      booking_id, line_item_id, payer_entity_id, payee_entity_id,
      booking_source_id, booking_amount, commission_type, commission_rate, commission_amount
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    RETURNING *
  `, [
    data.booking_id || null,
    data.line_item_id || null,
    data.payer_entity_id,
    data.payee_entity_id,
    data.booking_source_id || null,
    data.booking_amount,
    data.commission_type,
    data.commission_rate || null,
    data.commission_amount,
  ]);

  return result.rows[0];
}

export async function getCommissionLedger(filters: {
  payer_entity_id?: string;
  payee_entity_id?: string;
  status?: CommissionStatus;
  from_date?: string;
  to_date?: string;
}): Promise<CommissionLedgerEntry[]> {
  let whereClause = 'WHERE 1=1';
  const params: (string | null)[] = [];

  if (filters.payer_entity_id) {
    params.push(filters.payer_entity_id);
    whereClause += ` AND cl.payer_entity_id = $${params.length}`;
  }

  if (filters.payee_entity_id) {
    params.push(filters.payee_entity_id);
    whereClause += ` AND cl.payee_entity_id = $${params.length}`;
  }

  if (filters.status) {
    params.push(filters.status);
    whereClause += ` AND cl.status = $${params.length}`;
  }

  if (filters.from_date) {
    params.push(filters.from_date);
    whereClause += ` AND cl.created_at >= $${params.length}`;
  }

  if (filters.to_date) {
    params.push(filters.to_date);
    whereClause += ` AND cl.created_at <= $${params.length}`;
  }

  const result = await query(`
    SELECT
      cl.*,
      payer.display_name as payer_entity_name,
      payee.display_name as payee_entity_name,
      bs.name as booking_source_name
    FROM commission_ledger cl
    JOIN service_entities payer ON cl.payer_entity_id = payer.id
    JOIN service_entities payee ON cl.payee_entity_id = payee.id
    LEFT JOIN booking_sources bs ON cl.booking_source_id = bs.id
    ${whereClause}
    ORDER BY cl.created_at DESC
  `, params);

  return result.rows;
}

export async function updateCommissionStatus(
  id: string,
  status: CommissionStatus,
  userId?: number,
  paymentDetails?: {
    payment_method?: string;
    payment_reference?: string;
    payment_notes?: string;
  }
): Promise<CommissionLedgerEntry> {
  const updateFields: string[] = ['status = $2', 'updated_at = NOW()'];
  const params: (string | number | null)[] = [id, status];

  if (status === 'approved' && userId) {
    params.push(userId);
    updateFields.push(`approved_at = NOW()`, `approved_by = $${params.length}`);
  }

  if (status === 'paid' && paymentDetails) {
    updateFields.push('paid_at = NOW()');
    if (paymentDetails.payment_method) {
      params.push(paymentDetails.payment_method);
      updateFields.push(`payment_method = $${params.length}`);
    }
    if (paymentDetails.payment_reference) {
      params.push(paymentDetails.payment_reference);
      updateFields.push(`payment_reference = $${params.length}`);
    }
    if (paymentDetails.payment_notes) {
      params.push(paymentDetails.payment_notes);
      updateFields.push(`payment_notes = $${params.length}`);
    }
  }

  const result = await query(
    `UPDATE commission_ledger SET ${updateFields.join(', ')} WHERE id = $1 RETURNING *`,
    params
  );

  return result.rows[0];
}

export async function markCommissionsPaid(
  ids: string[],
  paymentDetails: {
    payment_method: string;
    payment_reference?: string;
    payment_notes?: string;
  }
): Promise<number> {
  const result = await query(`
    UPDATE commission_ledger
    SET
      status = 'paid',
      paid_at = NOW(),
      payment_method = $2,
      payment_reference = $3,
      payment_notes = $4,
      updated_at = NOW()
    WHERE id = ANY($1) AND status IN ('pending', 'approved')
  `, [ids, paymentDetails.payment_method, paymentDetails.payment_reference || null, paymentDetails.payment_notes || null]);

  return result.rowCount || 0;
}

// ============================================================================
// COMMISSION REPORTING
// ============================================================================

export async function getCommissionSummary(
  entityId?: string,
  fromDate?: string,
  toDate?: string
): Promise<CommissionSummary[]> {
  let whereClause = '';
  const params: string[] = [];

  if (entityId) {
    params.push(entityId);
    whereClause = `WHERE (payer_entity_id = $1 OR payee_entity_id = $1)`;
  }

  if (fromDate) {
    params.push(fromDate);
    whereClause += whereClause ? ` AND created_at >= $${params.length}` : `WHERE created_at >= $${params.length}`;
  }

  if (toDate) {
    params.push(toDate);
    whereClause += ` AND created_at <= $${params.length}`;
  }

  const result = await query(`SELECT * FROM commission_summary ${whereClause}`, params);
  return result.rows;
}

export async function getPendingCommissionsTotal(payeeEntityId: string): Promise<number> {
  const result = await query(`
    SELECT COALESCE(SUM(commission_amount), 0) as total
    FROM commission_ledger
    WHERE payee_entity_id = $1 AND status = 'pending'
  `, [payeeEntityId]);

  return parseFloat(result.rows[0].total) || 0;
}

// ============================================================================
// BOOKING LINE ITEMS
// ============================================================================

export async function createBookingLineItem(data: {
  booking_id: number;
  service_type_id?: string;
  description: string;
  provider_entity_id: string;
  brand_name?: string;
  service_date?: string;
  duration_hours?: number;
  party_size?: number;
  pricing_type?: 'hourly' | 'flat' | 'per_person';
  unit_price: number;
  quantity?: number;
  tax_rate?: number;
}): Promise<BookingLineItem> {
  const quantity = data.quantity || 1;
  const subtotal = data.unit_price * quantity;
  const taxRate = data.tax_rate || 0.091;
  const taxAmount = Math.round(subtotal * taxRate * 100) / 100;
  const total = subtotal + taxAmount;

  const result = await query(`
    INSERT INTO booking_line_items (
      booking_id, service_type_id, description, provider_entity_id, brand_name,
      service_date, duration_hours, party_size, pricing_type,
      unit_price, quantity, subtotal, tax_rate, tax_amount, total
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
    RETURNING *
  `, [
    data.booking_id,
    data.service_type_id || null,
    data.description,
    data.provider_entity_id,
    data.brand_name || null,
    data.service_date || null,
    data.duration_hours || null,
    data.party_size || null,
    data.pricing_type || null,
    data.unit_price,
    quantity,
    subtotal,
    taxRate,
    taxAmount,
    total,
  ]);

  return result.rows[0];
}

export async function getBookingLineItems(bookingId: number): Promise<BookingLineItem[]> {
  const result = await query(`
    SELECT
      bli.*,
      st.name as service_type_name,
      st.icon as service_type_icon,
      se.display_name as provider_entity_name
    FROM booking_line_items bli
    LEFT JOIN service_types st ON bli.service_type_id = st.id
    LEFT JOIN service_entities se ON bli.provider_entity_id = se.id
    WHERE bli.booking_id = $1
    ORDER BY bli.created_at
  `, [bookingId]);

  return result.rows;
}

// ============================================================================
// VEHICLE INCIDENTS
// ============================================================================

export async function getIncidentFeeSchedule(entityId: string): Promise<IncidentFeeSchedule[]> {
  const result = await query(
    `SELECT * FROM incident_fee_schedule WHERE entity_id = $1 AND is_active = true`,
    [entityId]
  );
  return result.rows;
}

export async function getIncidentBaseFee(entityId: string, incidentType: IncidentType): Promise<number> {
  const result = await query(
    `SELECT base_fee FROM incident_fee_schedule WHERE entity_id = $1 AND incident_type = $2 AND is_active = true`,
    [entityId, incidentType]
  );
  return result.rows[0]?.base_fee || 0;
}

export async function createVehicleIncident(data: {
  booking_id?: number;
  vehicle_id?: number;
  driver_id?: number;
  incident_type: IncidentType;
  incident_date: string;
  description: string;
  location?: string;
  base_fee: number;
  additional_charges?: number;
  photos?: string[];
  internal_notes?: string;
}): Promise<VehicleIncident> {
  const additionalCharges = data.additional_charges || 0;
  const totalCharge = data.base_fee + additionalCharges;

  const result = await query(`
    INSERT INTO vehicle_incidents (
      booking_id, vehicle_id, driver_id,
      incident_type, incident_date, description, location,
      base_fee, additional_charges, total_charge,
      photos, internal_notes
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
    RETURNING *
  `, [
    data.booking_id || null,
    data.vehicle_id || null,
    data.driver_id || null,
    data.incident_type,
    data.incident_date,
    data.description,
    data.location || null,
    data.base_fee,
    additionalCharges,
    totalCharge,
    data.photos || null,
    data.internal_notes || null,
  ]);

  return result.rows[0];
}

export async function getVehicleIncidents(filters: {
  booking_id?: number;
  vehicle_id?: number;
  charge_status?: string;
}): Promise<VehicleIncident[]> {
  let whereClause = 'WHERE 1=1';
  const params: (number | string)[] = [];

  if (filters.booking_id) {
    params.push(filters.booking_id);
    whereClause += ` AND booking_id = $${params.length}`;
  }

  if (filters.vehicle_id) {
    params.push(filters.vehicle_id);
    whereClause += ` AND vehicle_id = $${params.length}`;
  }

  if (filters.charge_status) {
    params.push(filters.charge_status);
    whereClause += ` AND charge_status = $${params.length}`;
  }

  const result = await query(
    `SELECT * FROM vehicle_incidents ${whereClause} ORDER BY incident_date DESC`,
    params
  );

  return result.rows;
}

// ============================================================================
// ENTITY REVENUE
// ============================================================================

export async function getEntityRevenueSummary(
  entityId?: string,
  _fromDate?: string,
  _toDate?: string
): Promise<EntityRevenueSummary[]> {
  let whereClause = '';
  const params: string[] = [];

  if (entityId) {
    params.push(entityId);
    whereClause = `WHERE provider_entity_id = $1`;
  }

  // Note: This uses the view if it exists, otherwise falls back to direct query
  const result = await query(`
    SELECT
      se.code as entity_code,
      se.display_name as entity_name,
      date_trunc('month', bli.created_at) as period,
      st.name as service_type,
      COUNT(DISTINCT bli.booking_id) as booking_count,
      SUM(bli.subtotal) as gross_revenue,
      SUM(bli.tax_amount) as tax_collected,
      SUM(bli.total) as total_revenue
    FROM booking_line_items bli
    JOIN service_entities se ON bli.provider_entity_id = se.id
    LEFT JOIN service_types st ON bli.service_type_id = st.id
    ${whereClause}
    GROUP BY se.code, se.display_name, date_trunc('month', bli.created_at), st.name
    ORDER BY period DESC, gross_revenue DESC
  `, params);

  return result.rows;
}
