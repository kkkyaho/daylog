import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isConfigured } from '@/lib/supabase/config';
export async function GET(request: NextRequest) {
  const destination = new URL('/login?error=confirmation', request.url);
  if (!isConfigured()) return NextResponse.redirect(new URL('/setup', request.url));
  const token_hash = request.nextUrl.searchParams.get('token_hash');
  const type = request.nextUrl.searchParams.get('type');
  if (token_hash && (type === 'signup' || type === 'recovery')) {
    const client = await createClient();
    const { error } = await client.auth.verifyOtp({ token_hash, type });
    if (!error) {
      destination.pathname = type === 'recovery' ? '/reset-password' : '/dashboard';
      destination.search = '';
    }
  }
  const response = NextResponse.redirect(destination);
  response.headers.set('Cache-Control', 'no-store');
  return response;
}
