import { NextRequest, NextResponse } from 'next/server';

function getBasicCredentials(authHeader: string): { username: string; password: string } | null {
  if (!authHeader.startsWith('Basic ')) return null;
  const encoded = authHeader.slice('Basic '.length).trim();
  if (!encoded) return null;

  try {
    const decoded = atob(encoded);
    const separatorIndex = decoded.indexOf(':');
    if (separatorIndex < 0) return null;
    return {
      username: decoded.slice(0, separatorIndex),
      password: decoded.slice(separatorIndex + 1),
    };
  } catch {
    return null;
  }
}

function unauthorizedResponse(isApiRoute: boolean): NextResponse {
  const headers = { 'WWW-Authenticate': 'Basic realm="LeadForge"' };
  if (isApiRoute) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401, headers });
  }
  return new NextResponse('Authentication required', { status: 401, headers });
}

export function middleware(request: NextRequest) {
  const requiredPassword = process.env.APP_PASSWORD;
  if (!requiredPassword) return NextResponse.next();

  const requiredUsername = process.env.APP_USERNAME || 'admin';
  const isApiRoute = request.nextUrl.pathname.startsWith('/api');
  const authHeader = request.headers.get('authorization');

  if (!authHeader) return unauthorizedResponse(isApiRoute);
  const credentials = getBasicCredentials(authHeader);
  if (!credentials) return unauthorizedResponse(isApiRoute);

  if (
    credentials.username !== requiredUsername ||
    credentials.password !== requiredPassword
  ) {
    return unauthorizedResponse(isApiRoute);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)',
  ],
};
