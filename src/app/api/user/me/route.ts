import { NextResponse } from 'next/server';
import { stackServerApp } from '@/lib/auth';
import { getOrCreateUser } from '@/lib/auth-helpers';

export const dynamic = 'force-dynamic';

export async function GET() {
  const stackUser = await stackServerApp.getUser();

  if (!stackUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const userId = await getOrCreateUser(stackUser);
    return NextResponse.json({ id: userId, email: stackUser.primaryEmail });
  } catch {
    return NextResponse.json({ error: 'Failed to sync user' }, { status: 500 });
  }
}
