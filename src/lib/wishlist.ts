// Wishlisted skins, persisted on device. Each entry keeps its name so the
// background check can write notifications without loading the catalog.
import Storage from 'expo-sqlite/kv-store';
import { useSyncExternalStore } from 'react';

import type { Skin } from './catalog';

export type WishItem = { skinId: string; levelId: string; name: string; image: string | null };

const KEY = 'wishlist';
let cache: WishItem[] | null = null;
const listeners = new Set<() => void>();

export function getWishlist(): WishItem[] {
  cache ??= JSON.parse(Storage.getItemSync(KEY) ?? '[]') as WishItem[];
  return cache;
}

function save(next: WishItem[]) {
  cache = next;
  Storage.setItemSync(KEY, JSON.stringify(next));
  listeners.forEach(l => l());
}

export function isWished(skinId: string) {
  return getWishlist().some(w => w.skinId === skinId);
}

export const wishFromSkin = (s: Skin): WishItem => ({ skinId: s.id, levelId: s.levelId, name: s.name, image: s.image });

export function toggleWish(item: WishItem) {
  const list = getWishlist();
  save(isWished(item.skinId) ? list.filter(w => w.skinId !== item.skinId) : [...list, item]);
}

export function useWishlist(): WishItem[] {
  return useSyncExternalStore(
    l => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    getWishlist,
  );
}
