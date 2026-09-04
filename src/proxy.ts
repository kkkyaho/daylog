import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { isConfigured, supabaseConfig } from '@/lib/supabase/config';
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  if (!isConfigured()) return response;
  const { url, key } = supabaseConfig();
  const client = createServerClient(url, key, { cookies: {
    getAll() { return request.cookies.getAll(); },
    setAll(values) {
      values.forEach(function ({ name, value }) { request.cookies.set(name, value); });
      response = NextResponse.next({ request });
      values.forEach(function ({ name, value, options }) { response.cookies.set(name, value, options); });
    }
  } });
  await client.auth.getUser();
  response.headers.set('Cache-Control', 'private, no-store');
  return response;
}
export const config = { matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'] };
