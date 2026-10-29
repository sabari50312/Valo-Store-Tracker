// Browser version of auth.ts. A web page can't use Riot's session cookie (it
// belongs to auth.riotgames.com), so there's no silent reauth: the tokens from
// the last login are kept until they expire, about an hour later.
import Storage from './kv';
import { jwtClaims, Tokens } from './riot';

const KEY = 'riotLogin';
const FALLBACK_LIFETIME_MS = 55 * 60_000;
const MARGIN_MS = 60_000; // don't start loading with a token about to expire

type Saved = Tokens & { expiresAt: number };

export async function silentAuth(): Promise<Tokens | null> {
  const raw = Storage.getItemSync(KEY);
  if (!raw) return null;
  const { expiresAt, ...tokens } = JSON.parse(raw) as Saved;
  if (Date.now() < expiresAt - MARGIN_MS) return tokens;
  Storage.removeItemSync(KEY);
  return null;
}

export function rememberLogin(tokens: Tokens) {
  const saved: Saved = { ...tokens, expiresAt: expiry(tokens.accessToken) };
  Storage.setItemSync(KEY, JSON.stringify(saved));
}

/** Forgets the tokens. You stay logged in on Riot's own site, so the next login is quick. */
export async function clearRiotSession() {
  Storage.removeItemSync(KEY);
}

/** The access token is a JWT; its exp claim says when Riot stops accepting it. */
function expiry(jwt: string) {
  try {
    const exp = jwtClaims(jwt).exp;
    if (typeof exp === 'number') return exp * 1000;
  } catch {}
  return Date.now() + FALLBACK_LIFETIME_MS;
}
