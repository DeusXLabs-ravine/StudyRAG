import { useWindowDimensions } from 'react-native';

export type Breakpoint = 'phone' | 'tablet' | 'large';

export type BreakpointInfo = {
  bp: Breakpoint;
  width: number;
  height: number;
  isLandscape: boolean;
  /** bp !== 'phone' */
  isTablet: boolean;
  /** bp === 'large' */
  isLarge: boolean;
  /** width < 360 — for fold cover screens (e.g. Z Flip) */
  isCompact: boolean;
};

/**
 * Adaptive breakpoints for phone / tablet / large-tablet layouts.
 *
 * Thresholds:
 *   - phone:  width < 600
 *   - tablet: 600 <= width < 900
 *   - large:  width >= 900
 *
 * Uses `useWindowDimensions` so layouts react to orientation changes and
 * fold/unfold transitions in real time (Samsung Z Fold, surface-duo style
 * devices re-render on the width change).
 */
export function useBreakpoint(): BreakpointInfo {
  const { width, height } = useWindowDimensions();

  let bp: Breakpoint = 'phone';
  if (width >= 900) bp = 'large';
  else if (width >= 600) bp = 'tablet';

  return {
    bp,
    width,
    height,
    isLandscape: width > height,
    isTablet: bp !== 'phone',
    isLarge: bp === 'large',
    isCompact: width < 360,
  };
}
