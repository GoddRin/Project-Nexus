import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  try {
    console.log("Enabling vector extension via Prisma...");
    await prisma.$executeRawUnsafe("CREATE EXTENSION IF NOT EXISTS vector;");
    
    const result = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
      "SELECT extname FROM pg_extension WHERE extname = 'vector';"
    );
    if (result && result.length > 0) {
      console.log(`CONFIRMATION: Extension '${result[0].extname as string}' is enabled!`);
    } else {
      console.error("Extension 'vector' is NOT enabled!");
    }
  } catch (e) {
    console.error("Error executing vector query:", e);
  } finally {
    await prisma.$disconnect();
  }
}

main();
