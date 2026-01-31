import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'

// All routes are public - users can browse without signing in
// Auth is only required for voting
const isPublicRoute = createRouteMatcher(['/', '/sign-in(.*)', '/sign-up(.*)'])

export default clerkMiddleware(async (auth, request) => {
  // All routes are public, but auth state is available everywhere
  // Protected actions (voting) check auth in the Convex mutations
})

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
}
