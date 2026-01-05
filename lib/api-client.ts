/**
 * Client-side API helper functions
 * These functions handle API calls from React components
 */

import type {
  PreTripCheckpoints,
  PostTripCheckpoints,
  DefectItem,
  Inspection,
  InspectionHistory,
  UserProfile,
  Vehicle,
  AssignedVehicle,
  AvailableVehiclesResponse,
  TimeCard,
  ClockStatus,
  HOSSummary,
  ActiveShift,
  ClientService,
  ClockApiResponse,
} from './types';

// ============================================================================
// API Response Types
// ============================================================================

/** Standard API response wrapper */
interface ApiClientResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

/** Admin dashboard data */
interface AdminDashboardData {
  activeShifts: ActiveShift[];
  availableVehicles: Vehicle[];
  statistics: {
    totalShifts: number;
    activeShifts: number;
    completedToday: number;
    totalRevenue: number;
  };
}

/** Vehicle assignment response */
interface VehicleAssignmentResponse {
  clientService: ClientService;
  message: string;
}

/** Auth verification response */
interface AuthVerifyResponse {
  authenticated: boolean;
  user?: UserProfile;
}

/** Daily status response */
interface DailyStatusResponse {
  clockStatus: ClockStatus;
  timeCard?: TimeCard;
  breaks: Array<{
    id: number;
    type: string;
    startTime: string;
    endTime?: string;
  }>;
}

/** Schedule response */
interface ScheduleResponse {
  routes: Array<{
    id: number;
    date: string;
    status: string;
    notes?: string;
  }>;
}

/** Driver status response */
interface DriverStatusResponse {
  status: string;
  lastUpdate: string;
  timeCard?: TimeCard;
}

/** Odometer history entry */
interface OdometerHistoryEntry {
  id: number;
  vehicleId: number;
  mileage: number;
  recordedAt: string;
  recordedBy: number;
  notes?: string;
}

// ============================================================================
// API Base Configuration
// ============================================================================

// Get the API base URL
const getApiUrl = () => {
  if (typeof window !== 'undefined') {
    // Client-side
    return process.env.NEXT_PUBLIC_API_URL || '';
  }
  // Server-side - uses production URL
  return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
};

