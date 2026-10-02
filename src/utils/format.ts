/** Formatting helpers for Philippine pesos, dates and Philippine place names. */

import { format, formatDistanceToNowStrict, isToday, isTomorrow, parseISO } from 'date-fns';

const pesoFormatter = new Intl.NumberFormat('en-PH', {
  style: 'currency',
  currency: 'PHP',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const pesoPreciseFormatter = new Intl.NumberFormat('en-PH', {
  style: 'currency',
  currency: 'PHP',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** ₱4,500 */
export function formatPeso(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || Number.isNaN(amount)) return '—';
  return Number.isInteger(amount) ? pesoFormatter.format(amount) : pesoPreciseFormatter.format(amount);
}

/** ₱4,500 /mo */
export function formatMonthlyRent(amount: number | null | undefined): string {
  return `${formatPeso(amount)}/mo`;
}

/** 4500 -> "4,500" for text inputs */
export function parsePesoInput(value: string): number | null {
  const digits = value.replace(/[^\d]/g, '');
  if (digits.length === 0) return null;
  const parsed = Number.parseInt(digits, 10);
  return Number.isNaN(parsed) ? null : parsed;
}

export function formatNumber(value: number | null | undefined): string {
  if (value === null || value === undefined) return '—';
  return new Intl.NumberFormat('en-PH').format(value);
}

export function formatCompactNumber(value: number | null | undefined): string {
  if (value === null || value === undefined) return '0';
  if (value < 1000) return String(value);
  if (value < 1_000_000) return `${(value / 1000).toFixed(value % 1000 === 0 ? 0 : 1)}k`;
  return `${(value / 1_000_000).toFixed(1)}M`;
}

/** "1.4 km" / "320 m" */
export function formatDistance(km: number | null | undefined): string {
  if (km === null || km === undefined || Number.isNaN(km)) return '—';
  if (km < 1) return `${Math.round(km * 1000)} m`;
  if (km < 10) return `${km.toFixed(1)} km`;
  return `${Math.round(km)} km`;
}

function safeParse(value: string | null | undefined): Date | null {
  if (!value) return null;
  try {
    return parseISO(value);
  } catch {
    return null;
  }
}

/** "12 Mar 2026" */
export function formatDate(value: string | Date | null | undefined): string {
  const date = value instanceof Date ? value : safeParse(value);
  if (!date) return '—';
  return format(date, 'd MMM yyyy');
}

/** "12 Mar 2026, 3:30 PM" */
export function formatDateTime(value: string | Date | null | undefined): string {
  const date = value instanceof Date ? value : safeParse(value);
  if (!date) return '—';
  return format(date, "d MMM yyyy, h:mm a");
}

export function formatTime(value: string | Date | null | undefined): string {
  if (!value) return '—';
  if (value instanceof Date) return format(value, 'h:mm a');

  const parsed = safeParse(value);
  if (parsed) return format(parsed, 'h:mm a');

  // Bare "HH:mm:ss" from Postgres.
  const match = /^(\d{2}):(\d{2})/.exec(value);
  if (!match) return value;
  const [, rawHour = '0', minute = '00'] = match;
  const hour = Number.parseInt(rawHour, 10);
  const suffix = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 === 0 ? 12 : hour % 12;
  return `${displayHour}:${minute} ${suffix}`;
}

/** "Tomorrow, 3:30 PM" style relative booking label. */
export function formatRelativeDate(value: string | Date | null | undefined): string {
  const date = value instanceof Date ? value : safeParse(value);
  if (!date) return '—';
  if (isToday(date)) return `Today, ${format(date, 'h:mm a')}`;
  if (isTomorrow(date)) return `Tomorrow, ${format(date, 'h:mm a')}`;
  return format(date, 'EEE, d MMM yyyy');
}

/** "3 days ago" */
export function formatTimeAgo(value: string | Date | null | undefined): string {
  const date = value instanceof Date ? value : safeParse(value);
  if (!date) return '—';
  return `${formatDistanceToNowStrict(date, { addSuffix: true })}`;
}

/** Combines a Postgres `date` and `time` into a single display value. */
export function formatAppointment(date: string | null, time: string | null): string {
  if (!date) return '—';
  return `${formatDate(date)}, ${formatTime(time)}`;
}

/** Title-cases a slug, e.g. "boarding_house" -> "Boarding house". */
export function humaniseToken(token: string): string {
  const spaced = token.replace(/_/g, ' ');
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

export function pluralise(count: number, singular: string, plural?: string): string {
  return count === 1 ? singular : (plural ?? `${singular}s`);
}

/** Masks a phone number for display in list rows: 0917 *** 1234 -> 0917 ••• ••34 */
export function maskPhone(value: string | null | undefined): string {
  if (!value) return '—';
  const digits = value.replace(/\D/g, '');
  if (digits.length < 4) return value;
  return `${value.slice(0, 6)} ••• ${value.slice(-2)}`;
}

export function initialsOf(name: string | null | undefined): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/).slice(0, 2);
  const letters = parts.map((part) => part.charAt(0).toUpperCase()).join('');
  return letters.length > 0 ? letters : '?';
}

export function pluralUnitSummary(total: number, occupied: number): string {
  const available = Math.max(total - occupied, 0);
  if (available === 0) return 'Fully occupied';
  return `${available} of ${total} unit${total === 1 ? '' : 's'} available`;
}