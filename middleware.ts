import { withAuth } from "next-auth/middleware";

export default withAuth({
  callbacks: {
    authorized: ({ token }) => !!token,
  },
});

export const config = {
  // 🛡️ THE STANDARD MATCHER (Updated)
  matcher: [
    /*
     * Match all request paths except:
     * 1. /api (All API routes, including /api/auth)
     * 2. /register (Your signup page)
     * 3. /_next (Next.js internals)
     * 4. /favicon.ico, /public files
     */
    "/((?!api|register|_next/static|_next/image|favicon.ico|public).*)",
  ],
};