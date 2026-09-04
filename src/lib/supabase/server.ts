import 'server-only';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { cache } from 'react';
import { isConfigured, supabaseConfig } from './config';

export async function createClient() {
  const store = await cookies();
  const { url, key } = supabaseConfig();
  return createServerClient(url, key, {
    cookies: {
      getAll() { return store.getAll(); },
      setAll(values) {
        try { values.forEach(function ({ name, value, options }) { store.set(name, value, options); }); }
        catch { /* Server Component cannot write cookies; proxy refreshes them. */ }
      }
    }
  });
}
export const requireUser = cache(async function requireUser() {
  if (!isConfigured()) redirect('/setup');
  const client = await createClient();
  const { data, error } = await client.auth.getUser();
  if (error || !data.user) redirect('/login');
  return { client, user: data.user };
});
