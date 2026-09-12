import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isConfigured } from '@/lib/supabase/config';

export async function GET(request: NextRequest) {
  const destination = new URL('/login?error=confirmation', request.url);
  if (!isConfigured()) {
    const response = NextResponse.redirect(new URL('/setup', request.url));
    response.headers.set('Cache-Control', 'no-store');
    return response;
  }

  const code = request.nextUrl.searchParams.get('code');
  const token_hash = request.nextUrl.searchParams.get('token_hash');
  const type = request.nextUrl.searchParams.get('type');

  if (code) {
    const client = await createClient();
    const { data, error } = await client.auth.exchangeCodeForSession(code);
    if (!error && data.session) {
      // The SDK returns redirectType at runtime but omits it from its public type.
      const isRecovery = 'redirectType' in data && data.redirectType === 'recovery';
      destination.pathname = isRecovery ? '/reset-password' : '/dashboard';
      destination.search = '';
    }
  } else if (token_hash && (type === 'signup' || type === 'recovery')) {
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
