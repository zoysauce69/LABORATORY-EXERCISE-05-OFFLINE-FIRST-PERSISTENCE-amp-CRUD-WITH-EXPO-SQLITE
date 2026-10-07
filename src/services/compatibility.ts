/**
 * Compatibility scoring.
 *
 * The roommate list shows a 0-100 score, but a hardcoded number in a fixture
 * goes stale the moment the signed-in user edits their own preferences. So the
 * score is *recomputed* from the two lifestyle profiles and budget ranges here,
 * and the fixtures only supply the copy for the reasons.
 *
 * Every axis scores in [0, 1]. Axes where either side said "no preference" are
 * skipped entirely and do not drag the score down — you should not be penalised
 * for being flexible.
 */

import type { Lifestyle, MatchReason, Roommate, Profile } from '@/lib/types';
import { formatPeso } from '@/utils/format';

interface Axis {
  label: string;
  /** Returns null when the axis cannot be compared, so it is skipped. */
  score: (mine: Lifestyle, theirs: Lifestyle) => number | null;
  detail: (mine: Lifestyle, theirs: Lifestyle) => string;
}

function kindOf(score: number): MatchReason['kind'] {
  if (score >= 0.75) return 'match';
  if (score >= 0.4) return 'near';
  return 'mismatch';
}

/**
 * Treats "no preference" as a wildcard on both sides.
 *
 * Generic over the union so the result keeps the caller's token type — the
 * label maps are keyed on that union, and widening it to `string` would turn
 * every lookup into an unchecked index.
 */
function specific<T extends string>(value: T, wildcard: T): T | null {
  return value === wildcard ? null : value;
}

const SLEEP_LABEL: Record<Lifestyle['sleepSchedule'], string> = {
  early_bird: 'early birds',
  night_owl: 'night owls',
  flexible: 'flexible schedules',
};

const STUDY_LABEL: Record<Lifestyle['studyHabits'], string> = {
  quiet_study: 'both prefer quiet study',
  study_together: 'both like company while studying',
  no_preference: 'either way',
};

const PET_LABEL: Record<Lifestyle['pets'], string> = {
  love_pets: 'pet people',
  no_pets: 'no pets',
  no_preference: 'flexible on pets',
};

const GUEST_LABEL: Record<Lifestyle['guests'], string> = {
  few_guests: 'both fine with occasional guests',
  no_guests: 'both prefer no guests',
  no_preference: 'flexible on guests',
};

const axes: Axis[] = [
  {
    label: 'Sleep schedule',
    score: (mine, theirs) => {
      if (mine.sleepSchedule === 'flexible' || theirs.sleepSchedule === 'flexible') return 0.7;
      return mine.sleepSchedule === theirs.sleepSchedule ? 1 : 0.1;
    },
    detail: (mine, theirs) =>
      mine.sleepSchedule === theirs.sleepSchedule && mine.sleepSchedule !== 'flexible'
        ? `Both ${SLEEP_LABEL[mine.sleepSchedule]}`
        : mine.sleepSchedule === 'flexible' || theirs.sleepSchedule === 'flexible'
          ? `Flexible — one of you is ${SLEEP_LABEL[mine.sleepSchedule === 'flexible' ? theirs.sleepSchedule : mine.sleepSchedule].replace('early birds', 'an early bird').replace('night owls', 'a night owl')}`
          : `You are ${mine.sleepSchedule === 'early_bird' ? 'an early bird' : 'a night owl'}, they are ${
              theirs.sleepSchedule === 'early_bird' ? 'an early bird' : 'a night owl'
            }`,
  },
  {
    label: 'Study habits',
    score: (mine, theirs) => {
      const a = specific(mine.studyHabits, 'no_preference');
      const b = specific(theirs.studyHabits, 'no_preference');
      if (!a || !b) return null;
      return a === b ? 1 : a === 'study_together' || b === 'study_together' ? 0.55 : 0.2;
    },
    detail: (mine, theirs) =>
      mine.studyHabits === theirs.studyHabits && mine.studyHabits !== 'no_preference'
        ? STUDY_LABEL[mine.studyHabits]
        : 'Different study styles — worth talking through',
  },
  {
    label: 'Cleanliness',
    score: (mine, theirs) => {
      const delta = Math.abs(mine.cleanliness - theirs.cleanliness);
      return Math.max(0, 1 - delta / 4);
    },
    detail: (mine, theirs) => {
      const delta = Math.abs(mine.cleanliness - theirs.cleanliness);
      if (delta === 0) return 'Identical expectations';
      if (delta === 1) return 'Close — within one step';
      if (delta <= 2) return `A ${delta}-step difference in tidiness`;
      return `Quite different: yours is ${mine.cleanliness}/5, theirs is ${theirs.cleanliness}/5`;
    },
  },
  {
    label: 'Smoking',
    score: (mine, theirs) => {
      const a = specific(mine.smoking, 'no_preference');
      const b = specific(theirs.smoking, 'no_preference');
      if (!a || !b) return null;
      return a === b ? 1 : 0;
    },
    detail: (mine, theirs) =>
      mine.smoking === theirs.smoking && mine.smoking !== 'no_preference'
        ? 'Both non-smokers'
        : 'One of you smokes — this one matters',
  },
  {
    label: 'Drinking',
    score: (mine, theirs) => {
      const a = specific(mine.drinking, 'no_preference');
      const b = specific(theirs.drinking, 'no_preference');
      if (!a || !b) return null;
      return a === b ? 1 : 0.4;
    },
    detail: (mine, theirs) =>
      mine.drinking === theirs.drinking && mine.drinking !== 'no_preference'
        ? mine.drinking === 'non_drinker'
          ? 'Neither of you drinks'
          : 'You both drink socially'
        : 'Different habits around alcohol',
  },
  {
    label: 'Pets',
    score: (mine, theirs) => {
      const a = specific(mine.pets, 'no_preference');
      const b = specific(theirs.pets, 'no_preference');
      if (!a || !b) return null;
      return a === b ? 1 : a === 'love_pets' && b === 'no_pets' ? 0 : 0.5;
    },
    detail: (mine, theirs) => {
      const a = specific(mine.pets, 'no_preference');
      const b = specific(theirs.pets, 'no_preference');
      if (!a || !b) return `Flexible on pets`;
      return a === b ? `Both ${PET_LABEL[a]}` : `You are ${PET_LABEL[a]}, they are ${PET_LABEL[b]}`;
    },
  },
  {
    label: 'Guests',
    score: (mine, theirs) => {
      const a = specific(mine.guests, 'no_preference');
      const b = specific(theirs.guests, 'no_preference');
      if (!a || !b) return null;
      return a === b ? 1 : a === 'no_guests' || b === 'no_guests' ? 0.15 : 0.5;
    },
    detail: (mine, theirs) => {
      const a = specific(mine.guests, 'no_preference');
      const b = specific(theirs.guests, 'no_preference');
      if (!a || !b) return 'Flexible on guests';
      return a === b ? `You are both ${GUEST_LABEL[a]}` : 'Different expectations on visitors';
    },
  },
];

