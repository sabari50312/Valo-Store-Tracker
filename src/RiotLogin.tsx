import { useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';

import { AUTH_URL, parseTokens, Tokens } from './riot';

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
    <View style={needsLogin ? StyleSheet.absoluteFill : styles.hidden}>
      <WebView
        source={{ uri: AUTH_URL }}
        userAgent={UA}
        onShouldStartLoadWithRequest={req => !check(req.url)}
        onNavigationStateChange={s => check(s.url)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  hidden: { position: 'absolute', width: 1, height: 1, opacity: 0 },
});
