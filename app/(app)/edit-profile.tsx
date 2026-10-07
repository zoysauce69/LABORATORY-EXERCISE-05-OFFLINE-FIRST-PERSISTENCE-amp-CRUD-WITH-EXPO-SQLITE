import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { DateField, SegmentedControl, SelectField, SwitchField, TextField } from '@/components/form-fields';
import { ScreenHeader } from '@/components/screen-header';
import { AppText, Button, Card, ChipGroup, Divider, InlineAlert, Screen, ScreenScroll } from '@/components/ui';
import { useApp } from '@/hooks/use-app';
import { toMessage } from '@/lib/errors';
import { INTERESTS } from '@/lib/mock-data';
import { cities } from '@/constants/locations';
import {
  CLEANLINESS_OPTIONS,
  DRINKING_OPTIONS,
  GENDER_PREFERENCE_OPTIONS,
  GUEST_OPTIONS,
  PET_OPTIONS,
  SLEEP_SCHEDULE_OPTIONS,
  SMOKING_OPTIONS,
  STUDY_HABIT_OPTIONS,
  cleanlinessLabel,
  lifestyleSummary,
} from '@/constants/options';
import { budgetBounds, topMatches } from '@/services/roommate-service';
import { formatNumber, parsePesoInput } from '@/utils/format';
import { profileSchema, type ProfileValues } from '@/utils/validation';
import { colors, spacing } from '@/theme';
import type { Lifestyle } from '@/lib/types';

/**
 * Edit profile and search preferences.
 *
 * The most consequential screen in the app, because everything it writes feeds
 * the compatibility score shown on every roommate and every room listing. So it
 * is deliberately one long form rather than a wizard: a wizard makes people
 * abandon halfway, and a half-answered lifestyle silently produces a wrong score
 * with no indication why.
 *
 * Lifestyle edits save immediately. Text fields use an explicit Save, since a
 * half-typed email address should not be persisted just because someone
 * scrolled.
 */
