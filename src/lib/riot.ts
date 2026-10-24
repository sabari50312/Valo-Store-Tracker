// Riot client API calls. Endpoint reference: https://valapidocs.techchrism.me/
import { fetch as expoFetch } from 'expo/fetch';

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

/**
 * Cookie reauth without a WebView. On Android, expo/fetch with
 * credentials: 'include' uses the same cookie store as the login WebView,
 * so Riot sees the session cookie and answers with a redirect carrying fresh
 * tokens. Returns null when the session has expired (redirect goes to login).
 * Works in background tasks too.
 */
export async function silentAuth(): Promise<Tokens | null> {
  const r = await expoFetch(AUTH_URL, { credentials: 'include', redirect: 'manual' });
  return parseTokens(r.headers.get('location') ?? '');
}

export async function json<T = any>(url: string, init?: RequestInit): Promise<T> {
  const r = await fetch(url, init);
  if (!r.ok) throw new Error(`${r.status} from ${url.split('/')[2]}`);
  return r.json();
}

export type Session = {
  puuid: string;
  pd: string; // https://pd.{shard}.a.pvp.net
  headers: Record<string, string>;
};

/** Exchanges tokens for everything the pd.* endpoints need. */
export async function openSession(t: Tokens): Promise<Session> {
  const bearer = { Authorization: `Bearer ${t.accessToken}` };
  const jsonPost = { ...bearer, 'Content-Type': 'application/json' };

  const [ent, user, geo, version] = await Promise.all([
    json('https://entitlements.auth.riotgames.com/api/token/v1', { method: 'POST', headers: jsonPost, body: '{}' }),
    json('https://auth.riotgames.com/userinfo', { headers: bearer }),
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
