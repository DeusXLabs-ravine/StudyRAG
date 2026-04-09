import { API_BASE } from '../services/api';

/**
 * Measure round-trip latency to the backend API.
 * Sends `samples` sequential pings and returns { min, avg, max, samples } in ms.
 *
 * Usage (browser console or component):
 *   import { measureApiLatency } from '../utils/speedTest';
 *   const result = await measureApiLatency();
 *   console.log(result); // { min: 42, avg: 56, max: 78, samples: [...] }
 */
export async function measureApiLatency(count = 5) {
  const pingUrl = `${API_BASE}/ping`;
  const samples = [];

  for (let i = 0; i < count; i++) {
    const t0 = performance.now();
    try {
      await fetch(pingUrl, { cache: 'no-store' });
    } catch {
      // network error counts as very high latency
      samples.push(9999);
      continue;
    }
    samples.push(Math.round(performance.now() - t0));
    // Short gap between pings
    if (i < count - 1) await new Promise(r => setTimeout(r, 200));
  }

  const valid = samples.filter(s => s < 9999);
  return {
    min:     valid.length ? Math.min(...valid) : null,
    avg:     valid.length ? Math.round(valid.reduce((a, b) => a + b, 0) / valid.length) : null,
    max:     valid.length ? Math.max(...valid) : null,
    samples,
    failed:  samples.length - valid.length,
    rating:  rateLatency(valid.length ? Math.round(valid.reduce((a, b) => a + b, 0) / valid.length) : 9999),
  };
}

function rateLatency(avgMs) {
  if (avgMs < 80)  return 'excellent';
  if (avgMs < 200) return 'good';
  if (avgMs < 500) return 'fair';
  return 'poor';
}
