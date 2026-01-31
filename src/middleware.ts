import { clerkMiddleware } from '@clerk/nextjs/server'

export default clerkMiddleware(() => {
  // All routes are public; auth state is available for client components.
  // Protected actions (voting) check auth in Convex mutations.
})

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
}
