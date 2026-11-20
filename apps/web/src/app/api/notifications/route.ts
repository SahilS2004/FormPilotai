import { NextResponse } from 'next/server';
import { fetchNotifications } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  const notifications = await fetchNotifications();
  return NextResponse.json({ notifications });
}
