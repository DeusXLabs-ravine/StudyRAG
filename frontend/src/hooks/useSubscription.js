import useAuthStore from '../store/authStore';

const TIER_ORDER = ['free', 'basic', 'pro', 'max'];

const TIER_LIMITS = {
  free:  { documents: 2,   chats: 50,   teach: false, games: false, simulations: false, podcast: false },
  basic: { documents: 10,  chats: 200,  teach: false, games: false, simulations: false, podcast: false },
  pro:   { documents: 50,  chats: 1500, teach: true,  games: true,  simulations: true,  podcast: false },
  max:   { documents: 200, chats: 5000, teach: true,  games: true,  simulations: true,  podcast: true  },
};

export function useSubscription() {
  const profile = useAuthStore(state => state.profile);
  const tier = profile?.subscription_tier || 'free';
  const limits = TIER_LIMITS[tier] || TIER_LIMITS.free;

  const isAtLeast = (requiredTier) =>
    TIER_ORDER.indexOf(tier) >= TIER_ORDER.indexOf(requiredTier);

  return {
    tier,
    limits,
    isPro: isAtLeast('pro'),
    isMax: isAtLeast('max'),
    canTeach: limits.teach,
    canGame: limits.games,
    canUseSimulations: limits.simulations,
    canPodcast: limits.podcast,
    docLimit: limits.documents,
    docCount: profile?.document_count ?? 0,
    isAtDocLimit: (profile?.document_count ?? 0) >= limits.documents,
    isAtLeast,
  };
}
