import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextRequest } from "next/server";
const isPublicRoute = createRouteMatcher([
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/sign-out(.*)",
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
]);

// Next.js 16 proxy convention requires an explicit function declaration
const authMiddleware = clerkMiddleware(async (auth, request) => {
  if (!isPublicRoute(request)) {
    await auth.protect();
  }
});

export function proxy(request: NextRequest, event: any) {
  return authMiddleware(request, event);
}

export const config = {
  matcher: [
    // Skip Next.js internals and static files
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes 
    "/(api|trpc)(.*)",
  ],
};
