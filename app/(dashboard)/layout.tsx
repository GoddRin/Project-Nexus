import { Sidebar } from "@/components/shared/Sidebar";
import { TopBar } from "@/components/shared/TopBar";
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
    <div className="flex h-screen overflow-hidden bg-transparent">
      {/* Persistent left sidebar */}
      <Sidebar role={role} userName={userName} userEmail={userEmail} />

      {/* Main content area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top bar */}
        <TopBar />

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
