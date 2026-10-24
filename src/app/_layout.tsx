import { BarlowCondensed_600SemiBold, BarlowCondensed_700Bold } from '@expo-google-fonts/barlow-condensed';
import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold, useFonts } from '@expo-google-fonts/inter';
import { ErrorBoundaryProps, Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { RiotLogin } from '@/components/RiotLogin';
import { ErrorView } from '@/components/ui';
import { toAppError } from '@/lib/errors';
import { StoreProvider, useStore } from '@/lib/store-context';
import { colors } from '@/lib/theme';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    BarlowCondensed_600SemiBold,
    BarlowCondensed_700Bold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) SplashScreen.hideAsync();
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <SafeAreaProvider>
      <StoreProvider>
        <StatusBar style="light" />
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }} />
        <LoginOverlay />
      </StoreProvider>
    </SafeAreaProvider>
  );
}

/** Covers every screen when Riot needs a fresh login. */
function LoginOverlay() {
  const { state, onLogin, closeLogin } = useStore();
  return state.kind === 'login' ? <RiotLogin onTokens={onLogin} onClose={closeLogin} /> : null;
}

/** Last line of defence for render crashes anywhere below the root layout. */
export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <ErrorView error={toAppError(error)} onRetry={retry} />
      </View>
    </SafeAreaProvider>
  );
}
