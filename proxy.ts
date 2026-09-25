import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextRequest } from "next/server";
const isPublicRoute = createRouteMatcher([
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/sign-out(.*)",
  "/digital-twin(.*)",
  "/dashboard/projects-map(.*)",
  "/dashboard/projects(.*)",
  "/api/webhook(.*)",
  "/api/assistant/reindex(.*)",
  // Mobile app public routes — no Clerk session available on the device
  "/api/health",
  "/api/weather(.*)",
  "/api/weather/typhoons(.*)",
  "/api/weather/pagasa-signals(.*)",
  "/api/weather/rain-forecast(.*)",
  "/api/daily-logs(.*)",
  "/api/incidents(.*)",
  "/api/mobile(.*)",
  "/api/notifications(.*)",
  "/api/projects(.*)",
  "/api/regional-map(.*)",
  "/models/(.*)",
  "/maplibre-gl-worker(.*)",
  "/maplibre-gl-shared(.*)",
]);

export default clerkMiddleware(async (auth, request) => {
  if (!isPublicRoute(request)) {
    if (request.nextUrl.pathname.startsWith("/api/")) {
      const { userId } = await auth();
      if (!userId) {
        return new Response(JSON.stringify({ error: "Unauthorized. Please sign in." }), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        });
      }
    } else {
      await auth.protect();
    }
  }
});

export const config = {
  matcher: [
    // Skip Next.js internals and static files
    "/((?!_next|[^?]*\\.(?:html?|css|m?js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes 
    "/(api|trpc)(.*)",
  ],
};
