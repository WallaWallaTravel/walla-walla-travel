import { Pool, QueryResult } from 'pg';
import { logDbError, logInfo, logDebug } from './logger';

// Determine SSL config based on DATABASE_URL
const databaseUrl = process.env.DATABASE_URL;
const isHeroku = databaseUrl && databaseUrl.includes('amazonaws.com');

// Create connection pool
const pool = new Pool({
  connectionString: databaseUrl,
  ssl: isHeroku ? {
    rejectUnauthorized: false // Required for Heroku Postgres
  } : false,
  max: 20,                    // Maximum connections in pool
  idleTimeoutMillis: 30000,   // Close idle clients after 30s
  connectionTimeoutMillis: 2000, // Timeout after 2s
});

// Test connection on initialization
pool.on('connect', () => {
  console.log('📊 Connected to Heroku PostgreSQL database');
});

pool.on('error', (err) => {
  console.error('❌ Database connection error:', err);
  process.exit(-1);
});

// Database query helper function
export async function query(text: string, params?: any[]): Promise<QueryResult> {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    
    // Log successful queries in debug mode
    logDebug('Database', `Query executed in ${duration}ms`, {
      sql: text,
      params,
      rows: res.rowCount,
      duration
    });
    
    return res;
  } catch (error: any) {
    // Log database errors with full details
    const errorId = logDbError('Database', text, params || [], error);
    
    // Add errorId to the error object for tracking
    error.errorId = errorId;
    
    throw error;
  }
}

// User-related database functions
export async function createUser(email: string, passwordHash: string, name: string, role: string = 'driver') {
  const text = `
    INSERT INTO users (email, password_hash, name, role) 
    VALUES ($1, $2, $3, $4) 
    RETURNING id, email, name, role, created_at
  `;
  const values = [email, passwordHash, name, role];
  
  try {
    const result = await query(text, values);
    return result.rows[0];
  } catch (error) {
    console.error('❌ Error creating user:', error);
    throw new Error('Failed to create user');
  }
}

export async function getUserByEmail(email: string) {
  const text = 'SELECT * FROM users WHERE email = $1 AND is_active = true';
  
  try {
    const result = await query(text, [email]);
    return result.rows[0] || null;
  } catch (error) {
    console.error('❌ Error fetching user:', error);
    throw new Error('Failed to fetch user');
  }
}

export async function updateUserLastLogin(userId: number) {
  const text = 'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1';
  
  try {
    await query(text, [userId]);
  } catch (error) {
    console.error('❌ Error updating last login:', error);
    // Don't throw - this is not critical
  }
}

// Vehicle-related database functions
export async function getVehicles() {
  const text = 'SELECT * FROM vehicles WHERE is_active = true ORDER BY vehicle_number';
  
  try {
    const result = await query(text);
    return result.rows;
  } catch (error) {
    console.error('❌ Error fetching vehicles:', error);
    throw new Error('Failed to fetch vehicles');
  }
}

export async function getVehicleById(id: number) {
  const text = 'SELECT * FROM vehicles WHERE id = $1 AND is_active = true';
  
  try {
    const result = await query(text, [id]);
    return result.rows[0] || null;
  } catch (error) {
    console.error('❌ Error fetching vehicle:', error);
    throw new Error('Failed to fetch vehicle');
  }
}

// Inspection-related database functions
export async function createInspection(data: {
  driverId: number;
  vehicleId: number;
  type: 'pre_trip' | 'post_trip';
  inspectionData: object;
  startMileage?: number;
  endMileage?: number;
}) {
  const text = `
    INSERT INTO inspections 
    (driver_id, vehicle_id, type, inspection_data, start_mileage, end_mileage) 
    VALUES ($1, $2, $3, $4, $5, $6) 
    RETURNING *
  `;
  const values = [
    data.driverId,
    data.vehicleId,
    data.type,
    JSON.stringify(data.inspectionData),
    data.startMileage || null,
    data.endMileage || null
  ];
  
  try {
    const result = await query(text, values);
    return result.rows[0];
  } catch (error) {
    console.error('❌ Error creating inspection:', error);
    throw new Error('Failed to create inspection');
  }
}

