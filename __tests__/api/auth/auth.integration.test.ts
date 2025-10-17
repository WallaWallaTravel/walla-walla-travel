/**
 * Integration tests for authentication API endpoints
 * These tests verify the actual API behavior
 */

describe('Authentication API Integration Tests', () => {
  const baseUrl = 'http://localhost:3000/api/auth';

  describe('POST /api/auth/login', () => {
    it('should validate required fields', async () => {
      // Test with missing password
      const response = await fetch(`${baseUrl}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'test@example.com' }),
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error).toContain('password');
    });

    it('should validate email format', async () => {
      const response = await fetch(`${baseUrl}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email: 'invalid-email',
          password: 'test123' 
        }),
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error).toContain('email');
    });

    it('should reject invalid credentials', async () => {
      const response = await fetch(`${baseUrl}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email: 'wrong@example.com',
          password: 'wrongpass' 
        }),
      });

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error).toBe('Invalid email or password');
    });
  });

  describe('GET /api/auth/verify', () => {
    it('should return 401 when not authenticated', async () => {
      const response = await fetch(`${baseUrl}/verify`, {
        method: 'GET',
      });

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error).toContain('Unauthorized');
    });
  });

  describe('POST /api/auth/logout', () => {
    it('should successfully logout', async () => {
      const response = await fetch(`${baseUrl}/logout`, {
        method: 'POST',
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.message).toBe('Logout successful');
    });
  });

  describe('GET /api/auth/profile', () => {
    it('should require authentication', async () => {
      const response = await fetch(`${baseUrl}/profile`, {
        method: 'GET',
      });

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.success).toBe(false);
    });
  });

  describe('PUT /api/auth/profile', () => {
    it('should require authentication', async () => {
      const response = await fetch(`${baseUrl}/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'New Name' }),
      });

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.success).toBe(false);
    });
  });
});