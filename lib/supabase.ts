import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://fblrsukoifnjdahxrtrz.supabase.co";

// Client for public use (or client-side if needed)
export const supabase = createClient(
  supabaseUrl,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
);

// Admin client with secret key for server-side operations (bypasses RLS to write/read private bucket)
export const supabaseAdmin = createClient(
  supabaseUrl,
  process.env.SUPABASE_SECRET_KEY!,
  {
    auth: {
      persistSession: false,
    },
  }
);
