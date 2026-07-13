import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://fblrsukoifnjdahxrtrz.supabase.co";
const supabase = createClient(supabaseUrl, process.env.SUPABASE_SECRET_KEY!);

async function main() {
  const { data, error } = await supabase.storage.createBucket("equipment-docs", {
    public: false,
    fileSizeLimit: 52428800, // 50MB in bytes
  });

  if (error) {
    console.error("Error creating bucket:", error);
  } else {
    console.log("Bucket created successfully:", data);
  }
}

main();
