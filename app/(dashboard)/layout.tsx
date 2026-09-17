import { Sidebar } from "@/components/shared/Sidebar";
import { TopBar } from "@/components/shared/TopBar";
import { MobileNavProvider } from "@/components/shared/MobileNavContext";
import { MobileNavDrawer } from "@/components/shared/MobileNavDrawer";
import { MobileBottomBar } from "@/components/shared/MobileBottomBar";
import { getCachedProject } from "@/lib/db/cachedQueries";
import { getOrCreateUser } from "@/lib/auth/getOrCreateUser";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let role = "EMPLOYEE";
  let userName = "Site Admin";
  let userEmail = "";

  try {
    const project = await getCachedProject("tumauini-hepp");
    if (project) {
      const { dbUser, member } = await getOrCreateUser(project.id);
      if (member?.role) role = member.role;
      if (dbUser?.name) userName = dbUser.name;
      if (dbUser?.email) userEmail = dbUser.email;
    }
  } catch (err) {
    console.error("DashboardLayout safe fallback during DB/auth query:", err);
    // Graceful fallback: preserve dashboard shell so users can access navigation
  }

  return (
    <MobileNavProvider>
      <div className="flex h-screen overflow-hidden bg-transparent">
        {/* Desktop persistent left sidebar */}
        <Sidebar role={role} userName={userName} userEmail={userEmail} />

        {/* Mobile slide-out navigation drawer */}
        <MobileNavDrawer role={role} userName={userName} userEmail={userEmail} />

        {/* Main content area */}
        <div className="flex flex-1 flex-col overflow-hidden min-w-0">
          {/* Top bar */}
          <TopBar />

          {/* Content — responsive padding on mobile, 100% original p-6 on desktop */}
          <main className="flex-1 overflow-y-auto p-3.5 sm:p-5 md:p-6 pb-24 md:pb-6">
            {children}
          </main>
        </div>

        {/* Mobile thumb-zone bottom navigation bar */}
        <MobileBottomBar />
      </div>
    </MobileNavProvider>
  );
}
