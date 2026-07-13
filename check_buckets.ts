import "dotenv/config";
import pg from "pg";

async function main() {
  const client = new pg.Client({
    connectionString: process.env.DIRECT_URL,
  });
  await client.connect();

  try {
    // Query buckets
    const bucketsRes = await client.query(`SELECT id, name, public, file_size_limit, allowed_mime_types FROM storage.buckets`);
    console.log("Supabase Storage Buckets:");
    console.log(JSON.stringify(bucketsRes.rows, null, 2));

    // Query security policies for the documents bucket
    const policiesRes = await client.query(`
      SELECT schemaname, tablename, policyname, roles, cmd, qual, with_check 
      FROM pg_policies 
      WHERE schemaname = 'storage'
    `);
    console.log("\nStorage RLS Policies:");
    console.log(JSON.stringify(policiesRes.rows, null, 2));
  } catch (error) {
    console.error("Error querying storage schema:", error);
  } finally {
    await client.end();
  }
}

main();
