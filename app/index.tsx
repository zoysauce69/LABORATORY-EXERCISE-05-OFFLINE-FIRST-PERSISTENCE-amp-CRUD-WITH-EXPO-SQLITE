import { StyleSheet, View } from 'react-native';

import { Redirect } from 'expo-router';

import { ErrorState, LoadingState } from '@/components/ui';
import { useApp } from '@/hooks/use-app';
import { colors } from '@/theme';

/**
 * Entry point and the app's only route guard decision point.
 *
 * Renders nothing but a spinner until the persisted session has been read, so
 * the app never flashes the landing page at someone who is already signed in.
 * From there the destination is unconditional: signed out goes to the landing
 * page, signed in goes to the tabs. Both destination areas have their own
 * guards, so a stale back stack cannot strand the user on the wrong side.
 */
export default function Index() {
  const { isLoading, isSignedIn, loadError, reload } = useApp();

  if (isLoading) {
    return (
      <View style={styles.container}>
        <LoadingState label="Opening RoomLink" />
      </View>
    );
  }

  // A failed read is not a signed-out state. Guessing here would silently
  // discard the user's session, so surface it and let them retry.
  if (loadError) {
    return (
      <View style={styles.container}>
        <ErrorState
          title="We could not read your saved data"
          message={loadError}
          onRetry={() => {
            void reload();
          }}
        />
      </View>
    );
  }

  return <Redirect href={isSignedIn ? '/(app)/(tabs)' : '/(public)/landing'} />;
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
});