import { timingSafeEqual } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';

function constantTimeEquals(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  if (leftBuffer.length !== rightBuffer.length) return false;
  return timingSafeEqual(leftBuffer, rightBuffer);
}

export function isAdminAuthorized(request: NextRequest): boolean {
  const requiredSecret = process.env.CRON_SECRET || process.env.ADMIN_API_SECRET;

  // Keep local dev friction low when no secret is configured.
  if (process.env.NODE_ENV === 'development' && !requiredSecret) {
    return true;
  }

  if (!requiredSecret) return false;

  const authorization = request.headers.get('authorization');
  const bearerToken =
    authorization && authorization.startsWith('Bearer ')
      ? authorization.slice('Bearer '.length).trim()
      : null;
  const headerSecret = request.headers.get('x-admin-secret');

  if (bearerToken && constantTimeEquals(bearerToken, requiredSecret)) return true;
  if (headerSecret && constantTimeEquals(headerSecret, requiredSecret)) return true;

  return false;
}

export function requireAdminAuth(request: NextRequest): NextResponse | null {
  if (isAdminAuthorized(request)) return null;
  return NextResponse.json(
    {
      error: 'Unauthorized. Provide Authorization: Bearer <CRON_SECRET>.',
    },
    { status: 401 }
  );
}
