import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Ionicons } from '@expo/vector-icons';

import { AppText, Button, InlineAlert } from '@/components/ui';
import { PlainTextField } from '@/components/form-fields';
import { colors, radii, spacing } from '@/theme';

export interface RejectRequestSheetProps {
  visible: boolean;
  onClose: () => void;
  /** Resolve true once the reason has been persisted. */
  onSubmit: (reason: string) => Promise<boolean>;
  isSubmitting?: boolean;
  /** Names the request being declined, e.g. the listing title. */
  subject?: string;
}

const MAX_REASON = 300;

const SUGGESTIONS = [
  'The unit is no longer available.',
  'Another applicant has already been approved for this slot.',
  'This listing requires a one-year advance, which your request did not mention.',
];

/**
 * Reason sheet for declining a booking.
 *
 * The reason is stored on the booking and shown to the renter verbatim, so it is
 * required and length-checked rather than optional.
 */
export function RejectRequestSheet({
  visible,
  onClose,
  onSubmit,
  isSubmitting = false,
  subject,
}: RejectRequestSheetProps) {
  const [reason, setReason] = useState('');
  const [touched, setTouched] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const trimmed = reason.trim();
  const empty = trimmed.length === 0;
  const tooLong = trimmed.length > MAX_REASON;

  const submit = useCallback(async () => {
    setTouched(true);
    setError(null);

    if (empty || tooLong) return;

    const saved = await onSubmit(trimmed);
    if (!saved) {
      // Keep the sheet open so the landlord does not lose their typed reason.
      setError('The reason could not be saved. Please try again.');
      return;
    }

    setReason('');
    setTouched(false);
    onClose();
  }, [empty, onClose, onSubmit, tooLong, trimmed]);

  const dismiss = useCallback(() => {
    if (isSubmitting) return;
    setReason('');
    setTouched(false);
    setError(null);
    onClose();
  }, [isSubmitting, onClose]);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents={visible ? 'auto' : 'none'}>
      {visible ? (
        <Pressable
          style={styles.backdrop}
          accessibilityRole="button"
          accessibilityLabel="Close without declining"
          onPress={dismiss}
        >
          <Pressable style={styles.sheet} onPress={(event) => event.stopPropagation()}>
            <View style={styles.grabber} />

            <View style={styles.header}>
              <View style={styles.headerText}>
                <AppText variant="subheading" accessibilityRole="header">
                  Decline this request
                </AppText>
                {subject ? (
                  <AppText variant="caption" numberOfLines={2}>
                    {subject}
                  </AppText>
                ) : null}
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close"
                onPress={dismiss}
                hitSlop={8}
                style={styles.close}
              >
                <Ionicons name="close" size={20} color={colors.textMuted} />
              </Pressable>
            </View>

            <ScrollView
              style={styles.body}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <AppText variant="caption" color={colors.textSecondary}>
                The renter reads this message word for word, so keep it brief and factual.
              </AppText>

              <PlainTextField
                label="Reason"
                value={reason}
                onChangeText={setReason}
                placeholder="Explain why you are declining."
                multiline
                numberOfLines={4}
                error={
                  touched && empty ? 'Tell the renter why.' : tooLong ? 'Keep it shorter.' : undefined
                }
                hint={`${trimmed.length}/${MAX_REASON}`}
                containerStyle={styles.field}
              />

              <View style={styles.suggestions}>
                {SUGGESTIONS.map((suggestion) => (
                  <Pressable
                    key={suggestion}
                    accessibilityRole="button"
                    accessibilityLabel={`Use this reason: ${suggestion}`}
                    onPress={() => setReason(suggestion)}
                    style={styles.suggestion}
                  >
                    <Ionicons
                      name="return-down-forward-outline"
                      size={14}
                      color={colors.primary}
                    />
                    <AppText variant="caption" color={colors.primary} style={{ flex: 1 }}>
                      {suggestion}
                    </AppText>
                  </Pressable>
                ))}
              </View>

              {error ? <InlineAlert tone="danger" message={error} /> : null}
            </ScrollView>

            <View style={styles.actions}>
              <Button
                label="Keep it"
                variant="ghost"
                style={{ flex: 1 }}
                onPress={dismiss}
                disabled={isSubmitting}
              />
              <Button
                label="Decline"
                variant="danger"
                icon="close-circle-outline"
                style={{ flex: 1 }}
                onPress={() => void submit()}
                isLoading={isSubmitting}
              />
            </View>
          </Pressable>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    padding: spacing.lg,
    gap: spacing.md,
    maxHeight: '88%',
  },
  grabber: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
  },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  headerText: { flex: 1, gap: 2 },
  close: { padding: spacing.xs },
  body: { gap: spacing.md },
  field: { marginTop: spacing.xs },
  suggestions: { gap: spacing.xs },
  suggestion: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    padding: spacing.sm,
    borderRadius: radii.sm,
    backgroundColor: colors.primarySoft,
  },
  actions: { flexDirection: 'row', gap: spacing.sm },
});