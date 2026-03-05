import { createClient } from "@supabase/supabase-js";
import https from "node:https";
import http from "node:http";
import { lookup } from "node:dns";

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Custom IPv4-only agents for Node.js http/https
const ipv4Lookup = (hostname: string, options: any, callback: any) => {
  lookup(hostname, { ...options, family: 4 }, callback);
};
const httpsAgent = new https.Agent({ lookup: ipv4Lookup } as any);
const httpAgent = new http.Agent({ lookup: ipv4Lookup } as any);

// Custom fetch that forces IPv4 to fix Railway IPv6 connectivity issues
async function ipv4Fetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;

  // Use node-native http request via undici with custom dispatcher isn't reliable,
  // so we resolve the hostname to IPv4 first, then call global fetch with the IP
  const parsed = new URL(url);
  const address = await new Promise<string>((resolve, reject) => {
    lookup(parsed.hostname, { family: 4 }, (err, addr) => {
      if (err) reject(err);
      else resolve(addr);
    });
  });

  // Replace hostname with IPv4 address and set Host header
  const originalHost = parsed.host;
  parsed.hostname = address;
  const newUrl = parsed.toString();

  const headers = new Headers(init?.headers);
  if (!headers.has("Host")) {
    headers.set("Host", originalHost);
  }

  return globalThis.fetch(newUrl, { ...init, headers });
}

export const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  global: {
    fetch: ipv4Fetch,
  },
});

export const BUCKET_NAME = "attachments";
