import { NextResponse } from 'next/server';

const PUBLIC_FILE = /\.(.*)$/;
 
export function middleware(request) {
  const isAuthenticated = request.cookies.get('authenticated')?.value === 'true';
  const url = request.nextUrl.clone();
  
  if (
    url.pathname === '/login' ||
    url.pathname.startsWith('/_next') ||
    url.pathname.startsWith('/api') ||
    PUBLIC_FILE.test(url.pathname)
  ) {
    return NextResponse.next();
  }

  if (isAuthenticated) {
    return NextResponse.next();
  }

  url.pathname = '/login';
  return NextResponse.rewrite(url);
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};