// Generic API request function
async function apiRequest<T = unknown>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiClientResponse<T>> {
  try {
    const url = `${getApiUrl()}/api${endpoint}`;
    
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      credentials: 'include', // Include cookies
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      return {
        success: false,
        error: data.error || `Request failed with status ${response.status}`,
      };
    }

    return {
      success: true,
      data: data.data,
    };
  } catch (error) {
    console.error(`API request error for ${endpoint}:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error',
    };
  }
}

// Authentication APIs
export const authApi = {
  async verify(): Promise<ApiClientResponse<AuthVerifyResponse>> {
    return apiRequest<AuthVerifyResponse>('/auth/verify');
  },

  async getProfile(): Promise<ApiClientResponse<UserProfile>> {
    return apiRequest<UserProfile>('/auth/profile');
  },

  async updateProfile(data: { name?: string; phone?: string }): Promise<ApiClientResponse<UserProfile>> {
    return apiRequest<UserProfile>('/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },
};

// Inspection APIs
export const inspectionApi = {
  async submitPreTrip(data: {
    vehicleId: number;
    startMileage: number;
    inspectionData: PreTripCheckpoints;
  }): Promise<ApiClientResponse<Inspection>> {
    return apiRequest<Inspection>('/inspections/pre-trip', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async getTodayPreTrip(): Promise<ApiClientResponse<Inspection | null>> {
    return apiRequest<Inspection | null>('/inspections/pre-trip');
  },

  async submitPostTrip(data: {
    vehicleId: number;
    endMileage: number;
    inspectionData: PostTripCheckpoints;
  }): Promise<ApiClientResponse<Inspection>> {
    return apiRequest<Inspection>('/inspections/post-trip', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async getTodayPostTrip(): Promise<ApiClientResponse<Inspection | null>> {
    return apiRequest<Inspection | null>('/inspections/post-trip');
  },

  async createDVIR(data: {
    vehicleId: number;
    defects: DefectItem[];
    signature: string;
  }): Promise<ApiClientResponse<Inspection>> {
    return apiRequest<Inspection>('/inspections/dvir', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async getHistory(params?: {
    limit?: number;
    startDate?: string;
    endDate?: string;
    type?: string;
  }): Promise<ApiClientResponse<InspectionHistory>> {
    const queryParams = new URLSearchParams();
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.startDate) queryParams.append('startDate', params.startDate);
    if (params?.endDate) queryParams.append('endDate', params.endDate);
    if (params?.type) queryParams.append('type', params.type);

    const query = queryParams.toString();
    return apiRequest<InspectionHistory>(`/inspections/history${query ? `?${query}` : ''}`);
  },
};

/** Location coordinates for clock operations */
interface ClockLocation {
  latitude: number;
  longitude: number;
}

/** Break record */
interface BreakRecord {
  id: number;
  type: 'rest' | 'meal' | 'personal';
  startTime: string;
  endTime?: string;
  notes?: string;
}

// Workflow APIs
export const workflowApi = {
  async clockIn(data: {
    vehicleId?: number; // Optional for non-driving tasks
    location?: ClockLocation;
    startMileage?: number;
  }): Promise<ApiClientResponse<ClockApiResponse>> {
    return apiRequest<ClockApiResponse>('/workflow/clock', {
      method: 'POST',
      body: JSON.stringify({ action: 'clock_in', ...data }),
    });
  },

  async clockOut(data: {
    location?: ClockLocation;
    endMileage?: number;
    signature: string;
  }): Promise<ApiClientResponse<ClockApiResponse>> {
    return apiRequest<ClockApiResponse>('/workflow/clock', {
      method: 'POST',
      body: JSON.stringify({ action: 'clock_out', ...data }),
    });
  },

  async getDailyStatus(): Promise<ApiClientResponse<DailyStatusResponse>> {
    return apiRequest<DailyStatusResponse>('/workflow/daily');
  },

  async startBreak(type: 'rest' | 'meal' | 'personal' = 'rest', notes?: string): Promise<ApiClientResponse<BreakRecord>> {
    return apiRequest<BreakRecord>('/workflow/breaks', {
      method: 'POST',
      body: JSON.stringify({ action: 'start', type, notes }),
    });
  },

  async endBreak(): Promise<ApiClientResponse<BreakRecord>> {
    return apiRequest<BreakRecord>('/workflow/breaks', {
      method: 'POST',
      body: JSON.stringify({ action: 'end' }),
    });
  },

  async getBreaks(date?: string): Promise<ApiClientResponse<BreakRecord[]>> {
    const query = date ? `?date=${date}` : '';
    return apiRequest<BreakRecord[]>(`/workflow/breaks${query}`);
  },

  async getSchedule(params?: {
    startDate?: string;
    endDate?: string;
    days?: number;
  }): Promise<ApiClientResponse<ScheduleResponse>> {
    const queryParams = new URLSearchParams();
    if (params?.startDate) queryParams.append('startDate', params.startDate);
    if (params?.endDate) queryParams.append('endDate', params.endDate);
    if (params?.days) queryParams.append('days', params.days.toString());

    const query = queryParams.toString();
    return apiRequest<ScheduleResponse>(`/workflow/schedule${query ? `?${query}` : ''}`);
  },

  async updateRouteStatus(routeId: number, status: string, notes?: string): Promise<ApiClientResponse<{ updated: boolean }>> {
    return apiRequest<{ updated: boolean }>('/workflow/schedule', {
      method: 'PUT',
      body: JSON.stringify({ routeId, status, notes }),
    });
  },

  async getCurrentStatus(): Promise<ApiClientResponse<DriverStatusResponse>> {
    return apiRequest<DriverStatusResponse>('/workflow/status');
  },

  async updateStatus(status: string, notes?: string): Promise<ApiClientResponse<DriverStatusResponse>> {
    return apiRequest<DriverStatusResponse>('/workflow/status', {
      method: 'PUT',
      body: JSON.stringify({ status, notes }),
    });
  },

  async getHOSCompliance(date?: string): Promise<ApiClientResponse<HOSSummary>> {
    const query = date ? `?date=${date}` : '';
    return apiRequest<HOSSummary>(`/workflow/hos${query}`);
  },
};

/** Paginated vehicles response */
interface VehiclesListResponse {
  vehicles: Vehicle[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

// Vehicle APIs
export const vehicleApi = {
  async getVehicles(params?: {
    available?: boolean;
    active?: boolean;
    capacity?: number;
    page?: number;
    limit?: number;
  }): Promise<ApiClientResponse<VehiclesListResponse>> {
    const queryParams = new URLSearchParams();
    if (params?.available !== undefined) queryParams.append('available', params.available.toString());
    if (params?.active !== undefined) queryParams.append('active', params.active.toString());
    if (params?.capacity) queryParams.append('capacity', params.capacity.toString());
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());

    const query = queryParams.toString();
    return apiRequest<VehiclesListResponse>(`/vehicles${query ? `?${query}` : ''}`);
  },

  async getVehicle(id: number): Promise<ApiClientResponse<Vehicle>> {
    return apiRequest<Vehicle>(`/vehicles/${id}`);
  },

  async getAssignedVehicle(): Promise<ApiClientResponse<AssignedVehicle | null>> {
    return apiRequest<AssignedVehicle | null>('/vehicles/assigned');
  },

  async getAvailable(): Promise<ApiClientResponse<AvailableVehiclesResponse>> {
    return apiRequest<AvailableVehiclesResponse>('/vehicles/available');
  },

  async updateOdometer(vehicleId: number, mileage: number, notes?: string): Promise<ApiClientResponse<{ mileage: number; updatedAt: string }>> {
    return apiRequest<{ mileage: number; updatedAt: string }>(`/vehicles/${vehicleId}/odometer`, {
      method: 'PUT',
      body: JSON.stringify({ mileage, notes }),
    });
  },

  async getOdometerHistory(vehicleId: number): Promise<ApiClientResponse<OdometerHistoryEntry[]>> {
    return apiRequest<OdometerHistoryEntry[]>(`/vehicles/${vehicleId}/odometer`);
  },
};

// Separate vehicles export for backward compatibility
export const vehiclesApi = vehicleApi;

// Admin APIs
export const adminApi = {
  async getDashboard(): Promise<ApiClientResponse<AdminDashboardData>> {
    return apiRequest<AdminDashboardData>('/admin/dashboard');
  },

  async assignVehicle(data: {
    timeCardId: number;
    vehicleId: number;
    clientName: string;
    hourlyRate: number;
    notes?: string;
    clientPhone?: string;
    clientEmail?: string;
  }): Promise<ApiClientResponse<VehicleAssignmentResponse>> {
    return apiRequest<VehicleAssignmentResponse>('/admin/assign-vehicle', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
};

// Client Service APIs (Driver)
export const clientServiceApi = {
  async logPickup(data: {
    clientServiceId: number;
    pickupLocation: string;
    pickupLat?: number;
    pickupLng?: number;
  }): Promise<ApiClientResponse<ClientService>> {
    return apiRequest<ClientService>('/driver/client-pickup', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async getCurrentService(): Promise<ApiClientResponse<ClientService | null>> {
    return apiRequest<ClientService | null>('/driver/client-pickup');
  },

  async logDropoff(data: {
    clientServiceId: number;
    dropoffLocation: string;
    dropoffLat?: number;
    dropoffLng?: number;
  }): Promise<ApiClientResponse<ClientService>> {
    return apiRequest<ClientService>('/driver/client-dropoff', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async getServiceForDropoff(): Promise<ApiClientResponse<ClientService | null>> {
    return apiRequest<ClientService | null>('/driver/client-dropoff');
  },
};

// Export all APIs
const apiClient = {
  auth: authApi,
  inspection: inspectionApi,
  workflow: workflowApi,
  vehicle: vehicleApi,
  vehicles: vehicleApi, // Alias for convenience
  admin: adminApi,
  clientService: clientServiceApi,
};

export default apiClient;