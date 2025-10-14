// API configuration for Python backend
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

// Helper function to get auth headers
function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem('token')
  return {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
  }
}

// Auth API
export async function login(email: string, pin: string) {
  const response = await fetch(`${API_URL}/api/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, pin })
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.detail || 'Login failed')
  }

  const data = await response.json()
  
  // Store token and driver info
  localStorage.setItem('token', data.access_token)
  localStorage.setItem('driver', JSON.stringify(data.driver))
  
  return data
}

export async function logout() {
  localStorage.removeItem('token')
  localStorage.removeItem('driver')
}

export function getDriver() {
  const driverStr = localStorage.getItem('driver')
  return driverStr ? JSON.parse(driverStr) : null
}

export function isAuthenticated() {
  return !!localStorage.getItem('token')
}

// Driver API
export async function getDriverProfile() {
  const response = await fetch(`${API_URL}/api/drivers/me`, {
    headers: getAuthHeaders()
  })

  if (!response.ok) {
    throw new Error('Failed to fetch driver profile')
  }

  return response.json()
}

// Inspections API
export async function createInspection(inspection: {
  vehicle_id: string
  type: 'pre_trip' | 'post_trip'
  items: Record<string, boolean>
  notes?: string
  beginning_mileage?: number
  ending_mileage?: number
}) {
  const response = await fetch(`${API_URL}/api/inspections`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(inspection)
  })

  if (!response.ok) {
    throw new Error('Failed to create inspection')
  }

  return response.json()
}

// Client Notes API
export async function createClientNotes(notes: {
  overall_rating: number
  winery_ratings: Record<string, number>
  purchases: string[]
  favorite_stop: string
  will_return: string
  custom_stops?: string
  detailed_notes?: string
  marketing_interests: string[]
}) {
  const response = await fetch(`${API_URL}/api/client-notes`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(notes)
  })

  if (!response.ok) {
    throw new Error('Failed to create client notes')
  }

  return response.json()
}

// Workflow API
export async function getWorkflowProgress() {
  const response = await fetch(`${API_URL}/api/workflow/progress`, {
    headers: getAuthHeaders()
  })

  if (!response.ok) {
    throw new Error('Failed to fetch workflow progress')
  }

  return response.json()
}

// Dashboard API
export async function getDashboardStats() {
  const response = await fetch(`${API_URL}/api/dashboard/stats`, {
    headers: getAuthHeaders()
  })

  if (!response.ok) {
    throw new Error('Failed to fetch dashboard stats')
  }

  return response.json()
}

// Health Check
export async function checkApiHealth() {
  try {
    const response = await fetch(`${API_URL}/api/health`)
    return response.ok
  } catch {
    return false
  }
}