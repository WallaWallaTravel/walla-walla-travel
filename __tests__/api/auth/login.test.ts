import { POST } from '@/app/api/auth/login/route';
import { NextRequest } from 'next/server';
import * as db from '@/lib/db';
import bcrypt from 'bcryptjs';

// Mock the database module
jest.mock('@/lib/db');

// Mock bcryptjs
jest.mock('bcryptjs');

// Mock next/headers for cookies
jest.mock('next/headers', () => ({
  cookies: jest.fn(() => ({
    set: jest.fn(),
  })),
}));

describe('POST /api/auth/login', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return 400 if email or password is missing', async () => {
    const request = new NextRequest('http://localhost:3000/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'test@example.com' }), // Missing password
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error).toBe('Missing required field: password');
  });

  it('should return 401 if user is not found', async () => {
    (db.getUserByEmail as jest.Mock).mockResolvedValue(null);

    const request = new NextRequest('http://localhost:3000/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: 'nonexistent@example.com',
        password: 'password123',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.success).toBe(false);
    expect(data.error).toBe('Invalid email or password');
  });

  it('should return 401 if password is incorrect', async () => {
    const mockUser = {
      id: 1,
      email: 'driver@test.com',
      password_hash: 'hashedpassword',
      name: 'Test Driver',
      role: 'driver',
    };

    (db.getUserByEmail as jest.Mock).mockResolvedValue(mockUser);
    (bcrypt.compare as jest.Mock).mockResolvedValue(false);

    const request = new NextRequest('http://localhost:3000/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: 'driver@test.com',
        password: 'wrongpassword',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.success).toBe(false);
    expect(data.error).toBe('Invalid email or password');
  });

  it('should successfully login with correct credentials', async () => {
    const mockUser = {
      id: 1,
      email: 'driver@test.com',
      password_hash: 'hashedpassword',
      name: 'Test Driver',
      role: 'driver',
    };

    (db.getUserByEmail as jest.Mock).mockResolvedValue(mockUser);
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);
    (db.updateUserLastLogin as jest.Mock).mockResolvedValue(undefined);

    const request = new NextRequest('http://localhost:3000/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: 'driver@test.com',
        password: 'correctpassword',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data).toEqual({
      id: 1,
      email: 'driver@test.com',
      name: 'Test Driver',
      role: 'driver',
    });
    expect(db.updateUserLastLogin).toHaveBeenCalledWith(1);
  });

  it('should handle database errors gracefully', async () => {
    (db.getUserByEmail as jest.Mock).mockRejectedValue(new Error('Database connection failed'));

    const request = new NextRequest('http://localhost:3000/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: 'driver@test.com',
        password: 'password123',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.success).toBe(false);
    expect(data.error).toBe('Login failed. Please try again.');
  });

  it('should enforce rate limiting', async () => {
    const mockUser = {
      id: 1,
      email: 'driver@test.com',
      password_hash: 'hashedpassword',
      name: 'Test Driver',
      role: 'driver',
    };

    (db.getUserByEmail as jest.Mock).mockResolvedValue(mockUser);
    (bcrypt.compare as jest.Mock).mockResolvedValue(false);

    // Simulate multiple failed login attempts
    for (let i = 0; i < 6; i++) {
      const request = new NextRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: {
          'x-forwarded-for': '192.168.1.1', // Same IP for rate limiting
        },
        body: JSON.stringify({
          email: 'driver@test.com',
          password: 'wrongpassword',
        }),
      });

      const response = await POST(request);
      
      if (i === 5) {
        // 6th attempt should be rate limited
        const data = await response.json();
        expect(response.status).toBe(429);
        expect(data.error).toBe('Too many login attempts. Please try again later.');
      }
    }
  });
});