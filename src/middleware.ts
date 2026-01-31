import { clerkMiddleware } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const STAGING_PASSWORD = process.env.STAGING_PASSWORD
const COOKIE_NAME = "staging_auth"

// Paths that should be accessible without staging auth
const PUBLIC_PATHS = [
  '/maintenance',
  '/api/staging-auth',
  '/_next',
  '/favicon.ico',
  '/icon.png',
  '/apple-icon.png',
]

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some(path => pathname.startsWith(path))
}

function checkStagingAuth(request: NextRequest): boolean {
  // If no staging password is configured, allow all access
  if (!STAGING_PASSWORD) {
    return true
  }

  const authCookie = request.cookies.get(COOKIE_NAME)
  if (!authCookie) {
    return false
  }

  // Verify the cookie value
  const expectedValue = Buffer.from(STAGING_PASSWORD).toString("base64")
  return authCookie.value === expectedValue
}

export default clerkMiddleware((auth, request) => {
  const { pathname } = request.nextUrl

  // Skip staging auth check for public paths
  if (isPublicPath(pathname)) {
    return
  }

  // Check staging authentication
  if (STAGING_PASSWORD && !checkStagingAuth(request)) {
    const maintenanceUrl = new URL('/maintenance', request.url)
    return NextResponse.redirect(maintenanceUrl)
  }

  // All routes are public; auth state is available for client components.
  // Protected actions (voting/reviews) check auth in Convex mutations.
})

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
}
