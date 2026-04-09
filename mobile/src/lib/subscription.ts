export type SubscriptionTier = 'free' | 'basic' | 'pro' | 'max';

export const SUBSCRIPTION_ORDER: SubscriptionTier[] = ['free', 'basic', 'pro', 'max'];

export const SUBSCRIPTION_LIMITS: Record<
  SubscriptionTier,
  {
    documents: number;
    chats: number;
    teach: boolean;
    games: boolean;
    simulations: boolean;
    podcast: boolean;
  }
> = {
  free: { documents: 2, chats: 50, teach: false, games: false, simulations: false, podcast: false },
  basic: { documents: 10, chats: 200, teach: false, games: false, simulations: false, podcast: false },
  pro: { documents: 50, chats: 1500, teach: true, games: true, simulations: true, podcast: false },
  max: { documents: 200, chats: 5000, teach: true, games: true, simulations: true, podcast: true },
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
