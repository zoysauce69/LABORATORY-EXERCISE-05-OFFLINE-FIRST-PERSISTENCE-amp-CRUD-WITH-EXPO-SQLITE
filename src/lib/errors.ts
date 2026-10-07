/**
 * Uniform error handling for every service call.
 *
 * Rule for the whole app: never fake success. If a write fails, the caller
 * receives a failure result, the message is shown to the user and the form
 * input is preserved.
 *
 * RoomLink has no backend. Failures therefore only come from three places:
 * AsyncStorage rejecting, a fixture lookup missing an id, or a validation rule
 * in `src/utils/validation`. All of them funnel through `fail(...)` so screens
 * have exactly one error shape to render.
 */

export class AppError extends Error {
  readonly code: string;
  readonly details?: unknown;

  constructor(message: string, code = 'app_error', options: { details?: unknown; cause?: unknown } = {}) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.details = options.details;
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

/**
 * Runs `fn` and converts a thrown value into a failed Result.
 *
 * Use this at the AsyncStorage boundary so a rejected promise never escapes a
 * service and crashes a screen.
 */
export async function attempt<T>(fn: () => Promise<T>, fallback = 'Something went wrong.'): Promise<Result<T>> {
  try {
    return ok(await fn());
  } catch (cause) {
    return fail(describeError(cause, fallback), 'storage_error');
  }
}

/** Human readable text for an arbitrary thrown value. */
export function describeError(error: unknown, fallback = 'Something went wrong.'): string {
  if (error instanceof AppError) return error.message;
  if (typeof error === 'string' && error.length > 0) return error;
  if (error && typeof (error as { message?: unknown }).message === 'string') {
    const message = (error as { message: string }).message;
    if (message.length > 0) return message;
  }
  return fallback;
}

/** Message safe to render in an inline error slot or a toast. */
export function toMessage(error: unknown, fallback = 'Something went wrong.'): string {
  return describeError(error, fallback);
}