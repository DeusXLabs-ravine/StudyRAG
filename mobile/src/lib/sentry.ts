import Constants from 'expo-constants';
import * as Sentry from '@sentry/react-native';

const isExpoGo = Constants.appOwnership === 'expo';
const sentryEnabled = !isExpoGo;
const replayEnabled = sentryEnabled && !__DEV__;

try {
  Sentry.init({
    dsn: 'https://c28835883a5e47e6d5f8b91e4028c192@o4510682844823552.ingest.de.sentry.io/4511322050723920',
    enabled: sentryEnabled,
    debug: __DEV__,
    sendDefaultPii: true,
    attachStacktrace: true,
    enableLogs: sentryEnabled,
    tracesSampleRate: __DEV__ ? 1.0 : 0.2,
    profilesSampleRate: __DEV__ ? 0.0 : 0.2,
    replaysSessionSampleRate: replayEnabled ? 0.05 : 0.0,
    replaysOnErrorSampleRate: replayEnabled ? 1.0 : 0.0,
    integrations: replayEnabled ? [Sentry.mobileReplayIntegration()] : [],
  });
} catch (e) {
  // Native module missing — app was not rebuilt after adding @sentry/react-native.
  // Safe to swallow: app still runs, monitoring just won't work until rebuild.
  if (__DEV__) console.warn('[Sentry] init failed — rebuild dev client to enable native SDK:', e);
}

export { Sentry };
