import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Ionicons } from '@expo/vector-icons';

import { DateField, TextField } from '@/components/form-fields';
import { AppText, Button, InlineAlert } from '@/components/ui';
import { applicationSchema, type ApplicationValues } from '@/utils/validation';
import { colors, hitSlop, layout, radii, spacing } from '@/theme';
import { lifestyleSummary } from '@/constants/options';
import type { Profile, RequestDetails, Roommate } from '@/lib/types';

/**
 * Everything the form collects, minus the target.
 *
 * The sheet does not know whether it is applying to a room or to a person — the
 * caller does, because only the caller knows the id. So the sheet hands back the
 * form fields alone and each call site adds `kind` and the matching id.
 */
export type RequestSheetValues = RequestDetails;

interface RequestSheetProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (draft: RequestSheetValues) => Promise<{ ok: boolean; error?: string }>;
  profile: Profile;
  /** Shown in the header. Room applications and roommate requests differ here. */
  subject: { title: string; subtitle: string; avatarUrl?: string | null; name?: string };
  /** Rooms cap this; roommate requests are always one person. */
  maxOccupants?: number;
  /** Pre-fills the note with the compatibility reasons that matter here. */
  suggestedNote?: string;
  /** Message shown when the submit failed because one is already in flight. */
  duplicateMessage?: string;
}

/**
 * The one form behind "Apply to this room" and "Ask to live with them".
 *
 * A sheet rather than a screen because the decision it captures is a small part
 * of a larger detail page — leaving the listing to fill in a form loses the
 * context you were reading. Fields are pre-filled from the profile because
 * re-typing a phone number you already gave us is how forms get abandoned.
 *
 * Contact details are shown but editable: a real form would send whatever is
 * here, and the demo should let you see what happens when you change it.
 *
 * Split in two so the form can be remounted per subject. React Navigation and
 * React Native both handle "reset the form when it reopens" badly — an effect
 * that clears state while the modal animates out shows the empty form sliding
 * away, and a key that changes with `visible` has the same problem. Keying on
 * the subject instead resets exactly when the old answers would be wrong (a
 * different room or a different person) and leaves the animation alone.
 */
export function RequestSheet({
  visible,
  onClose,
  onSubmit,
  profile,
  subject,
  maxOccupants = 1,
  suggestedNote = '',
  duplicateMessage,
}: RequestSheetProps) {
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose} statusBarTranslucent>
      <Pressable style={styles.scrim} onPress={onClose} accessibilityLabel="Close" />

      <View style={styles.sheet}>
        <View style={styles.handle} />

        <View style={styles.header}>
          <View style={styles.headerText}>
            <AppText variant="subheading" accessibilityRole="header">
              {subject.title}
            </AppText>
            <AppText variant="caption" numberOfLines={1}>
              {subject.subtitle}
            </AppText>
          </View>
          <Pressable
            onPress={onClose}
            hitSlop={hitSlop}
            accessibilityRole="button"
            accessibilityLabel="Close"
            style={({ pressed }) => [styles.close, pressed && styles.pressed]}
          >
            <Ionicons name="close" size={22} color={colors.textSecondary} />
          </Pressable>
        </View>

        <RequestForm
          // One request per room or per person: a room's capacity decides whether
          // the occupant picker appears at all, so it belongs in the key too.
          key={`${subject.name ?? subject.subtitle}:${maxOccupants}`}
          profile={profile}
          subject={subject}
          maxOccupants={maxOccupants}
          suggestedNote={suggestedNote}
          duplicateMessage={duplicateMessage}
          onClose={onClose}
          onSubmit={onSubmit}
        />
      </View>
    </Modal>
  );
}

