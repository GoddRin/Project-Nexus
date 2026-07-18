import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.findFirst({
    where: { email: 'romeo@projectnexus.dev' }
  });

  if (!user) {
    console.log('User not found');
    return;
  }

  const updatedMember = await prisma.projectMember.updateMany({
    where: { userId: user.id },
    data: { role: 'PROJECT_MANAGER' }
  });

  console.log('Updated member:', updatedMember);
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
