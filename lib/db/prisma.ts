import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  pool: Pool | undefined;
};

function getPool(): Pool {
  if (!globalForPrisma.pool) {
    // The app talks to Supabase's transaction pooler (DATABASE_URL, port 6543): a connection is
    // borrowed per query, so up to 200 app connections share the database's 15. DIRECT_URL is the
    // session pooler, which caps at 15 clients in total across the live site and every developer;
    // it is for migrations and seed scripts (prisma.config.ts) and is only a fallback here.
    const connectionString =
      process.env.DATABASE_URL ||
      process.env.DIRECT_URL ||
      "postgresql://postgres:postgres@localhost:5432/postgres";

    const isLocal = connectionString.includes("localhost") || connectionString.includes("127.0.0.1");

    globalForPrisma.pool = new Pool({
      connectionString,
      ssl: isLocal ? false : { rejectUnauthorized: false },
      // small and quick to let go, so many server instances fit under the pooler's client limit
      max: 5,
      idleTimeoutMillis: 10000,
      connectionTimeoutMillis: 20000,
    });
  }
  return globalForPrisma.pool;
}

function getPrisma(): PrismaClient {
  if (!globalForPrisma.prisma) {
    const pool = getPool();
    const adapter = new PrismaPg(pool);
    globalForPrisma.prisma = new PrismaClient({
      adapter,
      log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
    });
  }
  return globalForPrisma.prisma;
}

export const prisma = getPrisma();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
