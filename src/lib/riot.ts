// Riot client API calls. Endpoint reference: https://valapidocs.techchrism.me/
import { fetch as expoFetch } from 'expo/fetch';
import { Platform } from 'react-native';

import { AppError, httpError, toAppError } from './errors';

export const AUTH_URL =
  'https://auth.riotgames.com/authorize' +
  '?redirect_uri=https%3A%2F%2Fplayvalorant.com%2Fopt_in' +
  '&client_id=play-valorant-web-prod&response_type=token%20id_token' +
  '&nonce=1&scope=account%20openid';

export const CURRENCY = {
  VP: '85ad13f7-3d1b-5128-9eb2-7cd8ee0b5741',
  KC: '85ca954a-41f2-ce94-9b45-8ca3dd39a00d',
  RAD: 'e59aa87c-4cbf-517a-5983-6e81511be9b7',
};

// base64 of {"platformType":"PC","platformOS":"Windows",...}; same value every client sends
const CLIENT_PLATFORM =
  'ew0KCSJwbGF0Zm9ybVR5cGUiOiAiUEMiLA0KCSJwbGF0Zm9ybU9TIjogIldpbmRvd3MiLA0KCSJwbGF0' +
  'Zm9ybU9TVmVyc2lvbiI6ICIxMC4wLjE5MDQyLjEuMjU2LjY0Yml0IiwNCgkicGxhdGZvcm1DaGlwc2V0' +
  'IjogIlVua25vd24iDQp9';
// Riot region (from riot-geo) -> pd shard
const SHARDS: Record<string, string> = { na: 'na', latam: 'na', br: 'na', eu: 'eu', ap: 'ap', kr: 'kr' };

export type Tokens = { accessToken: string; idToken: string };

/** Pulls tokens out of the playvalorant.com/opt_in#access_token=... redirect. */
export function parseTokens(url: string): Tokens | null {
  const hash = url.split('#')[1];
  if (!hash) return null;
  const params: Record<string, string> = {};
  for (const pair of hash.split('&')) {
    const [k, v = ''] = pair.split('=');
    params[k] = decodeURIComponent(v);
  }
  if (!params.access_token || !params.id_token) return null;
  return { accessToken: params.access_token, idToken: params.id_token };
}

type Init = Parameters<typeof expoFetch>[1];
const TIMEOUT_MS = 20_000;

/** fetch with a timeout, and transport failures mapped to AppError. */
export async function request(url: string, init?: Init) {
  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, TIMEOUT_MS);
  try {
    return await expoFetch(url, { ...init, signal: controller.signal });
  } catch (e) {
    if (timedOut) throw new AppError('timeout', url.split('/')[2]);
    throw Platform.OS === 'web' && e instanceof TypeError ? await browserFetchError(url, e) : toAppError(e);
  } finally {
    clearTimeout(timer);
  }
}

/**
 * In a browser, fetch() rejects with a bare TypeError both when the network is
 * down and when a response lacks CORS headers. Riot's auth servers send their
 * 401s without them, so an expired token looks like a network failure. A
 * no-cors request to the same host tells the two apart.
 */
async function browserFetchError(url: string, e: TypeError): Promise<AppError> {
  const host = url.split('/')[2];
  // Same URL rather than the host root: entitlements' root redirects to plain http, which browsers block.
  const reachable = await fetch(url, { mode: 'no-cors' }).then(
    () => true,
    () => false,
  );
  return reachable && host.endsWith('.riotgames.com')
    ? new AppError('session', `${host} rejected the login`)
    : new AppError('offline', e.message);
}

export async function json<T = any>(url: string, init?: Init): Promise<T> {
  const r = await request(url, init);
  if (!r.ok) throw httpError(r.status, url.split('/')[2]);
  try {
    return (await r.json()) as T;
  } catch {
    throw new AppError('changed', `invalid JSON from ${url.split('/')[2]}`);
  }
}

export type Session = {
  puuid: string;
  riotId: string | null; // "Name#TAG"

  pd: string; // https://pd.{shard}.a.pvp.net
  headers: Record<string, string>;
};

/** A JWT's payload. Riot's tokens are JWTs; the id_token carries the account id (sub) and Riot ID (acct). */
export function jwtClaims(jwt: string): any {
  const b64 = jwt.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
  const bytes = atob(b64 + '='.repeat(-b64.length & 3));
  // atob gives one char per byte; percent-decoding turns the UTF-8 back into text (Riot IDs can be non-ASCII).
  return JSON.parse(decodeURIComponent(Array.from(bytes, c => '%' + c.charCodeAt(0).toString(16).padStart(2, '0')).join('')));
}

/** Exchanges tokens for everything the pd.* endpoints need. */
export async function openSession(t: Tokens): Promise<Session> {
  const bearer = { Authorization: `Bearer ${t.accessToken}` };
  const jsonPost = { ...bearer, 'Content-Type': 'application/json' };

  // The id_token already names the account, so there's no call to /userinfo
  // (whose replies browsers block: it sends no CORS header).
  const user = jwtClaims(t.idToken);
  const [ent, geo, version] = await Promise.all([
    json('https://entitlements.auth.riotgames.com/api/token/v1', { method: 'POST', headers: jsonPost, body: '{}' }),
    json('https://riot-geo.pas.si.riotgames.com/pas/v1/product/valorant', {
      method: 'PUT',
      headers: jsonPost,
      body: JSON.stringify({ id_token: t.idToken }),
    }),
    json('https://valorant-api.com/v1/version'),
  ]);

  const region: string = geo.affinities.live;
  return {
    puuid: user.sub,
    riotId: user.acct?.game_name ? `${user.acct.game_name}#${user.acct.tag_line}` : null,
    pd: `https://pd.${SHARDS[region] ?? region}.a.pvp.net`,
    headers: {
      ...bearer,
      'X-Riot-Entitlements-JWT': ent.entitlements_token,
      'X-Riot-ClientPlatform': CLIENT_PLATFORM,
      'X-Riot-ClientVersion': version.data.riotClientVersion,
    },
  };
}

export function fetchStorefront(s: Session): Promise<any> {
  return json(`${s.pd}/store/v3/storefront/${s.puuid}`, {
    method: 'POST',
    headers: { ...s.headers, 'Content-Type': 'application/json' },
    body: '{}',
  });
}

export async function fetchWallet(s: Session): Promise<Record<string, number>> {
  const w = await json(`${s.pd}/store/v1/wallet/${s.puuid}`, { headers: s.headers });
  return w.Balances ?? {};
}
