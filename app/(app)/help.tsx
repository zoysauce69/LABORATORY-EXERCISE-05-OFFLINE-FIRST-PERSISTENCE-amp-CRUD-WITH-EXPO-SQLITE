import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { SearchBar } from '@/components/search-bar';
import { ScreenHeader } from '@/components/screen-header';
import { AppText, Button, Card, Divider, EmptyState, Screen, ScreenScroll } from '@/components/ui';
import { useApp } from '@/hooks/use-app';
import { FAQS } from '@/lib/mock-data';
import { MAX_SCORE_WEIGHT, SCORE_INPUTS, SCORE_WEIGHTS } from '@/services/compatibility';
import { colors, radii, spacing } from '@/theme';
import type { FaqCategory, FaqItem } from '@/lib/types';

const CATEGORIES: { value: FaqCategory; label: string }[] = [
  { value: 'getting_started', label: 'Getting started' },
  { value: 'rooms', label: 'Rooms' },
  { value: 'roommates', label: 'Roommates' },
  { value: 'applications', label: 'Applications' },
  { value: 'account', label: 'Account' },
];

const CATEGORY_LABELS: Record<FaqCategory, string> = Object.fromEntries(
  CATEGORIES.map((category) => [category.value, category.label]),
) as Record<FaqCategory, string>;

/**
 * Help and FAQs.
 *
 * Explains the two things a first-time user cannot infer: how the compatibility
 * number is produced, and what happens to their data. The demo has no support
 * desk, so the "still stuck" path points at the in-app demo account rather than
 * inventing an email address that goes nowhere.
 */
export default function HelpScreen() {
  const router = useRouter();
  const { profile } = useApp();

  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<FaqCategory | 'all'>('all');
  const [openIds, setOpenIds] = useState<string[]>([]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();

    return FAQS.filter((faq) => {
      if (category !== 'all' && faq.category !== category) return false;
      if (needle.length === 0) return true;
      return (
        faq.question.toLowerCase().includes(needle) || faq.answer.toLowerCase().includes(needle)
      );
    });
  }, [category, query]);

  function toggle(id: string) {
    setOpenIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  }

  return (
    <Screen testID="help-screen">
      <ScreenHeader title="Help" subtitle="How matching works, and what we store." />

      <ScreenScroll>
        <SearchBar
          value={query}
          onChangeText={setQuery}
          placeholder="Search the FAQs"
          testID="faq-search"
        />

        <View style={styles.categories}>
          <CategoryChip label="All" isActive={category === 'all'} onPress={() => setCategory('all')} />
          {CATEGORIES.map((item) => (
            <CategoryChip
              key={item.value}
              label={item.label}
              isActive={category === item.value}
              onPress={() => setCategory(item.value)}
            />
          ))}
        </View>

        {/* ── Compatibility explainer ──────────────────────────── */}
        <Card style={styles.explainer}>
          <View style={styles.explainerHeader}>
            <Ionicons name="analytics-outline" size={18} color={colors.primary} />
            <AppText variant="bodyStrong" style={styles.explainerTitle}>
              Where your compatibility score comes from
            </AppText>
          </View>

          <AppText variant="caption">
            Six axes, each comparing one of your answers against the other person’s. They are
            weighted by how much they actually affect living together, then added up.
          </AppText>

          <View style={styles.axisList}>
            {SCORE_INPUTS.map((input) => {
              const weight = SCORE_WEIGHTS[input.key];
              return (
                <View key={input.key} style={styles.axisRow}>
                  <View style={styles.axisText}>
                    <AppText variant="captionStrong">{input.label}</AppText>
                    <AppText variant="caption" color={colors.textMuted}>
                      {input.detail}
                    </AppText>
                  </View>
                  <View style={styles.axisTrack}>
                    <View
                      style={[styles.axisFill, { width: `${(weight / MAX_SCORE_WEIGHT) * 100}%` }]}
                    />
                  </View>
                  <AppText variant="overline" color={colors.textMuted}>
                    {weight}
                  </AppText>
                </View>
              );
            })}
          </View>

          <Divider />
          <AppText variant="caption">
            A score is a starting point for a conversation, not a decision. Everyone’s arrangement
            is different — check the side-by-side table on a profile before you read too much into
            the number.
          </AppText>
          <Button
            label="Edit my lifestyle answers"
            variant="ghost"
            size="sm"
            icon="create-outline"
            onPress={() => router.push('/(app)/edit-profile')}
          />
        </Card>

        {/* ── FAQs ─────────────────────────────────────────────── */}
        {filtered.length === 0 ? (
          <EmptyState
            icon="help-circle-outline"
            title="Nothing matches that search"
            message="Try a shorter phrase, or switch back to All to browse everything."
            actionLabel="Clear search"
            onAction={() => {
              setQuery('');
              setCategory('all');
            }}
          />
        ) : (
          <View style={styles.faqList}>
            {filtered.map((faq) => (
              <FaqRow
                key={faq.id}
                faq={faq}
                isOpen={openIds.includes(faq.id)}
                onPress={() => toggle(faq.id)}
              />
            ))}
          </View>
        )}

        {/* ── Still stuck ──────────────────────────────────────── */}
        <Card style={styles.contactCard}>
          <AppText variant="bodyStrong">Still stuck?</AppText>
          <AppText variant="caption">
            This build has no support desk and no server — it is a working prototype, so the most
            useful thing to do is check the demo account in Settings, or reset the data and try the
            flow again from a clean state.
          </AppText>
          <AppText variant="caption" color={colors.textMuted}>
            Signed in as {profile.email}.
          </AppText>
        </Card>
      </ScreenScroll>
    </Screen>
  );
}

