import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';

import { colors, fonts } from '@/lib/theme';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: colors.bg },
        tabBarActiveTintColor: colors.red,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.line },
        tabBarLabelStyle: { fontFamily: fonts.displayMedium, fontSize: 13, letterSpacing: 1 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'STORE',
          tabBarIcon: ({ color, size }) => <Ionicons name="bag-handle" size={size} color={color as string} />,
        }}
      />
      <Tabs.Screen
        name="wishlist"
        options={{
          title: 'WISHLIST',
          tabBarIcon: ({ color, size }) => <Ionicons name="heart" size={size} color={color as string} />,
        }}
      />
    </Tabs>
  );
}
