import { Sidebar } from "@/components/shared/Sidebar";
import { TopBar } from "@/components/shared/TopBar";
import { prisma } from "@/lib/db/prisma";
import { getOrCreateUser } from "@/lib/auth/getOrCreateUser";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const project = await prisma.project.findUnique({
    where: { slug: "tumauini-hepp" },
  });
  if (!project) {
    throw new Error("Project 'tumauini-hepp' not found in database.");
  }

  const { dbUser, member } = await getOrCreateUser(project.id);
  const role = member?.role || "EMPLOYEE";
  const userName = dbUser?.name || "Site Admin";
  const userEmail = dbUser?.email || "";

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
