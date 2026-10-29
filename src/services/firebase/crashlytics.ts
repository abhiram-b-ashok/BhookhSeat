import { toError } from '@/utils/errors';
import { crash, getCrashlytics, log, recordError, setUserId } from '@react-native-firebase/crashlytics';


/**
 * The only file that talks to Crashlytics. Reporting must never be the thing that breaks
 * the app, so every call is wrapped and failures are swallowed.
 *
 * Privacy: only the account id is attached to reports, never an email or a name.
 */

/** Records a handled (non-fatal) error. Use for unexpected problems, not for user mistakes. */
export function reportError(error: unknown, context?: string): void {
  if (__DEV__) console.warn(`[error]${context ? ` ${context}:` : ''}`, error);
  try {
    const crashlytics = getCrashlytics();
    if (context) log(crashlytics, context);
    recordError(crashlytics, toError(error));
  } catch {
    // nothing sensible to do if reporting itself fails
  }
}

export function setCrashUser(userId: string | null): void {
  try {
    setUserId(getCrashlytics(), userId ?? '');
  } catch {
    // ignore
  }
}

/** For the developer tools only: a real native crash, to prove reporting works. */
export function forceTestCrash(): void {
  crash(getCrashlytics());
}
