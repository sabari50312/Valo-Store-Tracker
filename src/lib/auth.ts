// Keeping you signed in. See auth.web.ts for the browser version.
import { TurboModule, TurboModuleRegistry } from 'react-native';

import { httpError } from './errors';
import { AUTH_URL, parseTokens, request, Tokens } from './riot';

/**
 * Cookie reauth without a WebView. On Android, expo/fetch with
 * credentials: 'include' uses the same cookie store as the login WebView,
 * so Riot sees the session cookie and answers with a redirect carrying fresh
 * tokens. Returns null when the session has expired (redirect goes to login).
 * Works in background tasks too.
 */
export async function silentAuth(): Promise<Tokens | null> {
  const r = await request(AUTH_URL, { credentials: 'include', redirect: 'manual' });
  if (r.status >= 500) throw httpError(r.status, 'auth.riotgames.com');
  return parseTokens(r.headers.get('location') ?? '');
}

/** Nothing to do: the login WebView leaves Riot's session cookie behind, and silentAuth() uses that. */
export function rememberLogin(_tokens: Tokens) {}

/** Signs out: clears Riot's cookies, which the login WebView shares. */
export function clearRiotSession(): Promise<void> {
  type Networking = TurboModule & { clearCookies(cb: (cleared: boolean) => void): void };
  const net = TurboModuleRegistry.get<Networking>('Networking');
  return new Promise(resolve => (net ? net.clearCookies(() => resolve()) : resolve()));
}
