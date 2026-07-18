import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
prisma.project.findFirst().then(p => console.log(p?.id)).finally(() => prisma.$disconnect());
