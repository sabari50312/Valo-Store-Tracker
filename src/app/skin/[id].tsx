import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ErrorView, SectionHeader } from '@/components/ui';
import { Chroma, Skin } from '@/lib/catalog';
import { colors, fonts } from '@/lib/theme';
import { useCatalog } from '@/lib/use-catalog';
import { toggleWish, useWishlist, wishFromSkin } from '@/lib/wishlist';

export default function SkinScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { catalog, error, retry } = useCatalog();

  if (error) return <ErrorView title="Couldn't load skin" message={error} onRetry={retry} />;
  if (!catalog) return <ActivityIndicator style={styles.flex} color={colors.red} />;

  const skin = catalog.byId.get(id);
  if (!skin) return <ErrorView title="Skin not found" message={id} onRetry={() => router.back()} />;
  return <SkinDetail skin={skin} />;
}

// "KillBanner" -> "Kill Banner"
const spaced = (s: string) => s.replace(/([a-z])([A-Z])/g, '$1 $2');

function SkinDetail({ skin }: { skin: Skin }) {
  const insets = useSafeAreaInsets();
  const wished = useWishlist().some(w => w.skinId === skin.id);
  const [chroma, setChroma] = useState<Chroma | undefined>(skin.chromas[0]);
  const [video, setVideo] = useState<string | null>(null);
  const tint = skin.tierColor ?? colors.surfaceHigh;

  const player = useVideoPlayer(null, p => {
    p.loop = true;
  });
  useEffect(() => {
    if (!video) {
      player.pause();
      return;
    }
    player.replaceAsync(video).then(() => player.play());
  }, [video, player]);

  const pickChroma = (c: Chroma) => {
    setChroma(c);
    setVideo(c.video);
  };

  const hasVideos = skin.levels.some(l => l.video) || skin.chromas.some(c => c.video);

  return (
    <ScrollView style={styles.flex} contentContainerStyle={styles.scroll}>
      <LinearGradient colors={[tint + '66', colors.bg]} style={[styles.top, { paddingTop: insets.top + 8 }]}>
        <View style={styles.topBar}>
          <IconButton name="chevron-back" onPress={() => router.back()} />
          <IconButton
            name={wished ? 'heart' : 'heart-outline'}
            color={wished ? colors.red : colors.text}
            onPress={() => toggleWish(wishFromSkin(skin))}
          />
        </View>

        <View style={styles.media}>
          {video ? (
            <VideoView player={player} style={styles.fill} contentFit="contain" nativeControls />
          ) : (
            chroma?.render && <Image source={chroma.render} style={styles.fill} contentFit="contain" transition={200} />
          )}
        </View>
      </LinearGradient>

      <View style={styles.body}>
        <View style={styles.titleRow}>
          {skin.tierIcon && <Image source={skin.tierIcon} style={styles.tierIcon} contentFit="contain" />}
          <Text style={styles.name}>{skin.name.toUpperCase()}</Text>
        </View>
        {chroma && chroma.name !== skin.name && <Text style={styles.sub}>{chroma.name}</Text>}

        {skin.chromas.length > 1 && (
          <>
            <SectionHeader title="Variants" />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.swatches}>
              {skin.chromas.map(c => (
                <Pressable
                  key={c.id}
                  onPress={() => pickChroma(c)}
                  style={[styles.swatch, chroma?.id === c.id && styles.swatchActive]}
                >
                  <Image source={c.swatch ?? c.render} style={styles.fill} contentFit="cover" />
                </Pressable>
              ))}
            </ScrollView>
          </>
        )}

        <SectionHeader title="Upgrades" />
        {!hasVideos && <Text style={styles.sub}>No preview videos for this skin.</Text>}
        {skin.levels.map((l, i) => {
          const active = video != null && video === l.video;
          return (
            <Pressable
              key={l.id}
              disabled={!l.video}
              onPress={() => setVideo(active ? null : l.video)}
              style={({ pressed }) => [styles.level, active && styles.levelActive, pressed && { opacity: 0.85 }]}
            >
              <View style={[styles.levelNum, active && { backgroundColor: colors.red }]}>
                <Text style={styles.levelNumText}>{i + 1}</Text>
              </View>
              <Text style={styles.levelKind}>{spaced(l.kind).toUpperCase()}</Text>
              {l.video && <Ionicons name={active ? 'pause' : 'play'} size={18} color={active ? colors.red : colors.text} />}
            </Pressable>
          );
        })}
      </View>
    </ScrollView>
  );
}

function IconButton({ name, onPress, color = colors.text }: { name: keyof typeof Ionicons.glyphMap; onPress: () => void; color?: string }) {
  return (
    <Pressable onPress={onPress} hitSlop={10} style={({ pressed }) => [styles.iconButton, pressed && { opacity: 0.7 }]}>
      <Ionicons name={name} size={22} color={color} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bg },
  fill: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  scroll: { paddingBottom: 40 },
  top: { paddingHorizontal: 16 },
  topBar: { flexDirection: 'row', justifyContent: 'space-between' },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(15,25,35,0.45)',
  },
  media: { height: 230, marginTop: 8, borderRadius: 8, overflow: 'hidden' },

  body: { paddingHorizontal: 16, gap: 10 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 8 },
  tierIcon: { width: 24, height: 24 },
  name: { flex: 1, fontFamily: fonts.display, color: colors.text, fontSize: 32, lineHeight: 34, letterSpacing: 1 },
  sub: { fontFamily: fonts.body, color: colors.muted, fontSize: 13 },

  swatches: { gap: 10, paddingVertical: 2 },
  swatch: { width: 52, height: 52, borderRadius: 26, overflow: 'hidden', borderWidth: 2, borderColor: colors.line },
  swatchActive: { borderColor: colors.red },

  level: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    backgroundColor: colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.line,
  },
  levelActive: { borderColor: colors.red },
  levelNum: {
    width: 28,
    height: 28,
    borderRadius: 4,
    backgroundColor: colors.surfaceHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
  levelNumText: { fontFamily: fonts.display, color: colors.white, fontSize: 16 },
  levelKind: { flex: 1, fontFamily: fonts.displayMedium, color: colors.text, fontSize: 17, letterSpacing: 1 },
});
