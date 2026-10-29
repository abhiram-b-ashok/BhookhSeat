export type KeyChoice =
  | { ok: true; key: string; mode: 'test' | 'live' }
  | { ok: false; reason: string };

type Args = {
  isDev: boolean;
  platform: string;
  testKey?: string;
  androidKey?: string;
};

/**
 * Picks which RevenueCat key to use. RevenueCat's Test Store keys start with "test_" and
 * must NEVER be used in a release build (the SDK crashes the app). Real Android keys start
 * with "goog_". This refuses a test key outside development instead of letting it crash.
 */
export function resolveRevenueCatKey({ isDev, platform, testKey, androidKey }: Args): KeyChoice {
  if (platform !== 'android') {
    return { ok: false, reason: 'In-app purchases are only set up for Android.' };
  }

  const test = testKey?.trim();
  const live = androidKey?.trim();

  if (isDev && test?.startsWith('test_')) return { ok: true, key: test, mode: 'test' };

  if (live?.startsWith('goog_')) return { ok: true, key: live, mode: 'live' };

  if (live?.startsWith('test_')) {
    return {
      ok: false,
      reason: 'A Test Store key was set as the Android key. Test keys must not be used in a release build.',
    };
  }

  return {
    ok: false,
    reason: isDev
      ? 'No RevenueCat key found. Add EXPO_PUBLIC_REVENUECAT_TEST_KEY to .env.local.'
      : 'Subscriptions are not available in this build.',
  };
}