/* ------------------------------------------------------------------ */
/* Pieces                                                             */
/* ------------------------------------------------------------------ */

function CategoryChip({
  label,
  isActive,
  onPress,
}: {
  label: string;
  isActive: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: isActive }}
      accessibilityLabel={label}
      style={({ pressed }) => [
        styles.category,
        isActive && styles.categoryActive,
        pressed && styles.pressed,
      ]}
    >
      <AppText variant="caption" color={isActive ? colors.textInverse : colors.textSecondary}>
        {label}
      </AppText>
    </Pressable>
  );
}

function FaqRow({ faq, isOpen, onPress }: { faq: FaqItem; isOpen: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ expanded: isOpen }}
      accessibilityHint={isOpen ? 'Collapses this answer' : 'Expands this answer'}
      style={({ pressed }) => [styles.faq, pressed && styles.pressed]}
    >
      <View style={styles.faqHeader}>
        <AppText variant="captionStrong" color={colors.primary}>
          {CATEGORY_LABELS[faq.category]}
        </AppText>
        <AppText variant="bodyStrong" style={styles.faqQuestion}>
          {faq.question}
        </AppText>
        <Ionicons
          name={isOpen ? 'chevron-up' : 'chevron-down'}
          size={17}
          color={colors.textMuted}
        />
      </View>
      {isOpen ? (
        <AppText variant="body" style={styles.faqAnswer}>
          {faq.answer}
        </AppText>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  categories: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  category: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
  },
  categoryActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  pressed: { opacity: 0.7 },

  explainer: { gap: spacing.md, padding: spacing.lg },
  explainerHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  explainerTitle: { flex: 1 },
  axisList: { gap: spacing.sm },
  axisRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  axisText: { width: 150, gap: 1 },
  axisTrack: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
    backgroundColor: colors.surfaceMuted,
  },
  axisFill: { height: '100%', borderRadius: 3, backgroundColor: colors.primary },

  faqList: { gap: spacing.sm },
  faq: {
    gap: spacing.sm,
    padding: spacing.lg,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  faqHeader: { gap: spacing.xs },
  faqQuestion: { marginTop: 2 },
  faqAnswer: { paddingTop: spacing.xs, borderTopWidth: 1, borderTopColor: colors.divider },

  contactCard: { gap: spacing.xs, padding: spacing.lg, backgroundColor: colors.surfaceMuted },
});
