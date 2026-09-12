import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';
import { NextRequest, NextResponse } from 'next/server';

// Execute the actual route with only its server configuration and auth calls stubbed.
const source = readFileSync(new URL('../src/app/auth/confirm/route.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }
}).outputText;

const cases = [
  { name: 'missing configuration', configured: false, query: '?code=valid', path: '/setup' },
  { name: 'missing token', query: '', path: '/login?error=confirmation' },
  { name: 'unsupported OTP type', query: '?token_hash=hash&type=invite', path: '/login?error=confirmation' },
  { name: 'signup code', query: '?code=valid', method: 'code', path: '/dashboard' },
  { name: 'recovery code', query: '?code=valid', method: 'code', recovery: true, path: '/reset-password' },
  { name: 'failed code', query: '?code=valid', method: 'code', fails: true, path: '/login?error=confirmation' },
  { name: 'code without session', query: '?code=valid', method: 'code', noSession: true, path: '/login?error=confirmation' },
  { name: 'signup OTP', query: '?token_hash=hash&type=signup', method: 'otp', path: '/dashboard' },
  { name: 'recovery OTP', query: '?token_hash=hash&type=recovery', method: 'otp', path: '/reset-password' },
  { name: 'failed OTP', query: '?token_hash=hash&type=signup', method: 'otp', fails: true, path: '/login?error=confirmation' },
  { name: 'code takes precedence', query: '?code=valid&token_hash=hash&type=recovery', method: 'code', path: '/dashboard' }
];

for (const scenario of cases) {
  test('auth confirmation: ' + scenario.name, async () => {
    const calls: string[] = [];
    const auth = {
      async exchangeCodeForSession(code: string) {
        assert.equal(code, 'valid');
        calls.push('code');
        return {
          data: { session: scenario.noSession || scenario.fails ? null : {},
            ...(scenario.recovery ? { redirectType: 'recovery' } : {}) },
          error: scenario.fails ? new Error('invalid code') : null
        };
      },
      async verifyOtp(input: { token_hash: string; type: string }) {
        assert.equal(input.token_hash, 'hash');
        assert.equal(input.type, new URLSearchParams(scenario.query).get('type'));
        calls.push('otp');
        return { error: scenario.fails ? new Error('expired token') : null };
      }
    };
    const exports: { GET?: (request: NextRequest) => Promise<Response> } = {};
    runInNewContext(compiled, {
      exports, URL,
      require(name: string) {
        if (name === 'next/server') return { NextResponse };
        if (name === '@/lib/supabase/server') return { createClient: async () => ({ auth }) };
        if (name === '@/lib/supabase/config') return { isConfigured: () => scenario.configured !== false };
        throw new Error('Unexpected import: ' + name);
      }
    });
    const response = await exports.GET!(new NextRequest('https://daylog.example/auth/confirm' + scenario.query));
    assert.equal(response.status, 307);
    assert.equal(response.headers.get('location'), 'https://daylog.example' + scenario.path);
    assert.equal(response.headers.get('cache-control'), 'no-store');
    assert.deepEqual(calls, scenario.method ? [scenario.method] : []);
  });
}
