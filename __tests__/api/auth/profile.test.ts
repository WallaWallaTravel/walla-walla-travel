import { GET, PUT } from '@/app/api/auth/profile/route';
import { NextRequest } from 'next/server';
import * as db from '@/lib/db';
import { getServerSession } from '@/lib/auth';

// Mock the auth module
jest.mock('@/lib/auth');

// Mock the database module
jest.mock('@/lib/db');

describe('GET /api/auth/profile', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return 401 if user is not authenticated', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(null);

    const request = new NextRequest('http://localhost:3000/api/auth/profile');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.success).toBe(false);
    expect(data.error).toBe('Unauthorized - Please login');
  });

  it('should return user profile when authenticated', async () => {
    const mockSession = {
      email: 'driver@test.com',
      userId: '1',
      name: 'Test Driver',
    };

    const mockUser = {
      id: 1,
      email: 'driver@test.com',
      name: 'Test Driver',
      role: 'driver',
      phone: '555-1234',
      created_at: '2024-01-01',
      last_login: '2024-10-14',
      is_active: true,
    };

    (getServerSession as jest.Mock).mockResolvedValue(mockSession);
    (db.getUserByEmail as jest.Mock).mockResolvedValue(mockUser);

    const request = new NextRequest('http://localhost:3000/api/auth/profile');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data).toEqual({
      id: 1,
      email: 'driver@test.com',
      name: 'Test Driver',
      role: 'driver',
      phone: '555-1234',
      created_at: '2024-01-01',
      last_login: '2024-10-14',
    });
  });

  it('should handle database errors gracefully', async () => {
    const mockSession = {
      email: 'driver@test.com',
      userId: '1',
      name: 'Test Driver',
    };

    (getServerSession as jest.Mock).mockResolvedValue(mockSession);
    (db.getUserByEmail as jest.Mock).mockRejectedValue(new Error('Database error'));

    const request = new NextRequest('http://localhost:3000/api/auth/profile');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.success).toBe(false);
    expect(data.error).toBe('Failed to fetch profile');
  });
});

describe('PUT /api/auth/profile', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return 401 if user is not authenticated', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(null);

    const request = new NextRequest('http://localhost:3000/api/auth/profile', {
      method: 'PUT',
      body: JSON.stringify({ name: 'Updated Name' }),
    });

    const response = await PUT(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.success).toBe(false);
    expect(data.error).toBe('Unauthorized - Please login');
  });

  it('should update user profile successfully', async () => {
    const mockSession = {
      email: 'driver@test.com',
      userId: '1',
      name: 'Test Driver',
    };

    (getServerSession as jest.Mock).mockResolvedValue(mockSession);

    const mockQuery = jest.fn().mockResolvedValue({
      rows: [{
        id: 1,
        email: 'driver@test.com',
        name: 'Updated Name',
        phone: '555-5678',
        role: 'driver',
      }],
      rowCount: 1,
    });

    (db.query as jest.Mock) = mockQuery;

    const request = new NextRequest('http://localhost:3000/api/auth/profile', {
      method: 'PUT',
      body: JSON.stringify({
        name: 'Updated Name',
        phone: '555-5678',
      }),
    });

    const response = await PUT(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.name).toBe('Updated Name');
    expect(data.data.phone).toBe('555-5678');
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE users'),
      expect.arrayContaining(['Updated Name', '555-5678', '1'])
    );
  });

  it('should reject invalid phone numbers', async () => {
    const mockSession = {
      email: 'driver@test.com',
      userId: '1',
      name: 'Test Driver',
    };

    (getServerSession as jest.Mock).mockResolvedValue(mockSession);

    const request = new NextRequest('http://localhost:3000/api/auth/profile', {
      method: 'PUT',
      body: JSON.stringify({
        phone: 'invalid-phone',
      }),
    });

    const response = await PUT(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error).toBe('Invalid phone number format');
  });

  it('should sanitize input data', async () => {
    const mockSession = {
      email: 'driver@test.com',
      userId: '1',
      name: 'Test Driver',
    };

    (getServerSession as jest.Mock).mockResolvedValue(mockSession);

    const mockQuery = jest.fn().mockResolvedValue({
      rows: [{
        id: 1,
        email: 'driver@test.com',
        name: 'Clean Name',
        role: 'driver',
      }],
      rowCount: 1,
    });

    (db.query as jest.Mock) = mockQuery;

    const request = new NextRequest('http://localhost:3000/api/auth/profile', {
      method: 'PUT',
      body: JSON.stringify({
        name: '  <script>Clean Name</script>  ',
      }),
    });

    const response = await PUT(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    // Check that the name was sanitized (trimmed and tags removed)
    expect(mockQuery).toHaveBeenCalledWith(
      expect.any(String),
      expect.arrayContaining(['Clean Name', expect.any(String), '1'])
    );
  });
});