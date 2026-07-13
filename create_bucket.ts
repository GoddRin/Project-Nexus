import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://fblrsukoifnjdahxrtrz.supabase.co";
const supabase = createClient(supabaseUrl, process.env.SUPABASE_SECRET_KEY!);

async function main() {
  // Create private documents bucket
  const { data, error } = await supabase.storage.createBucket("documents", {
    public: false,
    fileSizeLimit: 26214400, // 25MB in bytes
  });

  if (error) {
    console.error("Error creating bucket:", error);
  } else {
    console.log("Bucket created successfully:", data);
  }
}

main();
