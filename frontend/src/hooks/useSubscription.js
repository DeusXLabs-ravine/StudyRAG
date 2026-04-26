import useAuthStore from '../store/authStore';

const TIER_ORDER = ['free', 'basic', 'pro', 'max'];
const ADMIN_UNLIMITED_LIMITS = {
  documents: Number.MAX_SAFE_INTEGER,
  chats: Number.MAX_SAFE_INTEGER,
  teach: true,
  games: true,
  simulations: true,
  podcast: true,
  live: true,
  tts: true,
  diagrams: Number.MAX_SAFE_INTEGER,
  proModels: true,
  buddy: true,
  buddyMinutesSoft: Number.MAX_SAFE_INTEGER,
  buddyMinutesHard: Number.MAX_SAFE_INTEGER,
};

const TIER_LIMITS = {
  free:  { documents: 2,   chats: 50,   teach: false, games: false, simulations: false, podcast: false, live: 0,   tts: 0,   diagrams: 5,   proModels: false, buddy: false, buddyMinutesSoft: 0,   buddyMinutesHard: 0   },
  basic: { documents: 10,  chats: 200,  teach: false, games: false, simulations: false, podcast: false, live: 0,   tts: 0,   diagrams: 20,  proModels: false, buddy: false, buddyMinutesSoft: 0,   buddyMinutesHard: 0   },
  pro:   { documents: 50,  chats: 1500, teach: true,  games: true,  simulations: true,  podcast: true,  live: 20,  tts: 30,  diagrams: 100, proModels: true,  buddy: false, buddyMinutesSoft: 0,   buddyMinutesHard: 0   },
  max:   { documents: 200, chats: 5000, teach: true,  games: true,  simulations: true,  podcast: true,  live: 60,  tts: 100, diagrams: 500, proModels: true,  buddy: true,  buddyMinutesSoft: 120, buddyMinutesHard: 300 },
};

export { TIER_LIMITS, TIER_ORDER };

export function useSubscription() {
  const profile = useAuthStore(state => state.profile);
  const tier = profile?.subscription_tier || 'free';
  const isAdminGranted = Boolean(profile?.isAdminGranted || profile?.isUnlimited);
  const featureAccess = profile?.feature_access || {};
  const limits = isAdminGranted
    ? ADMIN_UNLIMITED_LIMITS
    : (TIER_LIMITS[tier] || TIER_LIMITS.free);

  const isAtLeast = (requiredTier) =>
    isAdminGranted || TIER_ORDER.indexOf(tier) >= TIER_ORDER.indexOf(requiredTier);

  const docCount = profile?.document_count ?? 0;

  return {
    tier,
    billingTier: profile?.billing_tier || tier,
    planLabel: profile?.planLabel || (isAdminGranted ? 'Admin Unlimited' : tier.toUpperCase()),
    isAdminGranted,
    isUnlimited: isAdminGranted,
    limits,
    isPro: isAtLeast('pro'),
    isMax: isAtLeast('max'),
    canTeach: featureAccess.canTeach ?? limits.teach,
    canGame: featureAccess.canGame ?? limits.games,
    canUseSimulations: featureAccess.canUseSimulations ?? limits.simulations,
    canPodcast: featureAccess.canPodcast ?? limits.podcast,
    canUseLive: featureAccess.canUseLive ?? (limits.live === true || limits.live > 0),
    canUseTts: featureAccess.canUseTts ?? (limits.tts === true || limits.tts > 0),
    canUseProModels: featureAccess.canUseProModels ?? limits.proModels,
    canUseBuddy: featureAccess.canUseBuddy ?? Boolean(limits.buddy),
    buddyMinutesSoft: limits.buddyMinutesSoft ?? 0,
    buddyMinutesHard: limits.buddyMinutesHard ?? 0,
    docLimit: isAdminGranted ? Number.MAX_SAFE_INTEGER : limits.documents,
    docLimitLabel: isAdminGranted ? 'Unlimited' : String(limits.documents),
    docCount,
    isAtDocLimit: !isAdminGranted && docCount >= limits.documents,
    isAtLeast,
  };
}
