import { Tabs } from 'expo-router';
import { StyleSheet, type ColorValue } from 'react-native';

import { Ionicons } from '@expo/vector-icons';

import { colors, spacing } from '@/theme';
import type { IconName } from '@/lib/types';

/**
 * The five things a renter does.
 *
 * Rooms, roommates and saved are separate rather than one filtered list because
 * they answer different questions — "what can I afford", "who can I live with",
 * "what did I keep" — and merging them would need a mode switch to disambiguate.
 *
 * Unread counts ride on the messages tab so a reply is visible without opening
 * anything.
 */
export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: styles.bar,
        tabBarLabelStyle: styles.label,
        tabBarItemStyle: styles.item,
        sceneStyle: { backgroundColor: colors.background },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: tabIcon('home-outline', 'home'),
          tabBarAccessibilityLabel: 'Home',
        }}
      />
      <Tabs.Screen
        name="rooms"
        options={{
          title: 'Rooms',
          tabBarIcon: tabIcon('bed-outline', 'bed'),
          tabBarAccessibilityLabel: 'Rooms',
        }}
      />
      <Tabs.Screen
        name="roommates"
        options={{
          title: 'Roommates',
          tabBarIcon: tabIcon('people-outline', 'people'),
          tabBarAccessibilityLabel: 'Roommates',
        }}
      />
      <Tabs.Screen
        name="saved"
        options={{
          title: 'Saved',
          tabBarIcon: tabIcon('heart-outline', 'heart'),
          tabBarAccessibilityLabel: 'Saved',
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: tabIcon('person-outline', 'person'),
          tabBarAccessibilityLabel: 'Your profile',
        }}
      />
    </Tabs>
  );
}

/**
 * Paired outline/filled icons so the active tab reads as filled.
 *
 * React Navigation hands the tint as a `ColorValue`, which may be an opaque
 * reference object. Ionicons wants a string, and every colour the tab bar passes
 * comes from our own theme, so the cast is safe.
 *
 * Named rather than returned as a bare arrow so each icon shows up under its own
 * name in devtools and the React warning about missing display names goes away.
 */
function tabIcon(outline: IconName, filled: IconName) {
  return function TabIcon({ color, focused }: { color: ColorValue; focused: boolean }) {
    return (
      <Ionicons
        name={focused ? filled : outline}
        size={22}
        color={color as string}
        // Keeps the label from shifting when the glyph's optical weight changes.
        style={styles.icon}
      />
    );
  };
}

const styles = StyleSheet.create({
  bar: {
    height: 62,
    paddingTop: spacing.xs,
    paddingBottom: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
    backgroundColor: colors.surface,
  },
  item: { paddingVertical: 2 },
  label: { fontSize: 11, fontWeight: '600' },
  icon: { marginBottom: -2 },
});