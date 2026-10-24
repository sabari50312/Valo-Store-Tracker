import { Ionicons } from '@expo/vector-icons';
import { useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';

import { AUTH_URL, parseTokens, Tokens } from '@/lib/riot';
import { colors, fonts } from '@/lib/theme';

import { Button } from './ui';

/**
 * Riot's login page, full screen. Only needed when the session cookie is
 * missing or expired; refreshes use silentAuth() with the cookie this leaves behind.
 */
export function RiotLogin({ onTokens, onClose }: { onTokens: (t: Tokens) => void; onClose: () => void }) {
  const done = useRef(false);
  const insets = useSafeAreaInsets();
  const [attempt, setAttempt] = useState(0); // bump to reload the page
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState<string | null>(null);

  // Returns true when the URL was the token redirect (so the WebView shouldn't load it).
  const check = (url: string) => {
    if (done.current) return true;
    const tokens = url.startsWith('https://playvalorant.com') ? parseTokens(url) : null;
    if (!tokens) return false;
    done.current = true;
    onTokens(tokens);
    return true;
  };

  const retry = () => {
    setFailed(null);
    setLoading(true);
    setAttempt(a => a + 1);
  };

  return (
    <View style={styles.sheet}>
      <View style={[styles.header, { paddingTop: insets.top + 14 }]}>
        <View style={styles.headerText}>
          <Text style={styles.title}>SIGN IN WITH RIOT</Text>
          <Text style={styles.subtitle}>
            {"This is Riot's own login page. Use your Riot ID and password; Google and Apple sign-in don't work here."}
          </Text>
        </View>
        <Pressable onPress={onClose} hitSlop={12} accessibilityLabel="Close">
          <Ionicons name="close" size={26} color={colors.white} />
        </Pressable>
      </View>

      {failed ? (
        <View style={styles.centered}>
          <Ionicons name="cloud-offline-outline" size={40} color={colors.red} />
          <Text style={styles.failTitle}>{"COULDN'T OPEN RIOT'S LOGIN PAGE"}</Text>
          <Text style={styles.failText}>Check your connection and try again.</Text>
          <Button label="Try again" onPress={retry} />
          <Text style={styles.failDetail}>{failed}</Text>
        </View>
      ) : (
        <View style={styles.flex}>
          <WebView
            key={attempt}
            source={{ uri: AUTH_URL }}
            style={styles.web}
            onShouldStartLoadWithRequest={req => !check(req.url)}
            onNavigationStateChange={s => check(s.url)}
            onLoadEnd={() => setLoading(false)}
            onError={e => setFailed(e.nativeEvent.description || 'network error')}
            onHttpError={e => {
              // Only the page itself matters; Riot's own sub-resources can 4xx harmlessly.
              if (e.nativeEvent.url.startsWith('https://authenticate.riotgames.com') && e.nativeEvent.statusCode >= 500) {
                setFailed(`${e.nativeEvent.statusCode} from authenticate.riotgames.com`);
              }
            }}
          />
          {loading && <ActivityIndicator style={styles.spinner} color={colors.red} />}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  sheet: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: colors.red,
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  headerText: { flex: 1, gap: 4 },
  title: { fontFamily: fonts.display, color: colors.white, fontSize: 24, letterSpacing: 2 },
  subtitle: { fontFamily: fonts.body, color: 'rgba(255,255,255,0.85)', fontSize: 12 },
  web: { flex: 1, backgroundColor: colors.bg },
  spinner: { position: 'absolute', top: 40, alignSelf: 'center' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 12 },
  failTitle: { fontFamily: fonts.display, color: colors.text, fontSize: 20, letterSpacing: 1.5, textAlign: 'center' },
  failText: { fontFamily: fonts.body, color: colors.muted, fontSize: 13, textAlign: 'center', marginBottom: 8 },
  failDetail: { fontFamily: fonts.body, color: colors.muted, fontSize: 11, opacity: 0.6, marginTop: 8 },
});
