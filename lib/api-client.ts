/**
 * Client-side API helper functions
 * These functions handle API calls from React components
 */

// Get the API base URL
const getApiUrl = () => {
  if (typeof window !== 'undefined') {
    // Client-side
    return process.env.NEXT_PUBLIC_API_URL || '';
  }
  // Server-side
  return process.env.NEXT_PUBLIC_API_URL || 
    (process.env.NODE_ENV === 'production' 
      ? 'https://walla-walla-final.vercel.app' 
      : 'http://localhost:3000');
};

// Generic API request function
async function apiRequest<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<{ success: boolean; data?: T; error?: string }> {
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
  async verify() {
    return apiRequest('/auth/verify');
  },

  async getProfile() {
    return apiRequest('/auth/profile');
  },

  async updateProfile(data: { name?: string; phone?: string }) {
    return apiRequest('/auth/profile', {
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
    inspectionData: any;
  }) {
    return apiRequest('/inspections/pre-trip', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async getTodayPreTrip() {
    return apiRequest('/inspections/pre-trip');
  },

  async submitPostTrip(data: {
    vehicleId: number;
    endMileage: number;
    inspectionData: any;
  }) {
    return apiRequest('/inspections/post-trip', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async getTodayPostTrip() {
    return apiRequest('/inspections/post-trip');
  },

  async createDVIR(data: {
    vehicleId: number;
    defects: any[];
    signature: string;
  }) {
    return apiRequest('/inspections/dvir', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async getHistory(params?: {
    limit?: number;
    startDate?: string;
    endDate?: string;
    type?: string;
  }) {
    const queryParams = new URLSearchParams();
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.startDate) queryParams.append('startDate', params.startDate);
    if (params?.endDate) queryParams.append('endDate', params.endDate);
    if (params?.type) queryParams.append('type', params.type);

    const query = queryParams.toString();
    return apiRequest(`/inspections/history${query ? `?${query}` : ''}`);
  },
};

// Workflow APIs
export const workflowApi = {
  async clockIn(data: {
    vehicleId?: number; // Optional for non-driving tasks
    location?: { latitude: number; longitude: number };
    startMileage?: number;
  }) {
    return apiRequest('/workflow/clock', {
      method: 'POST',
      body: JSON.stringify({ action: 'clock_in', ...data }),
    });
  },

  async clockOut(data: {
    location?: { latitude: number; longitude: number };
    endMileage?: number;
    signature: string;
  }) {
    return apiRequest('/workflow/clock', {
      method: 'POST',
      body: JSON.stringify({ action: 'clock_out', ...data }),
    });
  },

  async getDailyStatus() {
    return apiRequest('/workflow/daily');
  },

  async startBreak(type: 'rest' | 'meal' | 'personal' = 'rest', notes?: string) {
    return apiRequest('/workflow/breaks', {
      method: 'POST',
      body: JSON.stringify({ action: 'start', type, notes }),
    });
  },

  async endBreak() {
    return apiRequest('/workflow/breaks', {
      method: 'POST',
      body: JSON.stringify({ action: 'end' }),
    });
  },

  async getBreaks(date?: string) {
    const query = date ? `?date=${date}` : '';
    return apiRequest(`/workflow/breaks${query}`);
  },

  async getSchedule(params?: {
    startDate?: string;
    endDate?: string;
    days?: number;
  }) {
    const queryParams = new URLSearchParams();
    if (params?.startDate) queryParams.append('startDate', params.startDate);
    if (params?.endDate) queryParams.append('endDate', params.endDate);
    if (params?.days) queryParams.append('days', params.days.toString());

    const query = queryParams.toString();
    return apiRequest(`/workflow/schedule${query ? `?${query}` : ''}`);
  },

  async updateRouteStatus(routeId: number, status: string, notes?: string) {
    return apiRequest('/workflow/schedule', {
      method: 'PUT',
      body: JSON.stringify({ routeId, status, notes }),
    });
  },

  async getCurrentStatus() {
    return apiRequest('/workflow/status');
  },

  async updateStatus(status: string, notes?: string) {
    return apiRequest('/workflow/status', {
      method: 'PUT',
      body: JSON.stringify({ status, notes }),
    });
  },

  async getHOSCompliance(date?: string) {
    const query = date ? `?date=${date}` : '';
    return apiRequest(`/workflow/hos${query}`);
  },
};

// Vehicle APIs
export const vehicleApi = {
  async getVehicles(params?: {
    available?: boolean;
    active?: boolean;
    capacity?: number;
    page?: number;
    limit?: number;
  }) {
    const queryParams = new URLSearchParams();
    if (params?.available !== undefined) queryParams.append('available', params.available.toString());
    if (params?.active !== undefined) queryParams.append('active', params.active.toString());
    if (params?.capacity) queryParams.append('capacity', params.capacity.toString());
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());

    const query = queryParams.toString();
    return apiRequest(`/vehicles${query ? `?${query}` : ''}`);
  },

  async getVehicle(id: number) {
    return apiRequest(`/vehicles/${id}`);
  },

  async getAssignedVehicle() {
    return apiRequest('/vehicles/assigned');
  },

  async getAvailable() {
    return apiRequest('/vehicles/available');
  },

  async updateOdometer(vehicleId: number, mileage: number, notes?: string) {
    return apiRequest(`/vehicles/${vehicleId}/odometer`, {
      method: 'PUT',
      body: JSON.stringify({ mileage, notes }),
    });
  },

  async getOdometerHistory(vehicleId: number) {
    return apiRequest(`/vehicles/${vehicleId}/odometer`);
  },
};

// Separate vehicles export for backward compatibility
export const vehiclesApi = vehicleApi;

// Export all APIs
export default {
  auth: authApi,
  inspection: inspectionApi,
  workflow: workflowApi,
  vehicle: vehicleApi,
  vehicles: vehicleApi, // Alias for convenience
};