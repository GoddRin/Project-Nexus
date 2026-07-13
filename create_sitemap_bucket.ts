import "dotenv/config";
import pg from "pg";

async function main() {
  const client = new pg.Client({
    connectionString: process.env.DIRECT_URL,
  });
  await client.connect();

  try {
    const bucketName = "sitemap-photos";

    // 1. Check if it exists
    const checkRes = await client.query(`SELECT id FROM storage.buckets WHERE id = $1`, [bucketName]);
    if (checkRes.rows.length === 0) {
      console.log(`Bucket '${bucketName}' does not exist. Creating...`);
      // 2. Create bucket
      await client.query(`
        INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
        VALUES ($1, $1, false, 52428800, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic'])
      `, [bucketName]);
      console.log(`Bucket '${bucketName}' created.`);
    } else {
      console.log(`Bucket '${bucketName}' already exists.`);
    }

    // 3. Create RLS policies for sitemap-photos (similar to report-photos)
    // For simplicity, we just allow all authenticated users in Supabase to select/insert/update/delete.
    // The application level will enforce strict controls since the app uses Service Role to upload/fetch via Clerk auth.

  } catch (error) {
    console.error("Error creating bucket:", error);
  } finally {
    await client.end();
  }
}

main();
