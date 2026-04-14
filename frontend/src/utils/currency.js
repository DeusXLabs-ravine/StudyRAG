/**
 * Currency detection for pricing display.
 * Nigerian users see NGN, everyone else sees USD.
 */

const NIGERIA_TIMEZONES = new Set(['Africa/Lagos']);

let _cachedIsNigeria = null;

export function isNigerianUser() {
  if (_cachedIsNigeria !== null) return _cachedIsNigeria;

  try {
    // 1. Check timezone (most reliable, no network call)
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (NIGERIA_TIMEZONES.has(tz)) {
      _cachedIsNigeria = true;
      return true;
    }

    // 2. Check navigator language
    const lang = navigator.language || navigator.userLanguage || '';
    if (lang.toLowerCase().includes('ng')) {
      _cachedIsNigeria = true;
      return true;
    }
  } catch {
    // Fallback: assume non-Nigerian
  }

  _cachedIsNigeria = false;
  return false;
}

/**
 * Format a price for display.
 * @param {number} ngnAmount - Price in Nigerian Naira
 * @param {number} usdAmount - Price in US Dollars
 * @returns {{ primary: string, secondary: string, currency: string }}
 */
export function formatTierPrice(ngnAmount, usdAmount) {
  const isNG = isNigerianUser();

  if (ngnAmount === 0) {
    return { primary: 'Free', secondary: '', currency: isNG ? 'NGN' : 'USD' };
  }

  if (isNG) {
    const formatted = ngnAmount >= 1000 ? `₦${Math.round(ngnAmount / 1000)}K` : `₦${ngnAmount.toLocaleString()}`;
    return {
      primary: formatted,
      secondary: `~$${usdAmount}`,
      currency: 'NGN',
    };
  }

  return {
    primary: `$${usdAmount}`,
    secondary: `₦${ngnAmount.toLocaleString()}`,
    currency: 'USD',
  };
}
