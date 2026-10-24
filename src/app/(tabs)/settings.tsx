import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { ReactNode } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button, Header } from '@/components/ui';
import { useStore } from '@/lib/store-context';
import { colors, fonts } from '@/lib/theme';

export default function SettingsScreen() {
  const { riotId, openLogin, signOut } = useStore();
  const signedIn = riotId != null;

  const confirmSignOut = () =>
    Alert.alert('Sign out?', 'Wishlist alerts pause until you sign in again. Your wishlist stays on this phone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: () => signOut() },
    ]);

  return (
    <ScrollView style={styles.flex} contentContainerStyle={styles.scroll}>
      <Header title="Settings" />
      <View style={styles.body}>
        <Card title="Account">
          <Text style={styles.text}>{signedIn ? `Signed in as ${riotId}` : 'Not signed in'}</Text>
          {signedIn ? (
            <Button label="Sign out" variant="ghost" onPress={confirmSignOut} />
          ) : (
            <Button label="Sign in with Riot" onPress={openLogin} />
          )}
        </Card>

        <Card title="Privacy">
          <Line icon="lock-closed-outline" text="You sign in on Riot's own login page. Val Store never sees or stores your password." />
          <Line icon="phone-portrait-outline" text="Your session, wishlist and settings stay on this phone. There are no Val Store servers, accounts or analytics." />
          <Line icon="eye-off-outline" text="Val Store only reads your store and wallet. It never buys, spends or changes anything." />
          <Line icon="globe-outline" text="It talks to Riot for your store, and to valorant-api.com for skin names, images and videos." />
        </Card>

        <Card title="About">
          <Text style={styles.text}>Version {Constants.expoConfig?.version ?? '–'}</Text>
          <Text style={styles.muted}>
            {"Val Store is a fan-made app. It isn't affiliated with or endorsed by Riot Games. " +
              'VALORANT and Riot Games are trademarks of Riot Games, Inc.'}
          </Text>
        </Card>
      </View>
    </ScrollView>
  );
}

function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{title.toUpperCase()}</Text>
      {children}
    </View>
  );
}

function Line({ icon, text }: { icon: keyof typeof Ionicons.glyphMap; text: string }) {
  return (
    <View style={styles.line}>
      <Ionicons name={icon} size={18} color={colors.muted} />
      <Text style={[styles.text, styles.flex]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { paddingBottom: 32 },
  body: { paddingHorizontal: 16, paddingTop: 12, gap: 12 },
  card: { backgroundColor: colors.surface, borderRadius: 12, padding: 16, gap: 12 },
  cardTitle: { fontFamily: fonts.displayMedium, color: colors.text, fontSize: 16, letterSpacing: 1.5 },
  line: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  text: { fontFamily: fonts.body, color: colors.text, fontSize: 13, lineHeight: 19 },
  muted: { fontFamily: fonts.body, color: colors.muted, fontSize: 12, lineHeight: 18 },
});
