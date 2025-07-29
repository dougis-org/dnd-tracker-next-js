import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { isProtectedApiRoute } from '@/lib/middleware';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (!isProtectedRoute(pathname)) {
    return NextResponse.next();
  }

  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });

  if (!token || !token.sub) {
    return isProtectedApiRoute(pathname)
      ? NextResponse.json({ error: 'Authentication required' }, { status: 401 })
      : NextResponse.redirect(new URL('/signin', request.url));
  }

  return NextResponse.next();
}

function isProtectedRoute(pathname: string): boolean {
  const protectedPaths = ['/dashboard', '/characters', '/encounters', '/parties', '/combat', '/settings'];
  return protectedPaths.some(path => pathname.startsWith(path)) || isProtectedApiRoute(pathname);
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/characters/:path*',
    '/encounters/:path*',
    '/parties/:path*',
    '/combat/:path*',
    '/settings/:path*',
    '/api/users/:path*',
    '/api/characters/:path*',
    '/api/encounters/:path*',
    '/api/combat/:path*',
    '/api/parties/:path*',
  ],
};