import { createClient } from "@supabase/supabase-js";
import { Agent, setGlobalDispatcher } from "undici";
import { lookup } from "node:dns";

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Force IPv4 globally for undici (Node.js built-in fetch) to fix Railway IPv6 issues
setGlobalDispatcher(
  new Agent({
    connect: {
      lookup: (hostname, options, callback) => {
        lookup(hostname, { family: 4 }, (err, address, family) => {
          callback(err, address, family);
        });
      },
    },
  })
);

export const supabase = createClient(supabaseUrl, supabaseServiceKey);

export const BUCKET_NAME = "attachments";
