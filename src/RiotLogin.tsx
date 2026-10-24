import { useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';

import { AUTH_URL, parseTokens, Tokens } from './riot';
import { colors, fonts } from './theme';

// Plain mobile Chrome UA: some login providers refuse WebView ("; wv") user agents.
const UA =
  'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36';

/**
 * Loads Riot's authorize URL. If the WebView still has a Riot session cookie,
 * Riot redirects straight back with tokens and this stays invisible. Otherwise
 * it lands on the login page, which is shown full screen.
 */
export function RiotLogin({ onTokens }: { onTokens: (t: Tokens) => void }) {
  const [needsLogin, setNeedsLogin] = useState(false);
  const done = useRef(false);
  const insets = useSafeAreaInsets();

  // Returns true when the URL was the token redirect (so the WebView shouldn't load it).
  const check = (url: string) => {
    if (done.current) return true;
    const tokens = url.startsWith('https://playvalorant.com') ? parseTokens(url) : null;
    if (tokens) {
      done.current = true;
      onTokens(tokens);
      return true;
    }
    if (url.includes('authenticate.riotgames.com')) setNeedsLogin(true);
    return false;
  };

  return (
    <View style={needsLogin ? styles.sheet : styles.hidden}>
      {needsLogin && (
        <View style={[styles.header, { paddingTop: insets.top + 14 }]}>
          <Text style={styles.title}>SIGN IN WITH RIOT</Text>
          <Text style={styles.subtitle}>{"Use your Riot ID and password. Google and Apple sign-in don't work here."}</Text>
        </View>
      )}
      <WebView
        source={{ uri: AUTH_URL }}
        userAgent={UA}
        style={styles.web}
        onShouldStartLoadWithRequest={req => !check(req.url)}
        onNavigationStateChange={s => check(s.url)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  hidden: { position: 'absolute', width: 1, height: 1, opacity: 0 },
  sheet: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: colors.bg },
  header: { backgroundColor: colors.red, paddingHorizontal: 20, paddingBottom: 16, gap: 4 },
  title: { fontFamily: fonts.display, color: colors.white, fontSize: 24, letterSpacing: 2 },
  subtitle: { fontFamily: fonts.body, color: 'rgba(255,255,255,0.85)', fontSize: 12 },
  web: { flex: 1, backgroundColor: colors.bg },
});