/** How much two peso ranges overlap, as a fraction of the narrower range. */
export function budgetOverlapScore(
  mineMin: number,
  mineMax: number,
  theirsMin: number,
  theirsMax: number,
): { score: number; detail: string } {
  const overlap = Math.min(mineMax, theirsMax) - Math.max(mineMin, theirsMin);
  const width = Math.min(mineMax - mineMin, theirsMax - theirsMin);
  if (width <= 0) return { score: 0.5, detail: 'One of you has a fixed budget' };
  if (overlap <= 0) {
    return { score: 0, detail: `No overlap — you are at ${formatPeso(mineMin)}–${formatPeso(mineMax)}` };
  }
  const score = Math.min(1, overlap / width);
  return {
    score,
    detail:
      score > 0.95
        ? `Your ${formatPeso(mineMin)}–${formatPeso(mineMax)} covers their ${formatPeso(theirsMin)}–${formatPeso(theirsMax)}`
        : `Your ${formatPeso(mineMin)}–${formatPeso(mineMax)} overlaps their ${formatPeso(theirsMin)}–${formatPeso(theirsMax)}`,
  };
}

/** Do two preferred cities agree at all? */
function cityScore(mine: string, theirs: string): { score: number; detail: string } {
  if (mine === theirs) return { score: 1, detail: `Both prefer ${theirs}` };
  return { score: 0.2, detail: `You prefer ${mine}, they prefer ${theirs}` };
}

/** How close are two move-in dates, in days? */
function dateScore(mine: string, theirs: string): { score: number; detail: string } {
  const a = new Date(mine).getTime();
  const b = new Date(theirs).getTime();
  if (Number.isNaN(a) || Number.isNaN(b)) return { score: 0.5, detail: 'One move-in date is not set' };
  const days = Math.abs(a - b) / 86_400_000;
  if (days <= 7) return { score: 1, detail: 'Moving in within a week of each other' };
  if (days <= 21) return { score: 0.8, detail: `Moving in about ${Math.round(days)} days apart` };
  if (days <= 45) return { score: 0.5, detail: `Moving in ${Math.round(days)} days apart` };
  return { score: 0.15, detail: `Move-in dates are ${Math.round(days)} days apart` };
}

const AXIS_SLEEP = axes[0] as Axis;
const AXIS_STUDY = axes[1] as Axis;
const AXIS_CLEAN = axes[2] as Axis;
const AXIS_SMOKE = axes[3] as Axis;
const AXIS_DRINK = axes[4] as Axis;
const AXIS_PETS = axes[5] as Axis;
const AXIS_GUESTS = axes[6] as Axis;

/**
 * How much each input counts towards the score.
 *
 * Weights reflect what actually breaks a shared household: budget, sleep and
 * cleanliness dominate, drinking and pets are minor. Exported — rather than
 * inlined above — so the "how matching works" screen cannot drift out of step
 * with the number it is explaining.
 */
