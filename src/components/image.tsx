import { useState } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { Image, type ImageStyle } from 'expo-image';

import { colors, radii, spacing } from '@/theme';
import type { IconName } from '@/lib/types';

interface SmartImageProps {
  uri: string | null | undefined;
  style?: StyleProp<ImageStyle>;
  /** Container style, so the placeholder can match the rounded corners. */
  containerStyle?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
  icon?: IconName;
  borderRadius?: number;
}

/**
 * An image with a graceful fallback.
 *
 * Every listing photo is a remote Unsplash URL, so a failed request is a normal
 * possibility rather than an edge case — offline, blocked, or rate-limited.
 * `onError` swaps in a neutral placeholder instead of leaving a blank frame.
 */
export function SmartImage({
  uri,
  style,
  containerStyle,
  accessibilityLabel,
  icon = 'image-outline',
  borderRadius = 0,
}: SmartImageProps) {
  const [hasFailed, setHasFailed] = useState(false);

  const showFallback = !uri || hasFailed;

  return (
    <View style={[styles.container, { borderRadius }, containerStyle]}>
      {showFallback ? (
        <View
          style={[styles.fallback, { borderRadius }]}
          accessibilityRole="image"
          accessibilityLabel={accessibilityLabel ? `${accessibilityLabel} (no photo)` : 'No photo available'}
        >
          <Ionicons name={icon} size={24} color={colors.textMuted} />
        </View>
      ) : (
        <Image
          source={{ uri }}
          style={[styles.image, { borderRadius }, style]}
          contentFit="cover"
          transition={180}
          accessible
          accessibilityLabel={accessibilityLabel}
          onError={() => setHasFailed(true)}
          // Remote URLs change between fixture loads in development; keying on
          // the uri resets the failed flag if the source is swapped out.
          key={uri}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { overflow: 'hidden', backgroundColor: colors.surfaceMuted },
  image: { width: '100%', height: '100%' },
  fallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceMuted,
    minHeight: 80,
    paddingVertical: spacing.lg,
  },
  rounded: { borderRadius: radii.md },
});