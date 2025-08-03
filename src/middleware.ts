import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { isProtectedApiRoute } from '@/lib/middleware';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (!isProtectedRoute(pathname)) {
    return NextResponse.next();
  }

  try {
    const token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET,
    });

    if (!token || !token.sub) {
      if (isProtectedApiRoute(pathname)) {
        return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
      }

      // Create signin URL with callback parameter
      const signinUrl = new URL('/signin', request.url);
      
      // Fix callback URL to use production domain instead of localhost
      const callbackUrl = new URL(request.nextUrl.pathname + request.nextUrl.search, 
                                  process.env.NEXTAUTH_URL || request.url);
      signinUrl.searchParams.set('callbackUrl', callbackUrl.toString());

      return NextResponse.redirect(signinUrl);
    }

    return NextResponse.next();
  } catch (error) {
    console.error('Middleware authentication error:', error);

    if (isProtectedApiRoute(pathname)) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Redirect to signin on any authentication error
    const signinUrl = new URL('/signin', request.url);
    
    // Fix callback URL to use production domain
    const callbackUrl = new URL(request.nextUrl.pathname + request.nextUrl.search, 
                                process.env.NEXTAUTH_URL || request.url);
    signinUrl.searchParams.set('callbackUrl', callbackUrl.toString());
    
    return NextResponse.redirect(signinUrl);
  }
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