export const SCORE_WEIGHTS = {
  budget: 3.5,
  city: 2.5,
  moveInDate: 2,
  sleep: 3,
  study: 3,
  cleanliness: 3,
  smoking: 2.5,
  drinking: 2,
  pets: 1.5,
  guests: 2,
} as const;

export type ScoreInput = keyof typeof SCORE_WEIGHTS;

/** Plain-language descriptions of each input, in the order a reader cares. */
export const SCORE_INPUTS: readonly { key: ScoreInput; label: string; detail: string }[] = [
  { key: 'budget', label: 'Budget overlap', detail: 'Whether your peso ranges actually meet' },
  { key: 'sleep', label: 'Sleep schedule', detail: 'Early bird against night owl' },
  { key: 'study', label: 'Study habits', detail: 'Quiet study against studying together' },
  { key: 'cleanliness', label: 'Cleanliness', detail: 'How far apart your 1–5 ratings are' },
  { key: 'guests', label: 'Guests', detail: 'How often people are over' },
  { key: 'smoking', label: 'Smoking', detail: 'Smoker against non-smoker' },
  { key: 'city', label: 'Preferred city', detail: 'Whether you are looking in the same place' },
  { key: 'moveInDate', label: 'Move-in date', detail: 'How close the two dates are' },
  { key: 'drinking', label: 'Drinking', detail: 'Different habits around alcohol' },
  { key: 'pets', label: 'Pets', detail: 'Pets welcome, or not' },
];

/** The largest weight, for scaling a bar chart of the weights. */
export const MAX_SCORE_WEIGHT = Math.max(...Object.values(SCORE_WEIGHTS));

/**
 * Scores one roommate against the signed-in profile.
 */
export function scoreRoommate(profile: Profile, roommate: Roommate): number {
  const mine = profile.lifestyle;

  const weighted: { weight: number; score: number | null }[] = [
    { weight: SCORE_WEIGHTS.budget, score: budgetOverlapScore(
      profile.budgetMin,
      profile.budgetMax,
      roommate.budgetMin,
      roommate.budgetMax,
    ).score },
    { weight: SCORE_WEIGHTS.city, score: cityScore(profile.preferredCity, roommate.preferredCity).score },
    { weight: SCORE_WEIGHTS.moveInDate, score: dateScore(profile.moveInDate, roommate.moveInDate).score },
    { weight: SCORE_WEIGHTS.sleep, score: AXIS_SLEEP.score(mine, roommate.lifestyle) },
    { weight: SCORE_WEIGHTS.study, score: AXIS_STUDY.score(mine, roommate.lifestyle) },
    { weight: SCORE_WEIGHTS.cleanliness, score: AXIS_CLEAN.score(mine, roommate.lifestyle) },
    { weight: SCORE_WEIGHTS.smoking, score: AXIS_SMOKE.score(mine, roommate.lifestyle) },
    { weight: SCORE_WEIGHTS.drinking, score: AXIS_DRINK.score(mine, roommate.lifestyle) },
    { weight: SCORE_WEIGHTS.pets, score: AXIS_PETS.score(mine, roommate.lifestyle) },
    { weight: SCORE_WEIGHTS.guests, score: AXIS_GUESTS.score(mine, roommate.lifestyle) },
  ];

  let total = 0;
  let weight = 0;
  for (const entry of weighted) {
    if (entry.score === null) continue;
    total += entry.score * entry.weight;
    weight += entry.weight;
  }

  if (weight === 0) return 50;
  // Clamped rather than allowed to reach 0 or 100: a person who differs on every
  // axis is still someone you could live with, and "0% compatible" reads as a
  // judgement rather than a mismatch.
  return Math.round(Math.min(99, Math.max(35, (total / weight) * 100)));
}

/**
 * Builds the "why we matched" list shown on the roommate profile.
 *
 * Uses the same axis functions as the score so the reasons and the number can
 * never disagree.
 */
export function matchReasons(profile: Profile, roommate: Roommate): MatchReason[] {
  const mine = profile.lifestyle;
  const reasons: MatchReason[] = [];

  const budget = budgetOverlapScore(
    profile.budgetMin,
    profile.budgetMax,
    roommate.budgetMin,
    roommate.budgetMax,
  );
  reasons.push({ label: 'Budget', detail: budget.detail, kind: kindOf(budget.score) });

  const city = cityScore(profile.preferredCity, roommate.preferredCity);
  reasons.push({ label: 'Location', detail: city.detail, kind: kindOf(city.score) });

  const moveIn = dateScore(profile.moveInDate, roommate.moveInDate);
  reasons.push({ label: 'Move-in date', detail: moveIn.detail, kind: kindOf(moveIn.score) });

  for (const axis of axes) {
    const score = axis.score(mine, roommate.lifestyle);
    if (score === null) continue;
    reasons.push({ label: axis.label, detail: axis.detail(mine, roommate.lifestyle), kind: kindOf(score) });
  }

  // Strongest agreements first, then disagreements, so the top of the list is
  // the most persuasive thing to read.
  const order: Record<MatchReason['kind'], number> = { match: 0, near: 1, mismatch: 2 };
  return reasons.sort((a, b) => order[a.kind] - order[b.kind]);
}