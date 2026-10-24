// Names, images, rarity and videos from valorant-api.com (Riot's store only returns IDs).
import { json } from './riot';

export type Chroma = { id: string; name: string; render: string | null; swatch: string | null; video: string | null };
export type Level = { id: string; name: string; kind: string; video: string | null };

export type Skin = {
  id: string;
  levelId: string; // level 1 uuid: what store offers reference
  name: string;
  image: string | null;
  tierColor: string | null;
  tierIcon: string | null;
  chromas: Chroma[];
  levels: Level[];
};

export type Catalog = {
  skins: Skin[]; // purchasable skins only (have a rarity tier)
  byId: Map<string, Skin>;
  byLevel: Map<string, Skin>;
};

let catalog: Promise<Catalog> | null = null;

// "EEquippableSkinLevelItem::Finisher" -> "Finisher"
const levelKind = (item: string | null, i: number) => (item ? item.split('::').pop()! : i === 0 ? 'Base' : `Level ${i + 1}`);

export function loadCatalog(): Promise<Catalog> {
  catalog ??= (async () => {
    const [tiers, raw] = await Promise.all([
      json('https://valorant-api.com/v1/contenttiers'),
      json('https://valorant-api.com/v1/weapons/skins'),
    ]);
    const tierById = new Map<string, { color: string; icon: string }>(
      tiers.data.map((t: any) => [t.uuid, { color: '#' + t.highlightColor.slice(0, 6), icon: t.displayIcon }]),
    );

    const skins: Skin[] = [];
    const byId = new Map<string, Skin>();
    const byLevel = new Map<string, Skin>();
    for (const s of raw.data) {
      const tier = tierById.get(s.contentTierUuid);
      const chromas: Chroma[] = (s.chromas ?? []).map((c: any) => ({
        id: c.uuid,
        name: c.displayName.replace(/\s*\n\s*/g, ' '),
        render: c.fullRender ?? c.displayIcon ?? null,
        swatch: c.swatch ?? null,
        video: c.streamedVideo ?? null,
      }));
      const levels: Level[] = (s.levels ?? []).map((l: any, i: number) => ({
        id: l.uuid,
        name: l.displayName,
        kind: levelKind(l.levelItem, i),
        video: l.streamedVideo ?? null,
      }));
      const skin: Skin = {
        id: s.uuid,
        levelId: levels[0]?.id ?? s.uuid,
        name: s.displayName,
        image: s.levels?.[0]?.displayIcon ?? chromas[0]?.render ?? s.displayIcon ?? null,
        tierColor: tier?.color ?? null,
        tierIcon: tier?.icon ?? null,
        chromas,
        levels,
      };
      byId.set(skin.id, skin);
      for (const l of levels) byLevel.set(l.id, skin);
      if (tier) skins.push(skin);
    }
    skins.sort((a, b) => a.name.localeCompare(b.name));
    return { skins, byId, byLevel };
  })().catch(e => {
    catalog = null; // retry on next load instead of caching the failure
    throw e;
  });
  return catalog;
}

// --- accessories (Kingdom Credits store) -----------------------------------

const ACCESSORY_TYPES: Record<string, { kind: string; path: string; image: (d: any) => string | null }> = {
  'd5f120f8-ff8c-4aac-92ea-f2b5acbe9475': { kind: 'Spray', path: 'sprays', image: d => d.fullTransparentIcon ?? d.displayIcon },
  '3f296c07-64c3-494c-923b-fe692a4fa1bd': { kind: 'Card', path: 'playercards', image: d => d.wideArt ?? d.displayIcon },
  'de7caa6b-adf7-4588-bbd1-143831e786c6': { kind: 'Title', path: 'playertitles', image: () => null },
  'dd3bf334-87f3-40bd-b043-682a57a8dc3a': { kind: 'Buddy', path: 'buddies/levels', image: d => d.displayIcon },
};
// Flex items have no documented type id; try them for anything unknown.
const FALLBACK = { kind: 'Flex', path: 'flex', image: (d: any) => d.displayIcon };

export type Accessory = { kind: string; name: string; image: string | null; text: string | null };

export async function lookupAccessory(typeId: string, itemId: string): Promise<Accessory> {
  const t = ACCESSORY_TYPES[typeId] ?? FALLBACK;
  try {
    const { data } = await json(`https://valorant-api.com/v1/${t.path}/${itemId}`);
    return { kind: t.kind, name: data.displayName, image: t.image(data), text: data.titleText ?? null };
  } catch {
    return { kind: 'Item', name: 'Unknown item', image: null, text: null };
  }
}
