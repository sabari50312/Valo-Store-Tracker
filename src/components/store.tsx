import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import { AccessoryOffer, Bundle, Item, Store } from '@/lib/store';
import { colors, fonts, KC_ICON, RAD_ICON, VP_ICON } from '@/lib/theme';
import { useWishlist } from '@/lib/wishlist';

import { Button, Caption, clock, Countdown, Header, Notice, Pill, Price, SectionHeader, short, Skeleton } from './ui';

export function StoreView({ store, refreshing, onRefresh }: { store: Store; refreshing: boolean; onRefresh: () => void }) {
  const deadline = (remaining: number) => store.fetchedAt + remaining * 1000;
  const wished = new Set(useWishlist().map(w => w.levelId));

  return (
    <ScrollView
      style={styles.flex}
      contentContainerStyle={styles.scroll}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.red]} progressBackgroundColor={colors.surface} />
      }
    >
      <Header title="Store" right={store.wallet && <Wallet wallet={store.wallet} />}>
        <Text style={styles.clock}>
          <Countdown deadline={deadline(store.daily.remaining)} format={clock} />
        </Text>
        <Caption text="until your offers reset" />
      </Header>

      <View style={styles.body}>
        {store.catalogMissing && <Notice text="Skin names and images couldn't load. Pull down to try again." />}
        <SectionHeader title="Today's offers" />
        <View style={styles.grid}>
          {store.daily.items.map(it => (
            <SkinTile key={it.levelId} item={it} wished={wished.has(it.levelId)} />
          ))}
        </View>

        {store.nightMarket && (
          <>
            <SectionHeader title="Night market" endsIn={<Countdown deadline={deadline(store.nightMarket.remaining)} format={short} />} />
            {store.nightMarket.items.map(it => (
              <SkinRow key={it.levelId} item={it} wished={wished.has(it.levelId)} />
            ))}
          </>
        )}

        {store.bundles.map(b => (
          <View key={b.id} style={styles.gap}>
            <SectionHeader title="Featured bundle" endsIn={<Countdown deadline={deadline(b.remaining)} format={short} />} />
            <BundleCard bundle={b} />
          </View>
        ))}

        {store.accessories && (
          <>
            <SectionHeader title="Accessories" endsIn={<Countdown deadline={deadline(store.accessories.remaining)} format={short} />} />
            <View style={styles.grid}>
              {store.accessories.items.map(a => (
                <AccessoryCard key={a.id} item={a} />
              ))}
            </View>
          </>
        )}
      </View>
    </ScrollView>
  );
}

