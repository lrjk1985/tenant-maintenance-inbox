import { createServerClient } from "@supabase/ssr";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

import { getPublicSupabaseConfig, getServerSupabaseConfig } from "@/lib/env";

let adminClient: SupabaseClient | null = null;

export async function createSupabaseServerClient() {
  const config = getPublicSupabaseConfig();

  if (!config) {
    throw new Error("Supabase public environment variables are not configured.");
  }

  const cookieStore = await cookies();

  return createServerClient(config.url, config.publishableKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Server Components can read cookies but cannot always write refreshed ones.
        }
      },
    },
  });
}

export function getSupabaseAdminClient() {
  const config = getServerSupabaseConfig();

  if (!config) {
    throw new Error("Supabase server environment variables are not configured.");
  }

  if (!adminClient) {
    adminClient = createClient(config.url, config.secretKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }

  return adminClient;
}
