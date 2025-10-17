import { NextRequest } from 'next/server';
import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';
import { 
  successResponse, 
  errorResponse, 
  parseRequestBody, 
  validateRequiredFields,
  checkRateLimit,
  isValidEmail,
  logApiRequest
} from '@/app/api/utils';
import { getUserByEmail, updateUserLastLogin } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    // Rate limiting by IP
    const ip = request.headers.get('x-forwarded-for') || 'unknown';
    if (!checkRateLimit(`login:${ip}`, 5, 300000)) { // 5 attempts per 5 minutes
      return errorResponse('Too many login attempts. Please try again later.', 429);
    }

    // Parse request body
    const body = await parseRequestBody<{ email: string; password: string }>(request);
    if (!body) {
      return errorResponse('Invalid request body', 400);
    }

    // Validate required fields
    const validationError = validateRequiredFields(body, ['email', 'password']);
    if (validationError) {
      return errorResponse(validationError, 400);
    }

    // Validate email format
    if (!isValidEmail(body.email)) {
      return errorResponse('Invalid email format', 400);
    }

    // Log the request
    logApiRequest('POST', '/api/auth/login', undefined, { email: body.email });

    // Get user from database
    const user = await getUserByEmail(body.email);
    if (!user) {
      return errorResponse('Invalid email or password', 401);
    }

    // Verify password
    const passwordValid = await bcrypt.compare(body.password, user.password_hash);
    if (!passwordValid) {
      return errorResponse('Invalid email or password', 401);
    }

    // Update last login time
    try {
      await updateUserLastLogin(user.id);
    } catch (error) {
      // Non-critical, don't fail the login
      console.error('Failed to update last login:', error);
    }

    // Set session cookie
    const cookieStore = await cookies();
    const sessionData = {
      email: user.email,
      userId: user.id.toString(),
      name: user.name,
    };

    cookieStore.set('session', JSON.stringify(sessionData), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
    });

    // Return user data (without password hash)
    return successResponse({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    }, 'Login successful');

  } catch (error) {
    console.error('Login error:', error);
    return errorResponse('Login failed. Please try again.', 500);
  }
}