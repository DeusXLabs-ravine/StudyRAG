export type SubscriptionTier = 'free' | 'basic' | 'pro' | 'max';
export type MobileProfileAccessShape = {
  subscription_tier?: SubscriptionTier | null;
  billing_tier?: SubscriptionTier | null;
  isAdminGranted?: boolean | null;
  isUnlimited?: boolean | null;
  planLabel?: string | null;
  document_count?: number | null;
  feature_access?: {
    canTeach?: boolean;
    canGame?: boolean;
    canUseSimulations?: boolean;
    canPodcast?: boolean;
    canUseLive?: boolean;
    canUseTts?: boolean;
    canUseProModels?: boolean;
  } | null;
};

export const SUBSCRIPTION_ORDER: SubscriptionTier[] = ['free', 'basic', 'pro', 'max'];

export const SUBSCRIPTION_LIMITS: Record<
  SubscriptionTier,
  {
    documents: number;
    chats: number;
    teach: boolean | number;
    games: boolean;
    simulations: boolean;
    podcast: boolean | number;
  }
> = {
  free:  { documents: 3,   chats: 75,   teach: false, games: false, simulations: false, podcast: false },
  basic: { documents: 10,  chats: 200,  teach: 3,     games: false, simulations: false, podcast: 2    },
  pro:   { documents: 50,  chats: 1500, teach: true,  games: true,  simulations: true,  podcast: true  },
  max:   { documents: 200, chats: 5000, teach: true,  games: true,  simulations: true,  podcast: true  },
};

export function normalizeTier(tier?: string | null): SubscriptionTier {
  if (tier === 'basic' || tier === 'pro' || tier === 'max') {
    return tier;
  }
  return 'free';
}

export function isTierAtLeast(currentTier: SubscriptionTier, requiredTier: SubscriptionTier) {
  return SUBSCRIPTION_ORDER.indexOf(currentTier) >= SUBSCRIPTION_ORDER.indexOf(requiredTier);
}

const ADMIN_UNLIMITED_LIMITS = {
  documents: Number.MAX_SAFE_INTEGER,
  chats: Number.MAX_SAFE_INTEGER,
  teach: true,
  games: true,
  simulations: true,
  podcast: true,
} as const;

export function resolveSubscriptionAccess(profile?: MobileProfileAccessShape | null) {
  const tier = normalizeTier(profile?.subscription_tier);
  const billingTier = normalizeTier(profile?.billing_tier);
  const isAdminGranted = Boolean(profile?.isAdminGranted || profile?.isUnlimited);
  const featureAccess = profile?.feature_access || {};
  const limits = isAdminGranted ? ADMIN_UNLIMITED_LIMITS : SUBSCRIPTION_LIMITS[tier];
  const docCount = profile?.document_count ?? 0;

  return {
    tier,
    billingTier,
    isAdminGranted,
    isUnlimited: isAdminGranted,
    planLabel: profile?.planLabel || (isAdminGranted ? 'Admin Unlimited' : tier.toUpperCase()),
    canTeach: featureAccess.canTeach ?? (limits.teach === true || (typeof limits.teach === 'number' && limits.teach > 0)),
    canGame: featureAccess.canGame ?? limits.games,
    canUseSimulations: featureAccess.canUseSimulations ?? limits.simulations,
    canPodcast: featureAccess.canPodcast ?? (limits.podcast === true || (typeof limits.podcast === 'number' && limits.podcast > 0)),
    canUseLive: featureAccess.canUseLive ?? (limits.teach && tier !== 'free'),
    canUseTts: featureAccess.canUseTts ?? false,
    canUseProModels: featureAccess.canUseProModels ?? (tier === 'pro' || tier === 'max'),
    docCount,
    docLimit: isAdminGranted ? Number.MAX_SAFE_INTEGER : limits.documents,
    docLimitLabel: isAdminGranted ? 'Unlimited' : String(limits.documents),
    isAtDocLimit: !isAdminGranted && docCount >= limits.documents,
  };
}
