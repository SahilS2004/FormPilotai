import { NextResponse } from 'next/server';
import { fetchNotifications, markNotificationRead } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  const notifications = await fetchNotifications();
  return NextResponse.json({ notifications });
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const id = String(body.id || '').trim();
    if (!id) {
      return NextResponse.json({ error: 'Notification id is required' }, { status: 400 });
    }
    const notification = await markNotificationRead(id);
    if (!notification) {
      return NextResponse.json({ error: 'Notification not found' }, { status: 404 });
    }
    return NextResponse.json({ notification });
  } catch (error) {
    console.error('[notifications PATCH]', error);
    return NextResponse.json({ error: 'Failed to mark notification as read' }, { status: 500 });
  }
}
