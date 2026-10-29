import { Ionicons } from '@expo/vector-icons';
import { ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AUTH_URL, parseTokens, Tokens } from '@/lib/riot';
import { colors, fonts } from '@/lib/theme';

import { Button } from './ui';

/**
 * Browser version of RiotLogin. A web page can't read another site's address,
 * so Riot's login opens in a new tab and you bring the link back: after login,
 * Riot sends you to a playvalorant.com page whose address carries the tokens
 * (#access_token=...). Copy it there, then one tap here reads the clipboard.
 */
export function RiotLogin({ onTokens, onClose }: { onTokens: (t: Tokens) => void; onClose: () => void }) {
  const done = useRef(false);
  const insets = useSafeAreaInsets();
  const [opened, setOpened] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const [manual, setManual] = useState(false); // show the paste box

  const tryLink = useCallback(
    (text: string) => {
      if (done.current) return true;
      const tokens = parseTokens(text.trim());
      if (!tokens) {
        setProblem(
          text.includes('playvalorant.com')
            ? "That link has no login in it. Copy it from the page Riot sends you to after you've logged in."
            : "That isn't the Riot link. After logging in, copy the address of the page you land on.",
        );
        return false;
      }
      done.current = true;
      // The link is a live login: don't leave it in the clipboard (or clipboard history).
      navigator.clipboard?.writeText('').catch(() => {});
      onTokens(tokens);
      return true;
    },
    [onTokens],
  );

  // On a computer, Ctrl+V / Cmd+V anywhere on this screen works too.
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const text = e.clipboardData?.getData('text');
      if (text && !(e.target instanceof HTMLInputElement)) tryLink(text);
    };
    document.addEventListener('paste', onPaste);
    return () => document.removeEventListener('paste', onPaste);
  }, [tryLink]);

  const openRiot = () => {
    setProblem(null);
    setOpened(true);
    window.open(AUTH_URL, '_blank', 'noopener');
  };

  const readClipboard = async () => {
    setProblem(null);
    let text: string;
    try {
      // iPhone shows a "Paste" bubble to confirm; Chrome asks for clipboard access once.
      text = await navigator.clipboard.readText();
    } catch {
      setManual(true);
      setProblem("Your browser didn't let Val Store read the clipboard. Paste the link in the box below instead.");
      return;
    }
    tryLink(text);
  };

  return (
    <View style={styles.sheet}>
      <View style={[styles.header, { paddingTop: insets.top + 14 }]}>
        <View style={styles.headerText}>
          <Text style={styles.title}>SIGN IN WITH RIOT</Text>
          <Text style={styles.subtitle}>
            {"You log in on Riot's own site, in a new tab. Val Store never sees your password."}
          </Text>
        </View>
        <Pressable onPress={onClose} hitSlop={12} accessibilityLabel="Close">
          <Ionicons name="close" size={26} color={colors.white} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + 32 }]} keyboardShouldPersistTaps="handled">
        <Step n={1} done={opened} title="Open Riot's login">
          <Button label={opened ? 'Open it again' : 'Open Riot login'} variant={opened ? 'ghost' : 'solid'} onPress={openRiot} />
        </Step>
        <Step n={2} title="Log in">
          <Text style={styles.text}>
            {"You'll end up on a playvalorant.com page that says it can't be found. That's expected: your login is in that page's address."}
          </Text>
        </Step>
        <Step n={3} title="Copy that page's link">
          <Text style={styles.text}>
            Tap <Text style={styles.strong}>Share → Copy</Text>, or copy the address from the address bar.
          </Text>
        </Step>
        <Step n={4} title="Come back here">
          <Button label="Use copied link" variant={opened ? 'solid' : 'ghost'} onPress={readClipboard} />
        </Step>

        {problem && (
          <View style={styles.problem}>
            <Ionicons name="alert-circle-outline" size={18} color={colors.red} />
            <Text style={[styles.text, styles.flex]}>{problem}</Text>
          </View>
        )}

        {manual ? (
          <TextInput
            autoFocus
            placeholder="Paste the playvalorant.com link here"
            placeholderTextColor={colors.muted}
            style={styles.input}
            autoCapitalize="none"
            autoCorrect={false}
            onChangeText={t => t && tryLink(t)}
          />
        ) : (
          <Pressable onPress={() => setManual(true)} hitSlop={8} style={styles.manualLink}>
            <Text style={styles.manualText}>Paste it yourself instead</Text>
          </Pressable>
        )}
      </ScrollView>
    </View>
  );
}

function Step({ n, title, done = false, children }: { n: number; title: string; done?: boolean; children: ReactNode }) {
  return (
    <View style={styles.step}>
      <View style={[styles.badge, done && styles.badgeDone]}>
        {done ? <Ionicons name="checkmark" size={16} color={colors.white} /> : <Text style={styles.badgeText}>{n}</Text>}
      </View>
      <View style={styles.stepBody}>
        <Text style={styles.stepTitle}>{title.toUpperCase()}</Text>
        {children}
      </View>
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

  body: { padding: 16, gap: 12 },
  step: { flexDirection: 'row', gap: 12, backgroundColor: colors.surface, borderRadius: 12, padding: 16 },
  badge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.surfaceHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeDone: { backgroundColor: colors.red },
  badgeText: { fontFamily: fonts.bodyBold, color: colors.text, fontSize: 13 },
  stepBody: { flex: 1, gap: 10, paddingTop: 4 },
  stepTitle: { fontFamily: fonts.displayMedium, color: colors.text, fontSize: 16, letterSpacing: 1.5 },
  text: { fontFamily: fonts.body, color: colors.muted, fontSize: 13, lineHeight: 19 },
  strong: { fontFamily: fonts.bodyBold, color: colors.text },

  problem: { flexDirection: 'row', gap: 10, alignItems: 'flex-start', padding: 12, borderRadius: 12, backgroundColor: colors.red + '1F' },
  input: {
    fontFamily: fonts.body,
    color: colors.text,
    fontSize: 15,
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  manualLink: { alignSelf: 'center', paddingVertical: 4 },
  manualText: { fontFamily: fonts.bodyMedium, color: colors.muted, fontSize: 13, textDecorationLine: 'underline' },
});
