import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type PropsWithChildren } from 'react';

const STORAGE_KEY = 'studyrag.tutorials.seen';

type TutorialCtx = {
  hasSeen: (id: string) => boolean;
  markSeen: (id: string) => void;
  resetAll: () => Promise<void>;
  isLoaded: boolean;
};

const Ctx = createContext<TutorialCtx | null>(null);

export function TutorialProvider({ children }: PropsWithChildren) {
  const [seen, setSeen] = useState<Set<string>>(() => new Set());
  const [isLoaded, setIsLoaded] = useState(false);
  const pendingWrite = useRef<Promise<unknown> | null>(null);

  useEffect(() => {
    let alive = true;
    AsyncStorage.getItem(STORAGE_KEY)
      .then(raw => {
        if (!alive) return;
        if (raw) {
          try {
            const arr: string[] = JSON.parse(raw);
            if (Array.isArray(arr)) setSeen(new Set(arr));
          } catch {
            /* corrupt storage — start clean */
          }
        }
        setIsLoaded(true);
      })
      .catch(() => {
        if (alive) setIsLoaded(true);
      });
    return () => {
      alive = false;
    };
  }, []);

  const persist = useCallback((next: Set<string>) => {
    const payload = JSON.stringify(Array.from(next));
    pendingWrite.current = AsyncStorage.setItem(STORAGE_KEY, payload).catch(() => undefined);
  }, []);

  const markSeen = useCallback(
    (id: string) => {
      setSeen(prev => {
        if (prev.has(id)) return prev;
        const next = new Set(prev);
        next.add(id);
        persist(next);
        return next;
      });
    },
    [persist],
  );

  const hasSeen = useCallback((id: string) => seen.has(id), [seen]);

  const resetAll = useCallback(async () => {
    setSeen(new Set());
    try {
      await AsyncStorage.removeItem(STORAGE_KEY);
      // Also clear any tour progress we stashed per-tour
      const keys = await AsyncStorage.getAllKeys();
      const tourKeys = keys.filter(k => k.startsWith('studyrag.tutorials.tour.'));
      if (tourKeys.length) await AsyncStorage.multiRemove(tourKeys);
    } catch {
      /* best effort */
    }
  }, []);

  const value = useMemo<TutorialCtx>(
    () => ({ hasSeen, markSeen, resetAll, isLoaded }),
    [hasSeen, markSeen, resetAll, isLoaded],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useTutorial(): TutorialCtx {
  const ctx = useContext(Ctx);
  if (!ctx) {
    // Graceful fallback if provider isn't mounted — act as if everything is seen
    return {
      hasSeen: () => true,
      markSeen: () => undefined,
      resetAll: async () => undefined,
      isLoaded: true,
    };
  }
  return ctx;
}