export function StoreSkeleton({ label }: { label: string }) {
  return (
    <View style={styles.flex}>
      <Header title="Store">
        <Text style={styles.clock}>--:--:--</Text>
        <Caption text={label} />
      </Header>
      <View style={styles.body}>
        <SectionHeader title="Today's offers" />
        <View style={styles.grid}>
          {[0, 1, 2, 3].map(i => (
            <View key={i} style={styles.half}>
              <Skeleton height={176} />
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

export function SignedOutView({ onSignIn }: { onSignIn: () => void }) {
  return (
    <View style={styles.flex}>
      <Header title="Store">
        <Caption text="Sign in to see your daily store, night market and wallet." />
      </Header>
      <View style={styles.body}>
        <View style={styles.trust}>
          <TrustLine icon="lock-closed-outline" text="You sign in on Riot's own login page. Val Store never sees or stores your password." />
          <TrustLine icon="phone-portrait-outline" text="Everything stays on your phone. There are no Val Store servers." />
          <TrustLine icon="eye-off-outline" text="Val Store only reads your store. It never buys, spends or changes anything on your account." />
        </View>
        <Button label="Sign in with Riot" onPress={onSignIn} />
        <Text style={styles.disclaimer}>{"Val Store isn't affiliated with or endorsed by Riot Games."}</Text>
      </View>
    </View>
  );
}

function TrustLine({ icon, text }: { icon: keyof typeof Ionicons.glyphMap; text: string }) {
  return (
    <View style={styles.trustLine}>
      <Ionicons name={icon} size={18} color={colors.muted} />
      <Text style={styles.trustText}>{text}</Text>
    </View>
  );
}

function Wallet({ wallet }: { wallet: NonNullable<Store['wallet']> }) {
  return (
    <View style={styles.wallet}>
      <Pill>
        <Price icon={VP_ICON} value={wallet.vp} size={13} />
      </Pill>
      <Pill>
        <Price icon={KC_ICON} value={wallet.kc} size={13} />
      </Pill>
      <Pill>
        <Price icon={RAD_ICON} value={wallet.rad} size={13} />
      </Pill>
    </View>
  );
}

/** Daily offers: a 2-column grid of art-on-top tiles. */
function SkinTile({ item, wished }: { item: Item; wished: boolean }) {
  return (
    <Pressable
      disabled={!item.skinId}
      onPress={() => router.push(`/skin/${item.skinId}`)}
      style={({ pressed }) => [styles.tile, pressed && styles.pressed]}
    >
      <View style={[styles.tileArt, { backgroundColor: tint(item.tierColor) }]}>
        {item.image && <Image source={item.image} style={styles.art} contentFit="contain" transition={250} />}
        {wished && <Ionicons name="heart" size={14} color={colors.red} style={styles.wishMark} />}
      </View>
      <View style={styles.tileInfo}>
        <Text style={styles.skinName} numberOfLines={2}>
          {item.name}
        </Text>
        <View style={styles.tileFooter}>
          {item.tierIcon ? <Image source={item.tierIcon} style={styles.tierIcon} contentFit="contain" /> : <View />}
          <Price icon={VP_ICON} value={item.price} />
        </View>
      </View>
    </Pressable>
  );
}

/** Night market: one row per offer, with the discount on the right. */
function SkinRow({ item, wished }: { item: Item; wished: boolean }) {
  return (
    <Pressable
      disabled={!item.skinId}
      onPress={() => router.push(`/skin/${item.skinId}`)}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <View style={[styles.rowArt, { backgroundColor: tint(item.tierColor) }]}>
        {item.image && <Image source={item.image} style={styles.art} contentFit="contain" transition={250} />}
      </View>
      <View style={styles.rowInfo}>
        <View style={styles.rowNameLine}>
          <Text style={[styles.skinName, styles.flexShrink]} numberOfLines={1}>
            {item.name}
          </Text>
          {wished && <Ionicons name="heart" size={12} color={colors.red} />}
        </View>
        {item.basePrice != null && <Text style={styles.strike}>{item.basePrice.toLocaleString()}</Text>}
      </View>
      <View style={styles.rowPrice}>
        {item.discount != null && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>−{item.discount}%</Text>
          </View>
        )}
        <Price icon={VP_ICON} value={item.price} />
      </View>
    </Pressable>
  );
}

function BundleCard({ bundle }: { bundle: Bundle }) {
  return (
    <View style={styles.bundle}>
      {bundle.image && <Image source={bundle.image} style={styles.fill} contentFit="cover" transition={250} />}
      <LinearGradient
        colors={['transparent', 'rgba(15,25,35,0.65)', colors.bg]}
        locations={[0.3, 0.7, 1]}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.bundleInfo}>
        <View style={styles.bundleTitleRow}>
          <Text style={styles.bundleName} numberOfLines={1}>
            {bundle.name.toUpperCase()}
          </Text>
          <Price icon={VP_ICON} value={bundle.price} size={16} />
        </View>
        {bundle.items.length > 0 && (
          <Text style={styles.bundleItems} numberOfLines={2}>
            {bundle.items.join('  ·  ')}
          </Text>
        )}
      </View>
    </View>
  );
}

function AccessoryCard({ item }: { item: AccessoryOffer }) {
  const isCard = item.kind === 'Card';
  return (
    <View style={styles.tile}>
      <View style={[styles.tileArt, styles.accessoryArt]}>
        {item.image ? (
          <Image source={item.image} style={isCard ? styles.fill : styles.accessoryIcon} contentFit={isCard ? 'cover' : 'contain'} />
        ) : (
          <Text style={styles.titleText} numberOfLines={2}>
            {(item.text ?? item.name).toUpperCase()}
          </Text>
        )}
      </View>
      <View style={styles.tileInfo}>
        <View>
          <Text style={styles.accessoryKind}>{item.kind.toUpperCase()}</Text>
          <Text style={styles.skinName} numberOfLines={1}>
            {item.name}
          </Text>
        </View>
        <Price icon={KC_ICON} value={item.price} />
      </View>
    </View>
  );
}

// Rarity colour at ~14% so the art sits on a faint tint of its tier.
const tint = (tierColor: string | null) => (tierColor ?? colors.surfaceHigh) + '24';

const styles = StyleSheet.create({
  flex: { flex: 1 },
  flexShrink: { flexShrink: 1 },
  fill: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  scroll: { paddingBottom: 32 },
  body: { paddingHorizontal: 16, paddingTop: 12, gap: 12 },
  gap: { gap: 12 },
  pressed: { opacity: 0.85, transform: [{ scale: 0.99 }] },

  clock: {
    fontFamily: fonts.display,
    color: colors.red,
    fontSize: 48,
    lineHeight: 52,
    letterSpacing: 1,
    marginTop: 8,
    fontVariant: ['tabular-nums'],
  },
  wallet: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-end', gap: 6, flexShrink: 1 },

  trust: { backgroundColor: colors.surface, borderRadius: 12, padding: 16, gap: 14 },
  trustLine: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  trustText: { flex: 1, fontFamily: fonts.body, color: colors.text, fontSize: 13, lineHeight: 19 },
  disclaimer: { fontFamily: fonts.body, color: colors.muted, fontSize: 11, textAlign: 'center' },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  half: { flexBasis: '40%', flexGrow: 1 },
  tile: { flexBasis: '40%', flexGrow: 1, backgroundColor: colors.surface, borderRadius: 12, overflow: 'hidden' },
  tileArt: { height: 96, padding: 12 },
  art: { width: '100%', height: '100%' },
  wishMark: { position: 'absolute', top: 8, right: 8 },
  tileInfo: { flex: 1, padding: 12, gap: 8, justifyContent: 'space-between' },
  tileFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  tierIcon: { width: 16, height: 16 },
  skinName: { fontFamily: fonts.bodyBold, color: colors.text, fontSize: 14, lineHeight: 18 },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 8,
    paddingRight: 12,
  },
  rowArt: { width: 96, height: 56, borderRadius: 8, padding: 8 },
  rowInfo: { flex: 1, gap: 4 },
  rowNameLine: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  rowPrice: { alignItems: 'flex-end', gap: 4 },
  strike: { fontFamily: fonts.body, color: colors.muted, fontSize: 12, textDecorationLine: 'line-through' },
  badge: { backgroundColor: colors.red, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  badgeText: { fontFamily: fonts.bodyBold, color: colors.bg, fontSize: 11 },

  bundle: { aspectRatio: 16 / 10, borderRadius: 12, overflow: 'hidden', backgroundColor: colors.surface, justifyContent: 'flex-end' },
  bundleInfo: { padding: 14, gap: 4 },
  bundleTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  bundleName: { flex: 1, fontFamily: fonts.display, color: colors.white, fontSize: 24, letterSpacing: 1 },
  bundleItems: { fontFamily: fonts.body, color: colors.muted, fontSize: 12, lineHeight: 17 },

  accessoryArt: { backgroundColor: colors.surfaceHigh, alignItems: 'center', justifyContent: 'center' },
  accessoryIcon: { width: 72, height: 72 },
  titleText: { fontFamily: fonts.display, color: colors.text, fontSize: 18, letterSpacing: 1, textAlign: 'center' },
  accessoryKind: { fontFamily: fonts.displayMedium, color: colors.muted, fontSize: 12, letterSpacing: 1.5 },
});
