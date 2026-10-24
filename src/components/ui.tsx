import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { ReactNode, useEffect, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppError, describe } from '@/lib/errors';
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

/** Ticks on its own, so only this text re-renders each second, not the screen around it. */
export function Countdown({ deadline, format }: { deadline: number; format: (sec: number) => string }) {
  const now = useNow();
  return format((deadline - now) / 1000);
}

// --- layout pieces ----------------------------------------------------------

/** Tab title on the left, optional extras (the wallet) on the right, screen-specific content below. */
export function Header({ title, right, children }: { title: string; right?: ReactNode; children?: ReactNode }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
      <View style={styles.headerRow}>
        <Text style={styles.headerTitle}>{title.toUpperCase()}</Text>
        {right}
      </View>
      {children}
    </View>
  );
}

export function Caption({ text }: { text: string }) {
  return <Text style={styles.caption}>{text}</Text>;
}

export function SectionHeader({ title, endsIn }: { title: string; endsIn?: ReactNode }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title.toUpperCase()}</Text>
      {endsIn && <Text style={styles.sectionNote}>ends in {endsIn}</Text>}
    </View>
  );
}

export function Pill({ children }: { children: ReactNode }) {
  return <View style={styles.pill}>{children}</View>;
}

/** The currency icon is drawn 2px taller than the digits and shares their line height, so the two sit centred. */
export function Price({ value, icon, size = 14, color = colors.text }: { value: number; icon: string; size?: number; color?: string }) {
  return (
    <View style={styles.price}>
      <Image source={icon} style={{ width: size + 2, height: size + 2 }} contentFit="contain" />
      <Text style={[styles.priceText, { fontSize: size, lineHeight: size + 2, color }]}>{value.toLocaleString()}</Text>
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

const ERROR_ICONS: Record<AppError['kind'], keyof typeof Ionicons.glyphMap> = {
  offline: 'cloud-offline-outline',
  timeout: 'hourglass-outline',
  session: 'key-outline',
  rateLimited: 'speedometer-outline',
  riotDown: 'construct-outline',
  catalogDown: 'images-outline',
  changed: 'refresh-circle-outline',
  unknown: 'alert-circle-outline',
};

/** Full-screen error with a friendly explanation, the technical detail in small print, and the next step. */
export function ErrorView({ error, onRetry, onSignIn }: { error: AppError; onRetry: () => void; onSignIn?: () => void }) {
  const copy = describe(error);
  return (
    <View style={styles.centered}>
      <Ionicons name={ERROR_ICONS[error.kind]} size={44} color={colors.red} />
      <Text style={styles.errorTitle}>{copy.title.toUpperCase()}</Text>
      <Text style={styles.errorText}>{copy.message}</Text>
      {copy.action === 'signIn' && onSignIn ? (
        <Button label="Sign in" onPress={onSignIn} />
      ) : (
        <Button label="Try again" onPress={onRetry} />
      )}
      {error.detail && <Text style={styles.errorDetail}>{error.detail}</Text>}
    </View>
  );
}

export function Notice({ text }: { text: string }) {
  return (
    <View style={styles.notice}>
      <Ionicons name="information-circle-outline" size={16} color={colors.muted} />
      <Text style={styles.noticeText}>{text}</Text>
    </View>
  );
}

// Containers (cards, inputs) use a 12px radius, small controls (pills, badges, buttons) 8px.
const styles = StyleSheet.create({
  header: { paddingHorizontal: 16 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, minHeight: 40 },
  headerTitle: { fontFamily: fonts.display, color: colors.text, fontSize: 28, letterSpacing: 1.5 },
  caption: { fontFamily: fonts.body, color: colors.muted, fontSize: 13, lineHeight: 18 },

  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 },
  sectionTitle: { fontFamily: fonts.displayMedium, color: colors.text, fontSize: 16, letterSpacing: 1.5 },
  sectionNote: { fontFamily: fonts.bodyMedium, color: colors.muted, fontSize: 12, fontVariant: ['tabular-nums'] },

  pill: { backgroundColor: colors.surface, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  price: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  priceText: { fontFamily: fonts.bodyBold, fontVariant: ['tabular-nums'] },

  button: { backgroundColor: colors.red, borderRadius: 8, paddingHorizontal: 22, paddingVertical: 11, alignItems: 'center' },
  buttonGhost: { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.red },
  buttonText: { fontFamily: fonts.display, color: colors.white, fontSize: 15, letterSpacing: 2 },

  skeleton: { backgroundColor: colors.surface, borderRadius: 12 },

  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 12 },
  errorTitle: { fontFamily: fonts.display, color: colors.text, fontSize: 22, letterSpacing: 1.5, textAlign: 'center' },
  errorText: { fontFamily: fonts.body, color: colors.muted, fontSize: 13, textAlign: 'center', marginBottom: 8 },
  errorDetail: { fontFamily: fonts.body, color: colors.muted, fontSize: 11, opacity: 0.6, marginTop: 8, textAlign: 'center' },
  notice: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.surface, borderRadius: 12, padding: 12 },
  noticeText: { flex: 1, fontFamily: fonts.body, color: colors.muted, fontSize: 12 },
});
