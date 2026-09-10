import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  pool: Pool | undefined;
};

function createPrismaClient() {
  // Prefer pooled connection (DATABASE_URL, typically port 6543 / Supavisor) for serverless
  // Fall back to DIRECT_URL or localhost if DATABASE_URL is not set.
  const connectionString =
    process.env.DATABASE_URL ||
    process.env.DIRECT_URL ||
    "postgresql://postgres:postgres@localhost:5432/postgres";

  const isLocal = connectionString.includes("localhost") || connectionString.includes("127.0.0.1");

  // In serverless environments (Vercel), keep pool max to 1-2 per lambda instance
  // to prevent "(EMAXCONNSESSION) max clients reached" when multiple functions spin up.
  const pool =
    globalForPrisma.pool ??
    new Pool({
      connectionString,
      ssl: isLocal ? false : { rejectUnauthorized: false },
      max: process.env.NODE_ENV === "production" ? 1 : 2,
      idleTimeoutMillis: 10000,
      connectionTimeoutMillis: 8000,
    });

  globalForPrisma.pool = pool;

  const adapter = new PrismaPg(pool);
  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