export default function EditProfileScreen() {
  const router = useRouter();
  const { profile, updateProfile } = useApp();

  const [values, setValues] = useState<ProfileValues>(() => ({
    fullName: profile.fullName,
    email: profile.email,
    phone: profile.phone,
    occupation: profile.occupation,
    headline: profile.headline,
    bio: profile.bio,
    budgetMin: profile.budgetMin,
    budgetMax: profile.budgetMax,
    preferredCity: profile.preferredCity,
    moveInDate: profile.moveInDate,
  }));

  const [lifestyle, setLifestyle] = useState<Lifestyle>(profile.lifestyle);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDiscarding, setIsDiscarding] = useState(false);

  const budget = budgetBounds();
  const bestMatch = topMatches({ ...profile, ...values, lifestyle }, 1)[0];

  /** Lifestyle edits persist on the spot: there is nothing else to submit. */
  async function patchLifestyle(patch: Partial<Lifestyle>) {
    const next = { ...lifestyle, ...patch };
    setLifestyle(next);

    const result = await updateProfile({ lifestyle: next });
    if (!result.ok) {
      // Roll back so the controls never claim something storage rejected.
      setLifestyle(lifestyle);
      setFormError(toMessage(result.error, 'We could not save that change.'));
    }
  }

  function update<K extends keyof ProfileValues>(key: K, value: ProfileValues[K]) {
    setValues((current) => ({ ...current, [key]: value }));
    setErrors((current) => {
      if (!(key in current)) return current;
      const next = { ...current };
      delete next[key];
      return next;
    });
  }

  async function handleSave() {
    setFormError(null);

    const parsed = profileSchema.safeParse(values);
    if (!parsed.success) {
      const next: Record<string, string> = {};
      for (const issue of parsed.success ? [] : parsed.error.issues) {
        const key = issue.path[0];
        if (typeof key === 'string' && !(key in next)) next[key] = issue.message;
      }
      setErrors(next);
      setFormError('Check the highlighted fields and try again.');
      return;
    }

    setErrors({});
    setIsSaving(true);

    const result = await updateProfile(parsed.data);
    setIsSaving(false);

    if (!result.ok) {
      setFormError(toMessage(result.error, 'We could not save your profile.'));
      return;
    }

    router.back();
  }

  async function handleDiscard() {
    setIsDiscarding(true);
    const result = await updateProfile({
      fullName: profile.fullName,
      email: profile.email,
      phone: profile.phone,
      occupation: profile.occupation,
      headline: profile.headline,
      bio: profile.bio,
      budgetMin: profile.budgetMin,
      budgetMax: profile.budgetMax,
      preferredCity: profile.preferredCity,
      moveInDate: profile.moveInDate,
    });
    setIsDiscarding(false);
    if (result.ok) router.back();
  }

  return (
    <Screen testID="edit-profile-screen">
      <ScreenHeader
        title="Edit profile"
        subtitle="What you write here decides who sees you and what you see."
      />

      <ScreenScroll>
        {formError ? <InlineAlert tone="danger" message={formError} /> : null}

        {/* ── Score preview ────────────────────────────────────── */}
        <Card style={styles.previewCard}>
          <View style={styles.previewRow}>
            <View style={styles.previewText}>
              <AppText variant="captionStrong" color={colors.primary}>
                Your strongest match right now
              </AppText>
              <AppText variant="bodyStrong">
                {bestMatch ? `${bestMatch.fullName} · ${bestMatch.compatibilityScore}%` : 'Nobody yet'}
              </AppText>
            </View>
            <Ionicons name="pulse-outline" size={20} color={colors.primary} />
          </View>
          <AppText variant="caption">{lifestyleSummary(lifestyle)}</AppText>
          <AppText variant="caption" color={colors.textMuted}>
            This number moves as you change the answers below.
          </AppText>
        </Card>

        {/* ── About you ────────────────────────────────────────── */}
        <Section title="About you">
          <TextField
            label="Full name"
            value={values.fullName}
            onChangeText={(value) => update('fullName', value)}
            error={errors.fullName}
            icon="person-outline"
            autoCapitalize="words"
            required
          />

          <TextField
            label="Email"
            value={values.email}
            onChangeText={(value) => update('email', value)}
            error={errors.email}
            icon="mail-outline"
            keyboardType="email-address"
            autoCapitalize="none"
            required
          />

          <TextField
            label="Mobile number"
            value={values.phone}
            onChangeText={(value) => update('phone', value)}
            error={errors.phone}
            placeholder="09XX XXX XXXX"
            icon="call-outline"
            keyboardType="phone-pad"
            required
            hint="Landlords and roommates both use this to reach you."
          />

          <TextField
            label="What you do"
            value={values.occupation}
            onChangeText={(value) => update('occupation', value)}
            error={errors.occupation}
            placeholder="Student at UST, or Marketing associate at BDO"
            icon="briefcase-outline"
            required
          />

          <TextField
            label="Headline"
            value={values.headline}
            onChangeText={(value) => update('headline', value)}
            error={errors.headline}
            hint="One line. Shown under your name on every roommate card."
            placeholder="Quiet student, up early, happy to study together."
            maxLength={120}
          />

          <TextField
            label="About you"
            value={values.bio}
            onChangeText={(value) => update('bio', value)}
            error={errors.bio}
            hint="A paragraph is plenty. People decide faster on specifics than on adjectives."
            placeholder="I keep a regular schedule, I am tidy, and I would rather cook than eat out."
            multiline
            maxLength={600}
          />
        </Section>

        {/* ── What you are looking for ─────────────────────────── */}
        <Section
          title="What you are looking for"
          hint="These four set the search filters the app starts from."
        >
          <SelectField
            label="Preferred city"
            value={values.preferredCity}
            options={cities().map((city) => ({ value: city, label: city }))}
            onChange={(city) => update('preferredCity', city)}
            error={errors.preferredCity}
            required
          />

          <View style={styles.pair}>
            <View style={styles.pairField}>
              <TextField
                label="Budget from"
                value={String(values.budgetMin)}
                onChangeText={(value) => {
                  const parsed = parsePesoInput(value);
                  if (parsed !== null) update('budgetMin', parsed);
                }}
                error={errors.budgetMin}
                prefix="₱"
                keyboardType="number-pad"
                hint={`Typical range ${formatNumber(budget.min)}–${formatNumber(budget.max)}`}
              />
            </View>
            <View style={styles.pairField}>
              <TextField
                label="Budget to"
                value={String(values.budgetMax)}
                onChangeText={(value) => {
                  const parsed = parsePesoInput(value);
                  if (parsed !== null) update('budgetMax', parsed);
                }}
                error={errors.budgetMax}
                prefix="₱"
                keyboardType="number-pad"
              />
            </View>
          </View>

          <DateField
            label="Ideal move-in date"
            value={values.moveInDate}
            onChange={(value) => update('moveInDate', value)}
            error={errors.moveInDate}
            required
            presets={[7, 14, 30, 60]}
          />
        </Section>

        {/* ── How you live ─────────────────────────────────────── */}
        <Section
          title="How you live"
          hint="Six answers, and the input to every compatibility score in the app. Changes save as you go."
        >
          <SelectField
            label="Sleep schedule"
            value={lifestyle.sleepSchedule}
            options={SLEEP_SCHEDULE_OPTIONS.map((option) => ({ value: option.value, label: option.label }))}
            onChange={(sleepSchedule) => void patchLifestyle({ sleepSchedule })}
            hint="The single biggest driver of day-to-day friction."
          />

          <SelectField
            label="Study habits"
            value={lifestyle.studyHabits}
            options={STUDY_HABIT_OPTIONS.map((option) => ({ value: option.value, label: option.label }))}
            onChange={(studyHabits) => void patchLifestyle({ studyHabits })}
          />

          <SelectField
            label="Cleanliness"
            value={String(lifestyle.cleanliness)}
            options={CLEANLINESS_OPTIONS.map((option) => ({
              value: option.value,
              label: cleanlinessLabel(Number(option.value)),
              description: option.description,
            }))}
            onChange={(value) => void patchLifestyle({ cleanliness: Number(value) })}
          />

          <SegmentedControl
            label="Guests"
            value={lifestyle.guests}
            options={GUEST_OPTIONS.map((option) => ({ value: option.value, label: option.label }))}
            onChange={(guests) => void patchLifestyle({ guests })}
          />

          <SegmentedControl
            label="Smoking"
            value={lifestyle.smoking}
            options={SMOKING_OPTIONS.map((option) => ({ value: option.value, label: option.label }))}
            onChange={(smoking) => void patchLifestyle({ smoking })}
          />

          <SegmentedControl
            label="Drinking"
            value={lifestyle.drinking}
            options={DRINKING_OPTIONS.map((option) => ({ value: option.value, label: option.label }))}
            onChange={(drinking) => void patchLifestyle({ drinking })}
          />

          <SegmentedControl
            label="Pets"
            value={lifestyle.pets}
            options={PET_OPTIONS.map((option) => ({ value: option.value, label: option.label }))}
            onChange={(pets) => void patchLifestyle({ pets })}
          />

          <SelectField
            label="Who you would prefer to live with"
            value={lifestyle.genderPreference}
            options={GENDER_PREFERENCE_OPTIONS.map((option) => ({ value: option.value, label: option.label }))}
            onChange={(genderPreference) => void patchLifestyle({ genderPreference })}
            hint="Used to rank people, never to hide anyone from you."
          />
        </Section>

        {/* ── Interests ────────────────────────────────────────── */}
        <Section title="Interests" hint="Pick at least three. This is how you find people you would enjoy living with.">
          <ChipGroup
            options={INTERESTS.map((interest) => ({ value: interest, label: interest }))}
            selected={profile.interests}
            onToggle={(interest) => {
              const next = profile.interests.includes(interest)
                ? profile.interests.filter((item) => item !== interest)
                : [...profile.interests, interest];
              void updateProfile({ interests: next });
            }}
            multiple
          />
        </Section>

        {/* ── Visibility ───────────────────────────────────────── */}
        <Section title="Visibility">
          <SwitchField
            label="Show me in roommate search"
            description="You can always apply to rooms while hidden. Turning this off does not remove anything you have already applied for."
            value={profile.isDiscoverable}
            onChange={(isDiscoverable) => void updateProfile({ isDiscoverable })}
          />
        </Section>

        <Divider />

        <View style={styles.actions}>
          <Button
            label="Save changes"
            onPress={() => void handleSave()}
            isLoading={isSaving}
            size="lg"
            style={styles.actionPrimary}
          />
          <Button
            label="Discard"
            variant="ghost"
            onPress={() => void handleDiscard()}
            isLoading={isDiscarding}
            disabled={isSaving}
            style={styles.actionSecondary}
          />
        </View>

        <AppText variant="caption" align="center">
          Lifestyle and interest changes save immediately. Name, contact and search fields need
          Save.
        </AppText>
      </ScreenScroll>
    </Screen>
  );
}

/* ------------------------------------------------------------------ */
/* Pieces                                                             */
/* ------------------------------------------------------------------ */

function Section({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <AppText variant="heading" accessibilityRole="header">
        {title}
      </AppText>
      {hint ? <AppText variant="caption">{hint}</AppText> : null}
      <View style={styles.sectionBody}>{children}</View>
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Styles                                                             */
/* ------------------------------------------------------------------ */

const styles = StyleSheet.create({
  previewCard: { gap: spacing.xs, padding: spacing.lg, backgroundColor: colors.primarySoft },
  previewRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  previewText: { flex: 1, gap: 2 },

  section: { gap: spacing.sm },
  sectionBody: { gap: spacing.lg, paddingTop: spacing.xs },
  pair: { flexDirection: 'row', gap: spacing.md },
  pairField: { flex: 1 },

  actions: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  actionPrimary: { flex: 1 },
  actionSecondary: { flexShrink: 1 },
});
