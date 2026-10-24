import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { ReactNode, useEffect, useState } from 'react';
import { Animated, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Item, Store } from './riot';
import { colors, fonts, VP_ICON } from './theme';

// --- time -------------------------------------------------------------------

function useNow() {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}

const pad = (n: number) => String(n).padStart(2, '0');

/** "13:04:09" for the hero clock. */
function clock(sec: number) {
  sec = Math.max(0, Math.floor(sec));
  return `${pad(Math.floor(sec / 3600))}:${pad(Math.floor((sec % 3600) / 60))}:${pad(sec % 60)}`;
}

/** "3d 4h" / "4h 12m" / "12m" for section chips. */
function short(sec: number) {
  sec = Math.max(0, Math.floor(sec));
  const d = Math.floor(sec / 86400);
  const h = Math.floor((sec % 86400) / 3600);
  const m = Math.floor((sec % 3600) / 60);
  if (d) return `${d}d ${h}h`;
  if (h) return `${h}h ${m}m`;
  return `${m}m`;
}

// --- screen -----------------------------------------------------------------

export function StoreScreen({ store, onRefresh }: { store: Store; onRefresh: () => void }) {
  const now = useNow();
  const left = (remaining: number) => remaining - (now - store.fetchedAt) / 1000;

  return (
    <ScrollView
      style={styles.flex}
      contentContainerStyle={styles.scroll}
      refreshControl={
        <RefreshControl refreshing={false} onRefresh={onRefresh} colors={[colors.red]} progressBackgroundColor={colors.surface} />
      }
    >
      <Hero label="Daily store" time={clock(left(store.daily.remaining))} caption="until your offers reset" />

      <View style={styles.body}>
        {store.daily.items.map((it, i) => (
          <SkinCard key={i} item={it} />
        ))}

        {store.nightMarket && (
          <>
            <SectionHeader title="Night market" chip={short(left(store.nightMarket.remaining))} />
            {store.nightMarket.items.map((it, i) => (
              <SkinCard key={i} item={it} />
            ))}
          </>
        )}

        {store.bundles.map((b, i) => (
          <View key={i}>
            <SectionHeader title="Featured bundle" chip={short(left(b.remaining))} />
            <BundleCard bundle={b} />
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

// --- pieces -----------------------------------------------------------------

function Hero({ label, time, caption }: { label: string; time: string; caption: string }) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  return (
    <View>
      <LinearGradient colors={[colors.red, colors.redDeep]} style={[styles.hero, { paddingTop: insets.top + 20 }]}>
        <Text style={styles.heroLabel}>{label.toUpperCase()}</Text>
        <Text style={styles.heroTime}>{time}</Text>
        <Text style={styles.heroCaption}>{caption}</Text>
      </LinearGradient>
      {/* slanted bottom edge */}
      <View style={[styles.slant, { borderRightWidth: width }]} />
    </View>
  );
}

function SectionHeader({ title, chip }: { title: string; chip: string }) {
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionTitleRow}>
        <View style={styles.sectionBar} />
        <Text style={styles.sectionTitle}>{title.toUpperCase()}</Text>
      </View>
      <View style={styles.chip}>
        <Ionicons name="time-outline" size={13} color={colors.muted} />
        <Text style={styles.chipText}>{chip}</Text>
      </View>
    </View>
  );
}

function Price({ value, size = 15 }: { value: number; size?: number }) {
  return (
    <View style={styles.price}>
      <Image source={VP_ICON} style={{ width: size - 1, height: size - 1 }} contentFit="contain" />
      <Text style={[styles.priceText, { fontSize: size }]}>{value.toLocaleString()}</Text>
    </View>
  );
}

function SkinCard({ item }: { item: Item }) {
  const tint = item.tierColor ?? colors.surfaceHigh;
  return (
    <View style={styles.card}>
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
        {item.discount != null && (
          <View style={styles.discount}>
            <Text style={styles.discountText}>-{item.discount}%</Text>
          </View>
        )}
      </View>

      {item.image && (
        <Image source={item.image} style={styles.skinImage} contentFit="contain" transition={250} />
      )}

      <View style={styles.cardBottom}>
        <Text style={styles.skinName} numberOfLines={2}>
          {item.name.toUpperCase()}
        </Text>
        <View style={styles.priceCol}>
          {item.basePrice != null && <Text style={styles.strike}>{item.basePrice.toLocaleString()}</Text>}
          <Price value={item.price} />
        </View>
      </View>
    </View>
  );
}

function BundleCard({ bundle }: { bundle: Store['bundles'][number] }) {
  return (
    <View style={styles.bundle}>
      {bundle.image && <Image source={bundle.image} style={styles.bundleImage} contentFit="cover" transition={250} />}
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
          <Price value={bundle.price} size={17} />
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

// --- loading / error / shell ------------------------------------------------

export function LoadingScreen({ label }: { label: string }) {
  const [pulse] = useState(() => new Animated.Value(0.4));
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.4, duration: 700, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  return (
    <View style={styles.flex}>
      <Hero label="Daily store" time="--:--:--" caption={label} />
      <View style={styles.body}>
        {[0, 1, 2, 3].map(i => (
          <Animated.View key={i} style={[styles.card, styles.skeleton, { opacity: pulse }]} />
        ))}
      </View>
    </View>
  );
}

export function ErrorScreen({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <Centered>
      <Ionicons name="cloud-offline-outline" size={44} color={colors.red} />
      <Text style={styles.errorTitle}>{"COULDN'T LOAD YOUR STORE"}</Text>
      <Text style={styles.errorText}>{message}</Text>
      <Pressable style={({ pressed }) => [styles.button, pressed && { opacity: 0.8 }]} onPress={onRetry}>
        <Text style={styles.buttonText}>TRY AGAIN</Text>
      </Pressable>
    </Centered>
  );
}

function Centered({ children }: { children: ReactNode }) {
  return <View style={styles.centered}>{children}</View>;
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { paddingBottom: 40 },
  body: { paddingHorizontal: 16, marginTop: -8, gap: 12 },

  hero: { paddingHorizontal: 20, paddingBottom: 18 },
  heroLabel: { fontFamily: fonts.displayMedium, color: 'rgba(255,255,255,0.8)', fontSize: 15, letterSpacing: 3 },
  heroTime: { fontFamily: fonts.display, color: colors.white, fontSize: 64, lineHeight: 70, letterSpacing: 1 },
  heroCaption: { fontFamily: fonts.bodyMedium, color: 'rgba(255,255,255,0.75)', fontSize: 13 },
  slant: {
    height: 0,
    borderTopWidth: 28,
    borderTopColor: colors.redDeep,
    borderRightColor: 'transparent',
  },

  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 20 },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sectionBar: { width: 3, height: 16, backgroundColor: colors.red },
  sectionTitle: { fontFamily: fonts.display, color: colors.text, fontSize: 19, letterSpacing: 1.5 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  chipText: { fontFamily: fonts.bodyMedium, color: colors.muted, fontSize: 12, fontVariant: ['tabular-nums'] },

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
  skeleton: { backgroundColor: colors.surfaceHigh },
  cardAccent: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 3 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  tierIcon: { width: 20, height: 20 },
  discount: { backgroundColor: colors.red, borderRadius: 4, paddingHorizontal: 7, paddingVertical: 2 },
  discountText: { fontFamily: fonts.bodyBold, color: colors.white, fontSize: 12 },
  skinImage: { position: 'absolute', top: 18, bottom: 44, left: 40, right: 20 },
  cardBottom: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12 },
  skinName: { flex: 1, fontFamily: fonts.display, color: colors.text, fontSize: 20, lineHeight: 22, letterSpacing: 0.5 },
  priceCol: { alignItems: 'flex-end' },
  strike: { fontFamily: fonts.body, color: colors.muted, fontSize: 12, textDecorationLine: 'line-through' },
  price: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  priceText: { fontFamily: fonts.bodyBold, color: colors.text, fontVariant: ['tabular-nums'] },

  bundle: {
    aspectRatio: 16 / 10,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    justifyContent: 'flex-end',
  },
  bundleImage: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  bundleInfo: { padding: 14, gap: 4 },
  bundleTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  bundleName: { flex: 1, fontFamily: fonts.display, color: colors.white, fontSize: 26, letterSpacing: 1 },
  bundleItems: { fontFamily: fonts.body, color: colors.muted, fontSize: 12, lineHeight: 17 },

  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 12 },
  errorTitle: { fontFamily: fonts.display, color: colors.text, fontSize: 22, letterSpacing: 1.5, textAlign: 'center' },
  errorText: { fontFamily: fonts.body, color: colors.muted, fontSize: 13, textAlign: 'center' },
  button: { marginTop: 8, backgroundColor: colors.red, borderRadius: 6, paddingHorizontal: 28, paddingVertical: 12 },
  buttonText: { fontFamily: fonts.display, color: colors.white, fontSize: 16, letterSpacing: 2 },
});
