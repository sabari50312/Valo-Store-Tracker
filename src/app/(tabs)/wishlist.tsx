import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Switch, Text, TextInput, View } from 'react-native';

import { Button, Caption, Header, SectionHeader } from '@/components/ui';
import { alertsEnabled, checkWishlist, disableAlerts, enableAlerts } from '@/lib/alerts';
import { colors, fonts } from '@/lib/theme';
import { useCatalog } from '@/lib/use-catalog';
import { toggleWish, useWishlist, WishItem, wishFromSkin } from '@/lib/wishlist';

type Row = WishItem & { tierIcon: string | null; tierColor: string | null };

export default function WishlistScreen() {
  const wishlist = useWishlist();
  const { catalog } = useCatalog();
  const [query, setQuery] = useState('');

  const wished = useMemo(() => new Set(wishlist.map(w => w.skinId)), [wishlist]);

  const rows: Row[] = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) {
      return wishlist.map(w => {
        const skin = catalog?.byId.get(w.skinId);
        return { ...w, tierIcon: skin?.tierIcon ?? null, tierColor: skin?.tierColor ?? null };
      });
    }
    return (catalog?.skins ?? [])
      .filter(s => s.name.toLowerCase().includes(q))
      .slice(0, 60)
      .map(s => ({ ...wishFromSkin(s), tierIcon: s.tierIcon, tierColor: s.tierColor }));
  }, [query, wishlist, catalog]);

  const header = (
    <View>
      <Header title="Wishlist">
        <Caption text={`${wishlist.length} ${wishlist.length === 1 ? 'skin' : 'skins'} saved. Get pinged when one shows up in your store.`} />
      </Header>
      <View style={styles.body}>
        <AlertsCard />
        <View style={styles.search}>
          <Ionicons name="search" size={18} color={colors.muted} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder={catalog ? 'Search skins to add…' : 'Loading skins…'}
            placeholderTextColor={colors.muted}
            style={styles.searchInput}
            autoCorrect={false}
          />
          {query.length > 0 && (
            <Pressable onPress={() => setQuery('')} hitSlop={10}>
              <Ionicons name="close-circle" size={18} color={colors.muted} />
            </Pressable>
          )}
        </View>
        <SectionHeader title={query.trim() ? 'Results' : 'Your wishlist'} />
      </View>
    </View>
  );

  return (
    <FlatList
      style={styles.flex}
      data={rows}
      keyExtractor={r => r.skinId}
      ListHeaderComponent={header}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={styles.list}
      ItemSeparatorComponent={() => <View style={styles.sep} />}
      ListEmptyComponent={
        <Text style={styles.empty}>
          {query.trim() ? 'No skins match that.' : 'Nothing yet. Search above and tap the heart to add skins.'}
        </Text>
      }
      renderItem={({ item }) => <SkinRow row={item} wished={wished.has(item.skinId)} />}
    />
  );
}

function SkinRow({ row, wished }: { row: Row; wished: boolean }) {
  return (
    <Pressable onPress={() => router.push(`/skin/${row.skinId}`)} style={({ pressed }) => [styles.row, pressed && { opacity: 0.85 }]}>
      <View style={[styles.rowArt, { backgroundColor: (row.tierColor ?? colors.surfaceHigh) + '24' }]}>
        {row.image && <Image source={row.image} style={styles.rowImage} contentFit="contain" />}
      </View>
      <View style={styles.rowText}>
        <Text style={styles.rowName} numberOfLines={1}>
          {row.name}
        </Text>
      </View>
      {row.tierIcon && <Image source={row.tierIcon} style={styles.rowTier} contentFit="contain" />}
      <Pressable onPress={() => toggleWish({ skinId: row.skinId, levelId: row.levelId, name: row.name, image: row.image })} hitSlop={12}>
        <Ionicons name={wished ? 'heart' : 'heart-outline'} size={22} color={wished ? colors.red : colors.muted} />
      </Pressable>
    </Pressable>
  );
}

function AlertsCard() {
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    alertsEnabled().then(setEnabled);
  }, []);

  const toggle = async (on: boolean) => {
    setStatus(null);
    try {
      if (!on) {
        await disableAlerts();
        setEnabled(false);
        return;
      }
      const ok = await enableAlerts();
      setEnabled(ok);
      if (!ok) setStatus('Notifications are blocked. Allow them for this app in Android settings.');
    } catch (e) {
      setEnabled(await alertsEnabled().catch(() => false));
      setStatus(`Couldn't ${on ? 'turn on' : 'turn off'} alerts: ${e instanceof Error ? e.message : String(e)}`);
    }
  };

  const checkNow = async () => {
    setBusy(true);
    setStatus('Checking…');
    try {
      const r = await checkWishlist({ force: true });
      if (r.status === 'signedOut') setStatus('You are signed out. Sign in on the Store tab first.');
      else if (r.status === 'expired') setStatus('Silent sign-in failed: your Riot session expired. Pull to refresh on the Store tab to sign in.');
      else if (r.status === 'checked' && !r.matches.length) setStatus("Silent sign-in works. None of your wishlist is in today's store.");
      else if (r.status === 'checked') setStatus(`Found ${r.matches.map(m => m.name).join(', ')}. Notification sent.`);
    } catch (e) {
      setStatus(`Check failed: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.alerts}>
      <View style={styles.alertsRow}>
        <View style={styles.flex}>
          <Text style={styles.alertsTitle}>STORE ALERTS</Text>
          <Text style={styles.alertsSub}>Checks once each time your store resets, usually within 30 minutes of it.</Text>
        </View>
        <Switch
          value={!!enabled}
          disabled={enabled === null}
          onValueChange={toggle}
          trackColor={{ false: colors.surfaceHigh, true: colors.red }}
          thumbColor={colors.white}
        />
      </View>
      {status && <Text style={styles.alertsStatus}>{status}</Text>}
      <Button label={busy ? 'Checking…' : 'Check now'} variant="ghost" onPress={busy ? () => {} : checkNow} />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  list: { paddingBottom: 32 },
  body: { paddingHorizontal: 16, paddingTop: 12, gap: 12, marginBottom: 12 },

  alerts: { backgroundColor: colors.surface, borderRadius: 12, padding: 16, gap: 12 },
  alertsRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  alertsTitle: { fontFamily: fonts.displayMedium, color: colors.text, fontSize: 16, letterSpacing: 1.5 },
  alertsSub: { fontFamily: fonts.body, color: colors.muted, fontSize: 12, marginTop: 2 },
  alertsStatus: { fontFamily: fonts.bodyMedium, color: colors.text, fontSize: 12, lineHeight: 17 },

  search: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.surface, borderRadius: 12, paddingHorizontal: 12 },
  searchInput: { flex: 1, fontFamily: fonts.body, color: colors.text, fontSize: 15, paddingVertical: 12 },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginHorizontal: 16,
    padding: 8,
    paddingRight: 12,
    backgroundColor: colors.surface,
    borderRadius: 12,
  },
  rowArt: { width: 96, height: 56, borderRadius: 8, padding: 8 },
  rowImage: { width: '100%', height: '100%' },
  rowText: { flex: 1 },
  rowName: { fontFamily: fonts.bodyBold, color: colors.text, fontSize: 14, lineHeight: 18 },
  rowTier: { width: 16, height: 16 },
  sep: { height: 8 },
  empty: { fontFamily: fonts.body, color: colors.muted, fontSize: 13, textAlign: 'center', paddingHorizontal: 32, marginTop: 12 },
});
