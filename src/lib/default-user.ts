import { prisma } from "@/lib/prisma";

export async function getDefaultUser() {
  const email = process.env.DEFAULT_USER_EMAIL || "local@example.com";

  return prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      email,
      name: "Local User"
    }
  });
}
