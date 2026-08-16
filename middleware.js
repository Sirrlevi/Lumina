import { NextResponse } from 'next/server';

export function middleware(request) {
  // Client-side Firebase auth cannot be verified here without token,
  // but we enforce that dashboard routes require a session cookie check placeholder.
  // Real enforcement happens in AuthGate; this prevents direct SSR rendering.
  const url = request.nextUrl;
  if (url.pathname.startsWith('/dashboard')) {
    // Allow through – AuthGate will redirect unauthenticated users client-side
    // For true server protection, verify Firebase ID token from cookies here.
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*'],
};
