// Riot client API calls for the daily store. Endpoint reference: https://valapidocs.techchrism.me/

export const AUTH_URL =
  'https://auth.riotgames.com/authorize' +
  '?redirect_uri=https%3A%2F%2Fplayvalorant.com%2Fopt_in' +
  '&client_id=play-valorant-web-prod&response_type=token%20id_token' +
  '&nonce=1&scope=account%20openid';

const VP = '85ad13f7-3d1b-5128-9eb2-7cd8ee0b5741';
// base64 of {"platformType":"PC","platformOS":"Windows",...}; same value every client sends
const CLIENT_PLATFORM =
  'ew0KCSJwbGF0Zm9ybVR5cGUiOiAiUEMiLA0KCSJwbGF0Zm9ybU9TIjogIldpbmRvd3MiLA0KCSJwbGF0' +
  'Zm9ybU9TVmVyc2lvbiI6ICIxMC4wLjE5MDQyLjEuMjU2LjY0Yml0IiwNCgkicGxhdGZvcm1DaGlwc2V0' +
  'IjogIlVua25vd24iDQp9';
// Riot region (from riot-geo) -> pd shard
const SHARDS: Record<string, string> = { na: 'na', latam: 'na', br: 'na', eu: 'eu', ap: 'ap', kr: 'kr' };

export type Tokens = { accessToken: string; idToken: string };

export type Item = {
  name: string;
  image: string | null;
  tierColor: string | null;
  price: number;
  basePrice?: number;
  discount?: number;
};

export type Store = {
  fetchedAt: number;
  daily: { remaining: number; items: Item[] };
  nightMarket: { remaining: number; items: Item[] } | null;
  bundles: { name: string; image: string | null; price: number; remaining: number; items: string[] }[];
};

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

async function json<T = any>(url: string, init?: RequestInit): Promise<T> {
  const r = await fetch(url, init);
  if (!r.ok) throw new Error(`${r.status} from ${url.split('/')[2]}`);
  return r.json();
}

// --- valorant-api.com catalog (names, images, rarity) ----------------------

type SkinInfo = { name: string; image: string | null; tierColor: string | null };
let catalog: Promise<Map<string, SkinInfo>> | null = null;

function loadCatalog() {
  catalog ??= (async () => {
    const [tiers, skins] = await Promise.all([
      json('https://valorant-api.com/v1/contenttiers'),
      json('https://valorant-api.com/v1/weapons/skins'),
    ]);
    const tierColor = new Map<string, string>(
      tiers.data.map((t: any) => [t.uuid, '#' + t.highlightColor.slice(0, 6)]),
    );
    const byLevel = new Map<string, SkinInfo>();
    for (const skin of skins.data) {
      const chroma = skin.chromas?.[0] ?? {};
      for (const level of skin.levels ?? []) {
        byLevel.set(level.uuid, {
          name: skin.displayName,
          image: level.displayIcon ?? chroma.fullRender ?? skin.displayIcon ?? null,
          tierColor: tierColor.get(skin.contentTierUuid) ?? null,
        });
      }
    }
    return byLevel;
  })().catch(e => {
    catalog = null; // retry on next load instead of caching the failure
    throw e;
  });
  return catalog;
}

// --- store ------------------------------------------------------------------

export async function getStore(t: Tokens): Promise<Store> {
  const bearer = { Authorization: `Bearer ${t.accessToken}` };
  const post = (body: object) => ({
    method: 'POST',
    headers: { ...bearer, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const [ent, user, geo, version, skins] = await Promise.all([
    json('https://entitlements.auth.riotgames.com/api/token/v1', post({})),
    json('https://auth.riotgames.com/userinfo', { headers: bearer }),
    json('https://riot-geo.pas.si.riotgames.com/pas/v1/product/valorant', {
      ...post({ id_token: t.idToken }),
      method: 'PUT',
    }),
    json('https://valorant-api.com/v1/version'),
    loadCatalog(),
  ]);

  const region: string = geo.affinities.live;
  const raw = await json(
    `https://pd.${SHARDS[region] ?? region}.a.pvp.net/store/v3/storefront/${user.sub}`,
    {
      method: 'POST',
      headers: {
        ...bearer,
        'Content-Type': 'application/json',
        'X-Riot-Entitlements-JWT': ent.entitlements_token,
        'X-Riot-ClientPlatform': CLIENT_PLATFORM,
        'X-Riot-ClientVersion': version.data.riotClientVersion,
      },
      body: '{}',
    },
  );

  const skin = (id: string): SkinInfo => skins.get(id) ?? { name: 'Unknown item', image: null, tierColor: null };

  const panel = raw.SkinsPanelLayout;
  const daily = panel.SingleItemStoreOffers.map((o: any) => ({
    ...skin(o.Rewards[0].ItemID),
    price: o.Cost[VP],
  }));

  const bonus = raw.BonusStore;
  const nightMarket = bonus
    ? {
        remaining: bonus.BonusStoreRemainingDurationInSeconds,
        items: bonus.BonusStoreOffers.map((o: any) => ({
          ...skin(o.Offer.Rewards[0].ItemID),
          price: o.DiscountCosts[VP],
          basePrice: o.Offer.Cost[VP],
          discount: o.DiscountPercent,
        })),
      }
    : null;

  const bundles = await Promise.all(
    (raw.FeaturedBundle?.Bundles ?? []).map(async (b: any) => {
      const info = await json(`https://valorant-api.com/v1/bundles/${b.DataAssetID}`).catch(() => null);
      return {
        name: info?.data.displayName ?? 'Bundle',
        image: info?.data.displayIcon ?? null,
        price: b.TotalDiscountedCost?.[VP] ?? 0,
        remaining: b.DurationRemainingInSeconds,
        items: b.Items.map((i: any) => skins.get(i.Item.ItemID)?.name).filter(Boolean),
      };
    }),
  );

  return {
    fetchedAt: Date.now(),
    daily: { remaining: panel.SingleItemOffersRemainingDurationInSeconds, items: daily },
    nightMarket,
    bundles,
  };
}
