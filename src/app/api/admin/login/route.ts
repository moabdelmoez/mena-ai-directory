import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminCredentials, createAdminSession, clearAdminSession } from '@/lib/admin-auth';
import { checkRateLimit, getRateLimitKey, RATE_LIMITS } from '@/lib/rate-limit';

export async function POST(request: NextRequest) {
  try {
    // Rate limit login attempts by IP
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      request.headers.get('x-real-ip') ||
      'unknown';
    const rateLimitKey = getRateLimitKey('adminLogin', ip);
    const rateLimit = checkRateLimit(rateLimitKey, RATE_LIMITS.adminLogin);

    if (!rateLimit.success) {
      return NextResponse.json(
        { error: 'Too many login attempts. Please try again later.', resetIn: rateLimit.resetIn },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    const result = await verifyAdminCredentials(email, password);

    if (!result.success || !result.admin) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    await createAdminSession(result.admin.id, result.admin.email);

    return NextResponse.json({
      message: 'Login successful',
      admin: { email: result.admin.email },
    });
  } catch (error) {
    console.error('Admin login error:', error);
    return NextResponse.json({ error: 'Login failed' }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    await clearAdminSession();
    return NextResponse.json({ message: 'Logged out' });
  } catch (error) {
    console.error('Admin logout error:', error);
    return NextResponse.json({ error: 'Logout failed' }, { status: 500 });
  }
}
