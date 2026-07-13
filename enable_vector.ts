import { Client } from "pg";
import dotenv from "dotenv";

dotenv.config();

async function main() {
  const client = new Client({
    connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log("Connected to database. Enabling extension 'vector'...");
    
    await client.query("CREATE EXTENSION IF NOT EXISTS vector;");
    console.log("Extension 'vector' creation query executed.");

    const res = await client.query("SELECT extname FROM pg_extension WHERE extname = 'vector';");
    if (res.rows.length > 0) {
      console.log(`CONFIRMATION: Extension '${res.rows[0].extname}' is enabled!`);
    } else {
      console.error("Extension 'vector' is NOT enabled!");
    }
  } catch (err) {
    console.error("Error executing query:", err);
  } finally {
    await client.end();
  }
}

main();
