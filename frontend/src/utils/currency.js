/**
 * Currency detection for pricing display.
 * Nigerian users see NGN, everyone else sees USD.
 */

const NIGERIA_TIMEZONES = new Set(['Africa/Lagos', 'Africa/Abuja']);

let _cachedIsNigeria = null;
let _fetchPromise = null;

export async function checkIsNigerianUser() {
  if (_cachedIsNigeria !== null) return _cachedIsNigeria;
  
  if (_fetchPromise) return _fetchPromise;

  _fetchPromise = (async () => {
    try {
      const res = await fetch('https://ipapi.co/json/');
      const data = await res.json();
      if (data && data.country_code) {
        _cachedIsNigeria = (data.country_code === 'NG');
        return _cachedIsNigeria;
      }
    } catch (e) {
      console.warn("Failed to fetch IP location, falling back to timezone", e);
    }

    // Fallback: Check timezone
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (NIGERIA_TIMEZONES.has(tz)) {
        _cachedIsNigeria = true;
        return true;
      }
    } catch (e) {}

    _cachedIsNigeria = false;
    return false;
  })();

  return _fetchPromise;
}

export function isNigerianUserSync() {
  if (_cachedIsNigeria !== null) return _cachedIsNigeria;
  
  // Fallback if not fetched yet
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (NIGERIA_TIMEZONES.has(tz)) {
      return true;
    }
  } catch (e) {}
  
  return false;
}

export function isNigerianUser() {
  return isNigerianUserSync();
}

/**
 * Format a price for display.
 * @param {number} ngnAmount - Price in Nigerian Naira
 * @param {number} usdAmount - Price in US Dollars
 * @param {boolean} [isNG] - Optional flag to force Nigerian user status
 * @returns {{ primary: string, secondary: string, currency: string }}
 */
export function formatTierPrice(ngnAmount, usdAmount, isNG) {
  if (isNG === undefined) isNG = isNigerianUserSync();

  if (ngnAmount === 0) {
    return { primary: 'Free', secondary: '', currency: isNG ? 'NGN' : 'USD' };
  }

  if (isNG) {
    const formatted = ngnAmount >= 1000 ? `₦${Math.round(ngnAmount / 1000)}K` : `₦${ngnAmount.toLocaleString()}`;
    return {
      primary: formatted,
      secondary: '', // Removed approximate dollar value for Nigerians
      currency: 'NGN',
    };
  }

  return {
    primary: `$${usdAmount}`,
    secondary: '', // Removed Naira approx for non-Nigerians
    currency: 'USD',
  };
}
