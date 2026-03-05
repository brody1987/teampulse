import { createClient } from "@supabase/supabase-js";
import nodeFetch from "node-fetch";

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Use node-fetch instead of built-in fetch (undici).
// node-fetch uses Node's http/https modules which respect
// dns.setDefaultResultOrder("ipv4first") set in index.ts,
// fixing Railway's IPv6 connectivity issues with Supabase.
export const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  global: {
    fetch: nodeFetch as unknown as typeof fetch,
  },
});

export const BUCKET_NAME = "attachments";
