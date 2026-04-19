import { NativeModules, Platform } from 'react-native';
import { api } from '@/lib/api/client';

type Flashcard = { front: string; back: string };
type Definition = { term: string; meaning: string };

type WidgetPayload = {
  tier: 'free' | 'pro';
  flashcard: Flashcard;
  definition: Definition | null;
  generatedAt: string;
};

type NativeWidgetModule = {
  setDailyContent: (payload: WidgetPayload) => Promise<void>;
  reload: () => Promise<void>;
};

/**
 * Lazily resolves the native bridge if the custom dev client included it.
 * In plain Expo Go this returns null and `syncWidgets()` silently no-ops so
 * we don't crash when widgets aren't compiled in yet.
 */
function resolveNative(): NativeWidgetModule | null {
  const candidate =
    (NativeModules as Record<string, unknown>).StudyRAGWidgets ||
    (NativeModules as Record<string, unknown>).RNStudyRAGWidgets ||
    null;
  return (candidate as NativeWidgetModule) ?? null;
}

/**
 * Fetch today's widget content and push it into the native shared store
 * (UserDefaults suite on iOS, DataStore on Android) so the widget extension
 * can render offline.
 *
 * Call after login and on AppState -> 'active'. Errors are swallowed; a
 * widget failure must never crash the foreground app.
 */
export async function syncWidgets(): Promise<boolean> {
  const native = resolveNative();
  if (!native) return false;
  try {
    const { data } = await api.get<WidgetPayload>('/widgets/daily');
    await native.setDailyContent(data);
    await native.reload();
    return true;
  } catch (err) {
    if (__DEV__) console.warn('[widgets] sync failed:', err);
    return false;
  }
}

export function isWidgetBridgeAvailable(): boolean {
  return resolveNative() !== null;
}

export const WIDGETS_PLATFORM_SUPPORTED = Platform.OS === 'ios' || Platform.OS === 'android';
