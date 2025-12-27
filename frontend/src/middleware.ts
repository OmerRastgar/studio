import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // Log for debugging
    console.log(`[Middleware] Checking request: ${pathname}`);

    // List of public paths that should NOT trigger the check
    // (Note: matcher usually handles static assets, but these are app pages)
    const publicPaths = [
        '/login',
        '/register',
        '/recovery',
        '/verification',
        '/error',
        '/auth-loading',
        '/compliance'
    ];

    const isPublic = publicPaths.some(p => pathname === p || pathname.startsWith(p + '/'));

    if (!isPublic) {
        // Check for the "auth_verified" cookie
        const verified = request.cookies.get('auth_verified');
        console.log(`[Middleware] Protected route accessed. Verified cookie: ${verified?.value}`);

        if (!verified) {
            console.log(`[Middleware] Redirecting to /auth-loading`);
            const loginUrl = new URL('/auth-loading', request.url);
            // Preserve full path including query parameters
            const fullPath = pathname + (request.nextUrl.search || '');
            loginUrl.searchParams.set('return_to', fullPath);
            console.log(`[Middleware] Full return_to path: ${fullPath}`);
            return NextResponse.redirect(loginUrl);
        }
    }

    return NextResponse.next();
}

export const config = {
    // Match everything EXCEPT:
    // - api routes
    // - _next (static files)
    // - images/favicons
    // - ...
    // But we still rely on the function's isPublic check for the public app pages to be safe
    // OR we can make the matcher very specific. 
    // Let's use negative matcher for files/api, and let function handle page logic.
    matcher: ['/((?!api|kratos|_next/static|_next/image|favicon.ico).*)'],
};
