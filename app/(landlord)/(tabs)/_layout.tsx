import { Platform, StyleSheet } from 'react-native';

import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { ReactNode } from 'react';

import type { IconName } from '@/constants/options';
import { colors, layout, typography } from '@/theme';

function tabIcon(focused: IconName, unfocused: IconName): (props: { focused: boolean }) => ReactNode {
  return ({ focused: isFocused }) => (
    <Ionicons name={isFocused ? focused : unfocused} size={24} color={isFocused ? colors.primary : colors.textMuted} />
  );
}

/**
 * Landlord bottom navigation: Dashboard, Listings, Bookings, Profile.
 *
 * Four tabs, no search — landlords browse their own properties rather than the
 * public catalogue, so Home/Saved/Roommates do not apply.
 */
export default function LandlordTabsLayout() {
  const insets = useSafeAreaInsets();
  const bottomInset = Platform.OS === 'android' ? insets.bottom : 0;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: [
          styles.bar,
          {
            height: (Platform.OS === 'ios' ? 84 : layout.tabBarHeight + 8) + bottomInset,
            paddingBottom: Platform.OS === 'ios' ? 28 : 8 + bottomInset,
          },
        ],
        tabBarLabelStyle: styles.label,
        sceneStyle: { backgroundColor: colors.background },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
          tabBarIcon: tabIcon('grid', 'grid-outline'),
        }}
      />
      <Tabs.Screen
        name="listings"
        options={{
          title: 'Listings',
          tabBarIcon: tabIcon('business', 'business-outline'),
        }}
      />
      <Tabs.Screen
        name="bookings"
        options={{
          title: 'Requests',
          tabBarIcon: tabIcon('clipboard', 'clipboard-outline'),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: tabIcon('person-circle', 'person-circle-outline'),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  bar: {
    backgroundColor: colors.surface,
    borderTopColor: colors.divider,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 6,
  },
  label: { ...typography.overline, letterSpacing: 0, fontSize: 11 },
});