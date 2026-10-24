import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { ReactNode, useEffect, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, fonts } from '@/lib/theme';

// --- time -------------------------------------------------------------------

export function useNow() {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}

const pad = (n: number) => String(n).padStart(2, '0');

/** "13:04:09" for the hero clock. */
export function clock(sec: number) {
  sec = Math.max(0, Math.floor(sec));
  return `${pad(Math.floor(sec / 3600))}:${pad(Math.floor((sec % 3600) / 60))}:${pad(sec % 60)}`;
}

/** "3d 4h" / "4h 12m" / "12m" for section chips. */
export function short(sec: number) {
  sec = Math.max(0, Math.floor(sec));
  const d = Math.floor(sec / 86400);
  const h = Math.floor((sec % 86400) / 3600);
  const m = Math.floor((sec % 3600) / 60);
  if (d) return `${d}d ${h}h`;
  if (h) return `${h}h ${m}m`;
  return `${m}m`;
}

// --- layout pieces ----------------------------------------------------------

/** Red header with a slanted bottom edge. */
export function Hero({ label, title, caption, children }: { label: string; title: string; caption?: string; children?: ReactNode }) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  return (
    <View>
      <LinearGradient colors={[colors.red, colors.redDeep]} style={[styles.hero, { paddingTop: insets.top + 20 }]}>
        <Text style={styles.heroLabel}>{label.toUpperCase()}</Text>
        <Text style={styles.heroTitle}>{title}</Text>
        {caption && <Text style={styles.heroCaption}>{caption}</Text>}
        {children}
      </LinearGradient>
      <View style={[styles.slant, { borderRightWidth: width }]} />
    </View>
  );
}

export function SectionHeader({ title, chip }: { title: string; chip?: string }) {
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionTitleRow}>
        <View style={styles.sectionBar} />
        <Text style={styles.sectionTitle}>{title.toUpperCase()}</Text>
      </View>
      {chip && (
        <View style={styles.chip}>
          <Ionicons name="time-outline" size={13} color={colors.muted} />
          <Text style={styles.chipText}>{chip}</Text>
        </View>
      )}
    </View>
  );
}

export function Price({ value, icon, size = 15, color = colors.text }: { value: number; icon: string; size?: number; color?: string }) {
  return (
    <View style={styles.price}>
      <Image source={icon} style={{ width: size - 1, height: size - 1 }} contentFit="contain" />
      <Text style={[styles.priceText, { fontSize: size, color }]}>{value.toLocaleString()}</Text>
    </View>
  );
}

export function Button({ label, onPress, variant = 'solid' }: { label: string; onPress: () => void; variant?: 'solid' | 'ghost' }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.button, variant === 'ghost' && styles.buttonGhost, pressed && { opacity: 0.8 }]}
    >
      <Text style={[styles.buttonText, variant === 'ghost' && { color: colors.red }]}>{label.toUpperCase()}</Text>
    </Pressable>
  );
}

export function Skeleton({ height = 150 }: { height?: number }) {
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
  return <Animated.View style={[styles.skeleton, { height, opacity: pulse }]} />;
}

export function ErrorView({ title, message, onRetry }: { title: string; message: string; onRetry: () => void }) {
  return (
    <View style={styles.centered}>
      <Ionicons name="cloud-offline-outline" size={44} color={colors.red} />
      <Text style={styles.errorTitle}>{title.toUpperCase()}</Text>
      <Text style={styles.errorText}>{message}</Text>
      <Button label="Try again" onPress={onRetry} />
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { paddingHorizontal: 20, paddingBottom: 18 },
  heroLabel: { fontFamily: fonts.displayMedium, color: 'rgba(255,255,255,0.8)', fontSize: 15, letterSpacing: 3 },
  heroTitle: { fontFamily: fonts.display, color: colors.white, fontSize: 64, lineHeight: 70, letterSpacing: 1 },
  heroCaption: { fontFamily: fonts.bodyMedium, color: 'rgba(255,255,255,0.75)', fontSize: 13 },
  slant: { height: 0, borderTopWidth: 28, borderTopColor: colors.redDeep, borderRightColor: 'transparent' },

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

  price: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  priceText: { fontFamily: fonts.bodyBold, fontVariant: ['tabular-nums'] },

  button: { backgroundColor: colors.red, borderRadius: 6, paddingHorizontal: 22, paddingVertical: 11, alignItems: 'center' },
  buttonGhost: { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.red },
  buttonText: { fontFamily: fonts.display, color: colors.white, fontSize: 15, letterSpacing: 2 },

  skeleton: { backgroundColor: colors.surfaceHigh, borderRadius: 8 },

  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 12 },
  errorTitle: { fontFamily: fonts.display, color: colors.text, fontSize: 22, letterSpacing: 1.5, textAlign: 'center' },
  errorText: { fontFamily: fonts.body, color: colors.muted, fontSize: 13, textAlign: 'center', marginBottom: 8 },
});