export async function getInspectionsByDriver(driverId: number, limit: number = 10) {
  const text = `
    SELECT i.*, v.vehicle_number, v.make, v.model 
    FROM inspections i 
    JOIN vehicles v ON i.vehicle_id = v.id 
    WHERE i.driver_id = $1 
    ORDER BY i.created_at DESC 
    LIMIT $2
  `;
  
  try {
    const result = await query(text, [driverId, limit]);
    return result.rows;
  } catch (error) {
    console.error('❌ Error fetching inspections:', error);
    throw new Error('Failed to fetch inspections');
  }
}

export async function updateInspectionStatus(id: number, status: string, issues?: string) {
  const text = `
    UPDATE inspections 
    SET status = $2, issues_found = $3, issues_description = $4, updated_at = CURRENT_TIMESTAMP 
    WHERE id = $1 
    RETURNING *
  `;
  const values = [id, status, !!issues, issues || null];
  
  try {
    const result = await query(text, values);
    return result.rows[0];
  } catch (error) {
    console.error('❌ Error updating inspection:', error);
    throw new Error('Failed to update inspection');
  }
}

// Workflow-related database functions
export async function createWorkflow(driverId: number, workflowDate: string = new Date().toISOString().split('T')[0]) {
  const text = `
    INSERT INTO workflows (driver_id, workflow_date) 
    VALUES ($1, $2) 
    ON CONFLICT (driver_id, workflow_date) 
    DO UPDATE SET updated_at = CURRENT_TIMESTAMP 
    RETURNING *
  `;
  
  try {
    const result = await query(text, [driverId, workflowDate]);
    return result.rows[0];
  } catch (error) {
    console.error('❌ Error creating workflow:', error);
    throw new Error('Failed to create workflow');
  }
}

export async function getWorkflowByDriverAndDate(driverId: number, date: string) {
  const text = 'SELECT * FROM workflows WHERE driver_id = $1 AND workflow_date = $2';
  
  try {
    const result = await query(text, [driverId, date]);
    return result.rows[0] || null;
  } catch (error) {
    console.error('❌ Error fetching workflow:', error);
    throw new Error('Failed to fetch workflow');
  }
}

// Client notes-related database functions
export async function createClientNote(data: {
  workflowId: number;
  driverId: number;
  clientName: string;
  visitTime: string;
  pickupLocation?: string;
  dropoffLocation?: string;
  passengerCount?: number;
  notes?: string;
  specialRequests?: string;
}) {
  const text = `
    INSERT INTO client_notes 
    (workflow_id, driver_id, client_name, visit_time, pickup_location, 
     dropoff_location, passenger_count, notes, special_requests) 
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) 
    RETURNING *
  `;
  const values = [
    data.workflowId,
    data.driverId,
    data.clientName,
    data.visitTime,
    data.pickupLocation || null,
    data.dropoffLocation || null,
    data.passengerCount || 1,
    data.notes || null,
    data.specialRequests || null
  ];
  
  try {
    const result = await query(text, values);
    return result.rows[0];
  } catch (error) {
    console.error('❌ Error creating client note:', error);
    throw new Error('Failed to create client note');
  }
}

// Vehicle documents functions
export async function getVehicleDocuments(vehicleId: number) {
  const text = `
    SELECT 
      id,
      vehicle_id,
      document_type,
      document_name,
      document_url,
      expiry_date,
      is_active,
      created_at
    FROM vehicle_documents
    WHERE vehicle_id = $1 AND is_active = true
    ORDER BY 
      CASE document_type 
        WHEN 'registration' THEN 1
        WHEN 'insurance' THEN 2
        WHEN 'inspection' THEN 3
        WHEN 'maintenance' THEN 4
        ELSE 5
      END
  `;
  
  try {
    const result = await query(text, [vehicleId]);
    return result.rows;
  } catch (error) {
    console.error('❌ Error fetching vehicle documents:', error);
    throw new Error('Failed to fetch vehicle documents');
  }
}

// Database health check
export async function healthCheck(): Promise<boolean> {
  try {
    const result = await query('SELECT NOW() as current_time');
    console.log('✅ Database health check passed:', result.rows[0].current_time);
    return true;
  } catch (error) {
    console.error('❌ Database health check failed:', error);
    return false;
  }
}

// Close database connections (for cleanup)
export async function closePool(): Promise<void> {
  await pool.end();
  console.log('📊 Database connection pool closed');
}

export default pool;