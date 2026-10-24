import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  RefreshControl,
  StatusBar as RNStatusBar,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { getStore, Item, Store, Tokens } from './src/riot';
import { RiotLogin } from './src/RiotLogin';

const C = { bg: '#0f1923', panel: '#17232f', line: '#2a3a49', text: '#ece8e1', muted: '#8b978f', accent: '#ff4655' };

type State =
  | { kind: 'auth' }
  | { kind: 'loading' }
  | { kind: 'store'; store: Store }
  | { kind: 'error'; message: string };

export default function App() {
  const [state, setState] = useState<State>({ kind: 'auth' });
  const [authKey, setAuthKey] = useState(0); // bump to remount RiotLogin and re-auth

  const refresh = () => {
    setState({ kind: 'auth' });
    setAuthKey(k => k + 1);
  };

  const onTokens = async (t: Tokens) => {
    setState({ kind: 'loading' });
    try {
      setState({ kind: 'store', store: await getStore(t) });
    } catch (e) {
      setState({ kind: 'error', message: String(e instanceof Error ? e.message : e) });
    }
  };

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <Text style={styles.title}>
        VALORANT <Text style={{ color: C.accent }}>STORE</Text>
      </Text>

      {state.kind === 'store' ? (
        <StoreView store={state.store} onRefresh={refresh} />
      ) : state.kind === 'error' ? (
        <View style={styles.center}>
          <Text style={styles.error}>{state.message}</Text>
          <Pressable style={styles.button} onPress={refresh}>
            <Text style={styles.buttonText}>Retry</Text>
          </Pressable>
        </View>
      ) : (
        <View style={styles.center}>
          <ActivityIndicator color={C.accent} />
          <Text style={styles.muted}>{state.kind === 'auth' ? 'Connecting to Riot…' : 'Loading store…'}</Text>
        </View>
      )}

      {state.kind === 'auth' && <RiotLogin key={authKey} onTokens={onTokens} />}
    </View>
  );
}

function useNow() {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}

function fmt(sec: number) {
  sec = Math.max(0, Math.floor(sec));
  const d = Math.floor(sec / 86400);
  const h = Math.floor((sec % 86400) / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d ? d + 'd ' : ''}${h}h ${pad(m)}m ${pad(s)}s`;
}

function StoreView({ store, onRefresh }: { store: Store; onRefresh: () => void }) {
  const now = useNow();
  const left = (remaining: number) => fmt(remaining - (now - store.fetchedAt) / 1000);

  return (
    <ScrollView
      contentContainerStyle={styles.scroll}
      refreshControl={<RefreshControl refreshing={false} onRefresh={onRefresh} tintColor={C.accent} />}
    >
      <Section title="Daily offers" timer={left(store.daily.remaining)} />
      {store.daily.items.map((it, i) => <SkinCard key={i} item={it} />)}

      {store.nightMarket && (
        <>
          <Section title="Night market" timer={left(store.nightMarket.remaining)} />
          {store.nightMarket.items.map((it, i) => <SkinCard key={i} item={it} />)}
        </>
      )}

      {store.bundles.map((b, i) => (
        <View key={i}>
          <Section title="Bundle" timer={left(b.remaining)} />
          <View style={styles.card}>
            {b.image && <Image source={{ uri: b.image }} style={styles.bundleImage} resizeMode="cover" />}
            <View style={styles.row}>
              <Text style={styles.name}>{b.name}</Text>
              <Text style={styles.price}>{b.price} VP</Text>
            </View>
            {b.items.length > 0 && <Text style={styles.muted}>{b.items.join(' · ')}</Text>}
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

function Section({ title, timer }: { title: string; timer: string }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title.toUpperCase()}</Text>
      <Text style={styles.sectionTitle}>{timer}</Text>
    </View>
  );
}

function SkinCard({ item }: { item: Item }) {
  return (
    <View style={[styles.card, { borderBottomColor: item.tierColor ?? C.line }]}>
      {item.image && <Image source={{ uri: item.image }} style={styles.skinImage} resizeMode="contain" />}
      <View style={styles.row}>
        <Text style={styles.name}>{item.name}</Text>
        <Text style={styles.price}>
          {item.basePrice != null && <Text style={styles.strike}>{item.basePrice} </Text>}
          {item.price} VP
          {item.discount != null && <Text style={{ color: C.accent }}>  -{item.discount}%</Text>}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg, paddingTop: (RNStatusBar.currentHeight ?? 24) + 12 },
  title: { color: C.text, fontSize: 20, fontWeight: '700', letterSpacing: 2, paddingHorizontal: 16, marginBottom: 8 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24 },
  muted: { color: C.muted, fontSize: 13 },
  error: { color: C.accent, textAlign: 'center' },
  button: { backgroundColor: C.accent, paddingHorizontal: 20, paddingVertical: 10 },
  buttonText: { color: '#fff', fontWeight: '700' },
  scroll: { paddingHorizontal: 16, paddingBottom: 48 },
  section: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 20, marginBottom: 8 },
  sectionTitle: { color: C.muted, fontSize: 12, letterSpacing: 1.5, fontVariant: ['tabular-nums'] },
  card: {
    backgroundColor: C.panel,
    borderWidth: 1,
    borderColor: C.line,
    borderBottomWidth: 3,
    padding: 14,
    gap: 10,
    marginBottom: 10,
  },
  skinImage: { width: '100%', height: 80 },
  bundleImage: { width: '100%', aspectRatio: 16 / 7 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  name: { color: C.text, fontWeight: '600', flexShrink: 1 },
  price: { color: C.text, fontVariant: ['tabular-nums'] },
  strike: { color: C.muted, textDecorationLine: 'line-through' },
});
