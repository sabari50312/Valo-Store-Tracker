import { BarlowCondensed_600SemiBold, BarlowCondensed_700Bold } from '@expo-google-fonts/barlow-condensed';
import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold, useFonts } from '@expo-google-fonts/inter';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { getStore, Store, Tokens } from './src/riot';
import { RiotLogin } from './src/RiotLogin';
import { ErrorScreen, LoadingScreen, StoreScreen } from './src/StoreScreen';
import { colors } from './src/theme';

SplashScreen.preventAutoHideAsync();

type State =
  | { kind: 'auth' }
  | { kind: 'loading' }
  | { kind: 'store'; store: Store }
  | { kind: 'error'; message: string };

export default function App() {
  const [fontsLoaded, fontError] = useFonts({
    BarlowCondensed_600SemiBold,
    BarlowCondensed_700Bold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
  });
  const [state, setState] = useState<State>({ kind: 'auth' });
  const [authKey, setAuthKey] = useState(0); // bump to remount RiotLogin and re-auth

  useEffect(() => {
    if (fontsLoaded || fontError) SplashScreen.hideAsync();
  }, [fontsLoaded, fontError]);

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

  if (!fontsLoaded && !fontError) return null;

  return (
    <SafeAreaProvider>
      <View style={styles.root}>
        <StatusBar style="light" />
        {state.kind === 'store' ? (
          <StoreScreen store={state.store} onRefresh={refresh} />
        ) : state.kind === 'error' ? (
          <ErrorScreen message={state.message} onRetry={refresh} />
        ) : (
          <LoadingScreen label={state.kind === 'auth' ? 'connecting to Riot…' : 'loading your offers…'} />
        )}
        {state.kind === 'auth' && <RiotLogin key={authKey} onTokens={onTokens} />}
      </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
});
