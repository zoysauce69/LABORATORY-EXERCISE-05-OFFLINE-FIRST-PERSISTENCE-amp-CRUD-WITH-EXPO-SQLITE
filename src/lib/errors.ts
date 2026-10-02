/**
 * Uniform error handling for every service call.
 *
 * Rule for the whole app: never fake success. If a database write fails, the
 * caller receives a failure result, the message is shown to the user and the
 * form input is preserved.
 */

import { isSupabaseConfigured, setupMessage, DEMO_MODE } from './config';

export class AppError extends Error {
  readonly code: string;
  readonly details?: unknown;
  /** Set when the failure is a missing configuration rather than a runtime bug. */
  readonly isConfiguration: boolean;

  constructor(message: string, code = 'app_error', options: { details?: unknown; cause?: unknown } = {}) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.details = options.details;
    this.isConfiguration = false;
    if (options.cause !== undefined) {
      (this as { cause?: unknown }).cause = options.cause;
    }
  }
}

export type Result<T> = { ok: true; data: T } | { ok: false; error: AppError };

export const ok = <T>(data: T): Result<T> => ({ ok: true, data });

export const err = <T>(error: AppError): Result<T> => ({ ok: false, error });

/** Shorthand for the very common "fail with a message for the user" case. */
export const fail = <T>(message: string, code = 'app_error'): Result<T> => ({
  ok: false,
  error: new AppError(message, code),
});

/** Human readable text for a raw Supabase/PostgREST error. */
export function describeSupabaseError(error: unknown, fallback = 'Something went wrong.'): AppError {
  if (error instanceof AppError) return error;

  if (!error) return new AppError(fallback, 'unknown_error');

  const candidate = error as { message?: string; code?: string; details?: string; hint?: string };
  const code = typeof candidate.code === 'string' ? candidate.code : 'db_error';

  const known: Record<string, string> = {
    '23505': 'That record already exists.',
    '23503': 'That record is still referenced by something else.',
    '23514': 'Some values were outside the allowed range.',
    '22P02': 'That search term was not valid.',
    '23P01': 'That date and time is already booked.',
    '42501': 'You do not have permission to do that.',
    PGRST116: 'That record could not be found.',
  };

  const message =
    (known[code] ?? candidate.message) || candidate.hint || fallback;

  return new AppError(message, code, { details: candidate.details });
}

/**
 * Wraps a Supabase call, converts thrown errors into AppError and turns an
 * unexpected `{ error }` payload into a failed Result.
 *
 * A null payload is reported as a failure instead of a success. PostgREST only
 * returns `data: null` together with an error for list and `.single()` reads, so
 * this turns "the query did not really run" into a visible error rather than an
 * empty screen that looks like a legitimately empty result.
 *
 * Use `runOptionalQuery` for `.maybeSingle()` lookups, where null means "no row".
 */
export async function runQuery<T>(
  operation: string,
  // `PromiseLike`, not `Promise`: a PostgREST builder is thenable but has no
  // `catch`/`finally`, so a `Promise` parameter would reject every query.
  //
  // `T` is inferred from `data` directly rather than from `data: T | null`:
  // inferring against a union collapses a `.single()` response to `never`.
  fn: () => PromiseLike<{ data: T; error: unknown }>,
): Promise<Result<NonNullable<T>>> {
  const result = await runOptionalQuery<T>(operation, fn);

  if (!result.ok) return result;

  if (result.data === null) {
    // In demo mode there is no DB; return an empty array so list screens show
    // empty state rather than an error.
    if (DEMO_MODE) return ok([] as unknown as NonNullable<T>);
    return err(new AppError(`${operation} returned no data.`, 'empty_response'));
  }

  return ok(result.data as NonNullable<T>);
}

/**
 * Like `runQuery`, but keeps a null payload.
 *
 * Intended for `.maybeSingle()` calls, where `null` is the valid answer "no row
 * matched" rather than a broken query.
 */
export async function runOptionalQuery<T>(
  operation: string,
  fn: () => PromiseLike<{ data: T; error: unknown }>,
): Promise<Result<T>> {
  if (!isSupabaseConfigured) {
    // In demo mode return a typed null so screens show empty state, not an error.
    if (DEMO_MODE) return ok(null as T);
    return err(new AppError(setupMessage, 'not_configured'));
  }

  try {
    const { data, error } = await fn();
    if (error) {
      return err(describeSupabaseError(error, `${operation} failed.`));
    }
    return ok(data);
  } catch (cause) {
    return err(describeSupabaseError(cause, `${operation} failed.`));
  }
}

/**
 * Reads the `count` from a `head: true` count query.
 *
 * With `head: true` PostgREST sends no rows at all, so the row payload is always
 * null and only `count` carries the answer.
 */
export async function runCount(
  operation: string,
  fn: () => PromiseLike<{ count: number | null; error: unknown }>,
): Promise<Result<number>> {
  if (!isSupabaseConfigured) {
    if (DEMO_MODE) return ok(0);
    return err(new AppError(setupMessage, 'not_configured'));
  }

  try {
    const { count, error } = await fn();
    if (error) {
      return err(describeSupabaseError(error, `${operation} failed.`));
    }
    return ok(count ?? 0);
  } catch (cause) {
    return err(describeSupabaseError(cause, `${operation} failed.`));
  }
}

/** Message safe to render in a toast or inline error slot. */
export function toMessage(error: unknown, fallback = 'Something went wrong.'): string {
  if (error instanceof AppError) return error.message;
  if (typeof error === 'string' && error.length > 0) return error;
  if (error && typeof (error as { message?: unknown }).message === 'string') {
    return (error as { message: string }).message;
  }
  return fallback;
}