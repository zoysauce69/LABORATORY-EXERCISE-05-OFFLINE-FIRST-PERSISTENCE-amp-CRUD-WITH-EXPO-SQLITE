import { Platform, StyleSheet } from 'react-native';

import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { ReactNode } from 'react';

import type { IconName } from '@/constants/options';
import { colors, layout, typography } from '@/theme';

/**
 * Student bottom navigation: Home, Saved, Bookings, Roommates, Profile.
 *
 * Exactly the five destinations the brief specifies. Anything deeper (filters,
 * forms, detail pages) is a stack screen pushed above the tabs so the tab bar is
 * not duplicated.
 */
function tabIcon(name: IconName, focused: boolean): ReactNode {
  return <Ionicons name={name} size={24} color={focused ? colors.primary : colors.textMuted} />;
}

export default function StudentTabsLayout() {
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
        tabBarItemStyle: styles.item,
        sceneStyle: { backgroundColor: colors.background },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ focused }) => tabIcon(focused ? 'home' : 'home-outline', focused),
        }}
      />
      <Tabs.Screen
        name="saved"
        options={{
          title: 'Saved',
          tabBarIcon: ({ focused }) => tabIcon(focused ? 'heart' : 'heart-outline', focused),
        }}
      />
      <Tabs.Screen
        name="bookings"
        options={{
          title: 'Bookings',
          tabBarIcon: ({ focused }) => tabIcon(focused ? 'calendar' : 'calendar-outline', focused),
        }}
      />
      <Tabs.Screen
        name="roommates"
        options={{
          title: 'Roommates',
          tabBarIcon: ({ focused }) => tabIcon(focused ? 'people' : 'people-outline', focused),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ focused }) => tabIcon(focused ? 'person-circle' : 'person-circle-outline', focused),
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
  item: { paddingVertical: 2 },
  label: { ...typography.overline, letterSpacing: 0, fontSize: 11 },
});