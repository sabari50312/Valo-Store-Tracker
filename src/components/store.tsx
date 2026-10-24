import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import { AccessoryOffer, Bundle, Item, Store } from '@/lib/store';
import { colors, fonts, KC_ICON, RAD_ICON, VP_ICON } from '@/lib/theme';
import { useWishlist } from '@/lib/wishlist';

import { Button, clock, Hero, Notice, Price, SectionHeader, short, Skeleton, useNow } from './ui';

export function StoreView({ store, onRefresh }: { store: Store; onRefresh: () => void }) {
  const now = useNow();
  const left = (remaining: number) => remaining - (now - store.fetchedAt) / 1000;
  const wished = new Set(useWishlist().map(w => w.levelId));

  return (
    <ScrollView
      style={styles.flex}
      contentContainerStyle={styles.scroll}
      refreshControl={
        <RefreshControl refreshing={false} onRefresh={onRefresh} colors={[colors.red]} progressBackgroundColor={colors.surface} />
      }
    >
      <Hero label="Daily store" title={clock(left(store.daily.remaining))} caption="until your offers reset">
        {store.wallet && (
          <View style={styles.wallet}>
            <WalletPill icon={VP_ICON} value={store.wallet.vp} />
            <WalletPill icon={KC_ICON} value={store.wallet.kc} />
            <WalletPill icon={RAD_ICON} value={store.wallet.rad} />
          </View>
        )}
      </Hero>

      <View style={styles.body}>
        {store.catalogMissing && <Notice text="Skin names and images couldn't load. Pull down to try again." />}
        {store.daily.items.map((it, i) => (
          <SkinCard key={i} item={it} wished={wished.has(it.levelId)} />
        ))}

        {store.nightMarket && (
          <>
            <SectionHeader title="Night market" chip={short(left(store.nightMarket.remaining))} />
            {store.nightMarket.items.map((it, i) => (
              <SkinCard key={i} item={it} wished={wished.has(it.levelId)} />
            ))}
          </>
        )}

        {store.bundles.map((b, i) => (
          <View key={i} style={styles.gap}>
            <SectionHeader title="Featured bundle" chip={short(left(b.remaining))} />
            <BundleCard bundle={b} />
          </View>
        ))}

        {store.accessories && (
          <>
            <SectionHeader title="Accessories" chip={short(left(store.accessories.remaining))} />
            <View style={styles.grid}>
              {store.accessories.items.map((a, i) => (
                <AccessoryCard key={i} item={a} />
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
      <Hero label="Daily store" title="--:--:--" caption={label} />
      <View style={styles.body}>
        {[0, 1, 2, 3].map(i => (
          <Skeleton key={i} />
        ))}
      </View>
    </View>
  );
}

export function SignedOutView({ onSignIn }: { onSignIn: () => void }) {
  return (
    <View style={styles.flex}>
      <Hero label="Val Store" title="SIGN IN" caption="to see your daily store, night market and wallet" />
      <View style={[styles.body, styles.signedOut]}>
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
      <Ionicons name={icon} size={18} color={colors.red} />
      <Text style={styles.trustText}>{text}</Text>
    </View>
  );
}

function WalletPill({ icon, value }: { icon: string; value: number }) {
  return (
    <View style={styles.walletPill}>
      <Price icon={icon} value={value} size={13} color={colors.white} />
    </View>
  );
}

function SkinCard({ item, wished }: { item: Item; wished: boolean }) {
  const tint = item.tierColor ?? colors.surfaceHigh;
  return (
    <Pressable
      disabled={!item.skinId}
      onPress={() => router.push(`/skin/${item.skinId}`)}
      style={({ pressed }) => [styles.card, wished && styles.cardWished, pressed && styles.pressed]}
    >
      <LinearGradient
        colors={[tint + '59', tint + '14', 'transparent']}
        locations={[0, 0.55, 1]}
        start={{ x: 0, y: 1 }}
        end={{ x: 1, y: 0 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={[styles.cardAccent, { backgroundColor: tint }]} />

      <View style={styles.cardTop}>
        {item.tierIcon ? <Image source={item.tierIcon} style={styles.tierIcon} contentFit="contain" /> : <View />}
        <View style={styles.badges}>
          {wished && (
            <View style={[styles.badge, styles.badgeWish]}>
              <Text style={styles.badgeText}>WISHLIST</Text>
            </View>
          )}
          {item.discount != null && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>-{item.discount}%</Text>
            </View>
          )}
        </View>
      </View>

      {item.image && <Image source={item.image} style={styles.skinImage} contentFit="contain" transition={250} />}

      <View style={styles.cardBottom}>
        <Text style={styles.skinName} numberOfLines={2}>
          {item.name.toUpperCase()}
        </Text>
        <View style={styles.priceCol}>
          {item.basePrice != null && <Text style={styles.strike}>{item.basePrice.toLocaleString()}</Text>}
          <Price icon={VP_ICON} value={item.price} />
        </View>
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
          <Price icon={VP_ICON} value={bundle.price} size={17} />
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
    <View style={styles.accessory}>
      <View style={styles.accessoryArt}>
        {item.image ? (
          <Image source={item.image} style={isCard ? styles.fill : styles.accessoryIcon} contentFit={isCard ? 'cover' : 'contain'} />
        ) : (
          <Text style={styles.titleText} numberOfLines={2}>
            {(item.text ?? item.name).toUpperCase()}
          </Text>
        )}
      </View>
      <View style={styles.accessoryInfo}>
        <Text style={styles.accessoryKind}>{item.kind.toUpperCase()}</Text>
        <Text style={styles.accessoryName} numberOfLines={1}>
          {item.name}
        </Text>
        <Price icon={KC_ICON} value={item.price} size={13} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  fill: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  scroll: { paddingBottom: 32 },
  body: { paddingHorizontal: 16, marginTop: -8, gap: 12 },
  gap: { gap: 12 },
  pressed: { opacity: 0.85, transform: [{ scale: 0.99 }] },

  wallet: { flexDirection: 'row', gap: 8, marginTop: 14 },
  signedOut: { gap: 16 },
  trust: { backgroundColor: colors.surface, borderRadius: 8, borderWidth: 1, borderColor: colors.line, padding: 14, gap: 14 },
  trustLine: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  trustText: { flex: 1, fontFamily: fonts.body, color: colors.text, fontSize: 13, lineHeight: 19 },
  disclaimer: { fontFamily: fonts.body, color: colors.muted, fontSize: 11, textAlign: 'center' },
  walletPill: { backgroundColor: 'rgba(15,25,35,0.28)', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },

  card: {
    height: 150,
    backgroundColor: colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.line,
    overflow: 'hidden',
    padding: 14,
    justifyContent: 'space-between',
  },
  cardWished: { borderColor: colors.red, borderWidth: 1.5 },
  cardAccent: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 3 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  tierIcon: { width: 20, height: 20 },
  badges: { flexDirection: 'row', gap: 6 },
  badge: { backgroundColor: colors.red, borderRadius: 4, paddingHorizontal: 7, paddingVertical: 2 },
  badgeWish: { backgroundColor: colors.text },
  badgeText: { fontFamily: fonts.bodyBold, color: colors.bg, fontSize: 11, letterSpacing: 0.5 },
  skinImage: { position: 'absolute', top: 18, bottom: 44, left: 40, right: 20 },
  cardBottom: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12 },
  skinName: { flex: 1, fontFamily: fonts.display, color: colors.text, fontSize: 20, lineHeight: 22, letterSpacing: 0.5 },
  priceCol: { alignItems: 'flex-end' },
  strike: { fontFamily: fonts.body, color: colors.muted, fontSize: 12, textDecorationLine: 'line-through' },

  bundle: {
    aspectRatio: 16 / 10,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    justifyContent: 'flex-end',
  },
  bundleInfo: { padding: 14, gap: 4 },
  bundleTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  bundleName: { flex: 1, fontFamily: fonts.display, color: colors.white, fontSize: 26, letterSpacing: 1 },
  bundleItems: { fontFamily: fonts.body, color: colors.muted, fontSize: 12, lineHeight: 17 },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  accessory: {
    width: '47.5%',
    flexGrow: 1,
    backgroundColor: colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.line,
    overflow: 'hidden',
  },
  accessoryArt: { height: 96, backgroundColor: colors.surfaceHigh, alignItems: 'center', justifyContent: 'center' },
  accessoryIcon: { width: 72, height: 72 },
  titleText: { fontFamily: fonts.display, color: colors.text, fontSize: 18, letterSpacing: 1, textAlign: 'center', paddingHorizontal: 10 },
  accessoryInfo: { padding: 10, gap: 4 },
  accessoryKind: { fontFamily: fonts.displayMedium, color: colors.red, fontSize: 12, letterSpacing: 1.5 },
  accessoryName: { fontFamily: fonts.bodyMedium, color: colors.text, fontSize: 13 },
});
