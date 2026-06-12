import { prisma } from "@/lib/prisma";
import { getDefaultUser } from "@/lib/default-user";
import { Sidebar } from "@/components/sidebar";

export async function AppShell({ children }: { children: React.ReactNode }) {
  const user = await getDefaultUser();
  const projects = await prisma.searchProject.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 20
  });

  return (
    <div>
      <Sidebar projects={projects} />
      <main className="min-h-screen px-4 py-6 lg:ml-72 lg:px-8">{children}</main>
    </div>
  );
}