function RequestForm({
  profile,
  subject,
  maxOccupants,
  suggestedNote,
  duplicateMessage,
  onClose,
  onSubmit,
}: Omit<RequestSheetProps, 'visible'>) {
  // Seeded from the profile rather than left blank: the date, name and number
  // have already been given once, and asking again is how forms get abandoned.
  const [values, setValues] = useState<ApplicationValues>(() => ({
    moveInDate: profile.moveInDate,
    occupants: 1,
    contactName: profile.fullName,
    contactPhone: profile.phone,
    contactEmail: profile.email,
    note: suggestedNote ?? '',
  }));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function update<K extends keyof ApplicationValues>(key: K, value: ApplicationValues[K]) {
    setValues((current) => ({ ...current, [key]: value }));
    // Clear the message as soon as someone edits, so a stale error sitting under
    // a field they are actively fixing reads as a broken form.
    setErrors((current) => {
      if (!(key in current)) return current;
      const next = { ...current };
      delete next[key];
      return next;
    });
  }

  async function handleSubmit() {
    const parsed = applicationSchema.safeParse(values);
    if (!parsed.success) {
      const next: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0];
        if (typeof key === 'string' && !(key in next)) next[key] = issue.message;
      }
      setErrors(next);
      setFormError('Check the highlighted fields and try again.');
      return;
    }

    setErrors({});
    setFormError(null);
    setIsSubmitting(true);

    const result = await onSubmit({
      occupants: parsed.data.occupants,
      moveInDate: parsed.data.moveInDate,
      contactName: parsed.data.contactName,
      contactPhone: parsed.data.contactPhone,
      contactEmail: parsed.data.contactEmail,
      note: parsed.data.note,
    });

    setIsSubmitting(false);
    if (result.ok) {
      onClose();
      return;
    }
    // A duplicate is a state problem, not a form problem, so it reads as an
    // alert above the form rather than an error on the submit button.
    setFormError(
      result.error?.includes('already') && duplicateMessage ? duplicateMessage : (result.error ?? null),
    );
  }

  return (
    <>
      <ScrollView
        style={styles.body}
        contentContainerStyle={styles.bodyContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {formError ? <InlineAlert tone="warning" message={formError} /> : null}

        <DateField
          label="Move-in date"
          value={values.moveInDate}
          onChange={(value) => update('moveInDate', value)}
          error={errors.moveInDate}
          hint="When you would actually be living there"
          required
        />

        {maxOccupants && maxOccupants > 1 ? (
          <View style={styles.field}>
            <AppText variant="captionStrong" color={colors.textSecondary}>
              How many people are moving in?
            </AppText>
            <View style={styles.counterRow}>
              {[1, 2].map((count) => (
                <Button
                  key={count}
                  label={`${count} ${count === 1 ? 'person' : 'people'}`}
                  variant={values.occupants === count ? 'primary' : 'secondary'}
                  size="sm"
                  onPress={() => update('occupants', count)}
                  style={styles.counterButton}
                />
              ))}
            </View>
            {errors.occupants ? (
              <AppText variant="caption" color={colors.danger}>
                {errors.occupants}
              </AppText>
            ) : (
              <AppText variant="caption">
                This room allows up to {maxOccupants} people.
              </AppText>
            )}
          </View>
        ) : null}

        <View style={styles.divider} />

        <View style={styles.field}>
          <AppText variant="captionStrong" color={colors.textSecondary}>
            Your contact details
          </AppText>
          <AppText variant="caption">
            These go with the request. Edit them if you want the other person to use a different
            number.
          </AppText>
        </View>

        <TextField
          label="Full name"
          value={values.contactName}
          onChangeText={(value) => update('contactName', value)}
          error={errors.contactName}
          icon="person-outline"
          autoCapitalize="words"
          required
        />

        <TextField
          label="Mobile number"
          value={values.contactPhone}
          onChangeText={(value) => update('contactPhone', value)}
          error={errors.contactPhone}
          placeholder="09XX XXX XXXX"
          icon="call-outline"
          keyboardType="phone-pad"
          required
        />

        <TextField
          label="Email"
          value={values.contactEmail}
          onChangeText={(value) => update('contactEmail', value)}
          error={errors.contactEmail}
          icon="mail-outline"
          keyboardType="email-address"
          required
        />

        <TextField
          label="Anything they should know?"
          value={values.note}
          onChangeText={(value) => update('note', value)}
          error={errors.note}
          hint="Optional. Schedule, dietary needs, or why this place works for you."
          placeholder="I usually study late, so a quiet room would help."
          multiline
          maxLength={500}
        />

        <View style={styles.notice}>
          <Ionicons name="information-circle-outline" size={16} color={colors.textMuted} />
          <AppText variant="caption" style={styles.noticeText}>
            Sending this does not commit you to anything. It just opens the conversation.
          </AppText>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Button
          label="Not now"
          variant="ghost"
          onPress={onClose}
          disabled={isSubmitting}
          style={styles.footerSecondary}
        />
        <Button
          label={subject.title}
          onPress={() => void handleSubmit()}
          isLoading={isSubmitting}
          style={styles.footerPrimary}
        />
      </View>
    </>
  );
}

/** The header copy for a roommate request, derived from their profile. */
export function roommateSubject(roommate: Roommate): RequestSheetProps['subject'] {
  return {
    title: 'Send a request',
    subtitle: `${roommate.fullName} · ${roommate.compatibilityScore}% compatible`,
    avatarUrl: roommate.avatarUrl,
    name: roommate.fullName,
  };
}

/** One line summarising the lifestyle the other person would be living with. */
export function lifestyleLine(lifestyle: Roommate['lifestyle']): string {
  return lifestyleSummary(lifestyle);
}

const styles = StyleSheet.create({
  scrim: { flex: 1, backgroundColor: colors.overlay },
  sheet: {
    maxHeight: '92%',
    backgroundColor: colors.surface,
    borderTopLeftRadius: radii.xxl,
    borderTopRightRadius: radii.xxl,
  },
  handle: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.borderStrong,
    marginTop: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },
  headerText: { flex: 1, gap: 2 },
  close: {
    width: 34,
    height: 34,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { backgroundColor: colors.surfaceMuted },

  body: { flexGrow: 0 },
  bodyContent: { paddingHorizontal: spacing.xl, paddingBottom: spacing.xl, gap: spacing.lg },

  field: { gap: spacing.xs },
  counterRow: { flexDirection: 'row', gap: spacing.sm },
  counterButton: { flex: 1 },
  divider: { height: 1, backgroundColor: colors.divider },
  notice: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  noticeText: { flex: 1 },

  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
    minHeight: layout.controlHeight + spacing.xl,
  },
  footerSecondary: { flexShrink: 1 },
  footerPrimary: { flex: 1 },
});