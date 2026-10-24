// Turns Riot's raw storefront into what the screens render.
import { Accessory, Catalog, lookupAccessory } from './catalog';
import { CURRENCY, fetchStorefront, fetchWallet, json, Session } from './riot';

export type Item = {
  skinId: string | null;
  levelId: string;
  name: string;
  image: string | null;
  tierColor: string | null;
  tierIcon: string | null;
  price: number;
  basePrice?: number;
  discount?: number;
};

export type AccessoryOffer = Accessory & { id: string; price: number };

export type Bundle = { id: string; name: string; image: string | null; price: number; remaining: number; items: string[] };

export type Store = {
  fetchedAt: number;
  wallet: { vp: number; kc: number; rad: number } | null; // null if the wallet call failed
  catalogMissing: boolean; // skin names/images unavailable (valorant-api.com down)
  daily: { remaining: number; items: Item[] };
  nightMarket: { remaining: number; items: Item[] } | null;
  accessories: { remaining: number; items: AccessoryOffer[] } | null;
  bundles: Bundle[];
};

/** Skin level ids currently on offer (daily + night market). Used by alerts too. */
export function offeredLevelIds(raw: any): string[] {
  const daily = raw.SkinsPanelLayout.SingleItemStoreOffers.map((o: any) => o.Rewards[0].ItemID);
  const night = (raw.BonusStore?.BonusStoreOffers ?? []).map((o: any) => o.Offer.Rewards[0].ItemID);
  return [...daily, ...night];
}

/** The storefront is required; the wallet and skin catalog are optional extras. */
export async function loadStore(session: Session, catalog: Catalog | null): Promise<{ store: Store; raw: any }> {
  const [raw, balances] = await Promise.all([fetchStorefront(session), fetchWallet(session).catch(() => null)]);

  const item = (levelId: string, price: number): Item => {
    const skin = catalog?.byLevel.get(levelId);
    return {
      skinId: skin?.id ?? null,
      levelId,
      name: skin?.name ?? 'Unknown item',
      image: skin?.image ?? null,
      tierColor: skin?.tierColor ?? null,
      tierIcon: skin?.tierIcon ?? null,
      price,
    };
  };

  const panel = raw.SkinsPanelLayout;
  const daily = panel.SingleItemStoreOffers.map((o: any) => item(o.Rewards[0].ItemID, o.Cost[CURRENCY.VP]));

  const bonus = raw.BonusStore;
  const nightMarket = bonus
    ? {
        remaining: bonus.BonusStoreRemainingDurationInSeconds,
        items: bonus.BonusStoreOffers.map((o: any) => ({
          ...item(o.Offer.Rewards[0].ItemID, o.DiscountCosts[CURRENCY.VP]),
          basePrice: o.Offer.Cost[CURRENCY.VP],
          discount: o.DiscountPercent,
        })),
      }
    : null;

  const acc = raw.AccessoryStore;
  const accessories = acc
    ? {
        remaining: acc.AccessoryStoreRemainingDurationInSeconds,
        items: await Promise.all(
          acc.AccessoryStoreOffers.map(async (o: any) => {
            const reward = o.Offer.Rewards[0];
            const info = await lookupAccessory(reward.ItemTypeID, reward.ItemID);
            return { ...info, id: reward.ItemID, price: o.Offer.Cost[CURRENCY.KC] ?? Object.values<number>(o.Offer.Cost)[0] ?? 0 };
          }),
        ),
      }
    : null;

  const bundles = await Promise.all(
    (raw.FeaturedBundle?.Bundles ?? []).map(async (b: any) => {
      const info = await json(`https://valorant-api.com/v1/bundles/${b.DataAssetID}`).catch(() => null);
      return {
        id: b.DataAssetID,
        name: info?.data.displayName ?? 'Bundle',
        image: info?.data.displayIcon ?? null,
        price: b.TotalDiscountedCost?.[CURRENCY.VP] ?? 0,
        remaining: b.DurationRemainingInSeconds,
        items: b.Items.map((i: any) => catalog?.byLevel.get(i.Item.ItemID)?.name).filter(Boolean),
      };
    }),
  );

  return {
    raw,
    store: {
      fetchedAt: Date.now(),
      wallet: balances && {
        vp: balances[CURRENCY.VP] ?? 0,
        kc: balances[CURRENCY.KC] ?? 0,
        rad: balances[CURRENCY.RAD] ?? 0,
      },
      catalogMissing: !catalog,
      daily: { remaining: panel.SingleItemOffersRemainingDurationInSeconds, items: daily },
      nightMarket,
      accessories,
      bundles,
    },
  };
}
