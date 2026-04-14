import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Check, Star, Sparkles, Crown, Zap, CreditCard, Landmark, Send, Loader2 } from 'lucide-react';
import { formatTierPrice, isNigerianUser } from '../../utils/currency';
import useAuthStore from '../../store/authStore';
import api from '../../services/api';

const TIERS = [
  {
    id: 'free',
    name: 'Free',
    ngn: 0,
    usd: 0,
    icon: Zap,
    desc: 'Get started for free',
    features: ['2 documents', '50 chats/mo', 'Learn mode'],
    cta: 'Current Plan',
  },
  {
    id: 'basic',
    name: 'Basic',
    ngn: 5000,
    usd: 10,
    icon: Sparkles,
    desc: 'For regular coursework',
    features: ['10 documents', '200 chats/mo', 'Chat history', 'Standard support'],
    cta: 'Choose Basic',
  },
  {
    id: 'pro',
    name: 'Pro',
    ngn: 20000,
    usd: 25,
    icon: Star,
    popular: true,
    desc: 'Unlock advanced tools',
    features: ['50 documents', '1,500 chats/mo', 'Teach Mode', 'Games & diagrams', 'Study podcasts', 'Priority AI'],
    cta: 'Go Pro',
  },
  {
    id: 'max',
    name: 'Max',
    ngn: 50000,
    usd: 50,
    icon: Crown,
    desc: 'For power users',
    features: ['200 documents', 'Unlimited chats', 'Everything in Pro', 'Pro AI models', 'Early access', 'Priority support'],
    cta: 'Get Max',
  },
];

/* ── Apple Pay logo (inline SVG) ── */
const ApplePayIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M7.08 4.63c-.44.52-1.15.93-1.85.87-.09-.7.26-1.45.66-1.91.44-.52 1.21-.9 1.84-.93.07.73-.21 1.45-.65 1.97zm.65 1.01c-1.02-.06-1.9.58-2.38.58s-1.24-.55-2.05-.53c-1.05.02-2.03.61-2.57 1.56-1.1 1.9-.28 4.72.78 6.27.52.76 1.15 1.6 1.97 1.57.78-.03 1.09-.51 2.04-.51s1.22.51 2.05.49c.85-.01 1.39-.76 1.91-1.52.6-.87.84-1.71.86-1.75-.02-.01-1.65-.63-1.66-2.51-.02-1.57 1.28-2.32 1.34-2.36-.73-1.08-1.87-1.2-2.28-1.23v-.06z"/>
  </svg>
);

const getPaymentChannels = () => {
  const isNG = isNigerianUser();
  const channels = [
    { id: 'card', name: 'Debit / Credit Card', icon: CreditCard, desc: 'Visa, Mastercard' },
    { id: 'apple_pay', name: 'Apple Pay', icon: ApplePayIcon, desc: 'Pay with Apple Pay' },
  ];
  if (isNG) {
    channels.push(
      { id: 'bank_transfer', name: 'Bank Transfer', icon: Send, desc: 'Direct bank transfer' },
      { id: 'bank', name: 'Bank / USSD', icon: Landmark, desc: 'Use your bank or USSD code' },
    );
  }
  return channels;
};

const TIER_ORDER = ['free', 'basic', 'pro', 'max'];

/**
 * Open Paystack Inline Popup using @paystack/inline-js.
 * The popup renders INSIDE the current page — no redirect.
 */
async function openPaystackInline({ accessCode, onSuccess, onClose: onPopupClose }) {
  const { default: PaystackPop } = await import('@paystack/inline-js');
  const popup = new PaystackPop();
  popup.resumeTransaction(accessCode, {
    onSuccess(transaction) {
      console.log('[Paystack] Payment successful:', transaction.reference);
      onSuccess?.(transaction);
    },
    onCancel() {
      console.log('[Paystack] User cancelled payment');
      onPopupClose?.();
    },
    onError(error) {
      console.error('[Paystack] Payment error:', error);
      onPopupClose?.(error);
    },
  });
}

export default function PricingModal({ isOpen, onClose, highlightTier, currentTier = 'free' }) {
  const navigate = useNavigate();
  const { user, fetchProfile } = useAuthStore();
  const [selectedTier, setSelectedTier] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [paymentSuccess, setPaymentSuccess] = useState(null); // tier name after success

  if (!isOpen) return null;

  const currentIdx = TIER_ORDER.indexOf(currentTier);

  const handleSelectTier = (tier) => {
    if (!user) {
      onClose();
      navigate('/login?redirect=/pricing');
      return;
    }
    if (tier.id === 'free' || TIER_ORDER.indexOf(tier.id) <= currentIdx) return;
    setSelectedTier(tier);
    setErrorMsg('');
  };

  const handleCheckout = async (channelId) => {
    setIsLoading(true);
    setErrorMsg('');
    try {
      // 1. Initialize transaction on backend — get access_code
      const { data } = await api.post('/payment/checkout', {
        tier: selectedTier.id,
        channel: channelId,
      });

      if (!data.accessCode && !data.checkoutUrl) {
        throw new Error('No payment session received');
      }

      // 2. If backend returned access_code, use Paystack Inline Popup (embedded)
      if (data.accessCode) {
        setIsLoading(false); // hide our loader — Paystack shows its own
        await openPaystackInline({
          accessCode: data.accessCode,
          onSuccess: async (transaction) => {
            // Verify on backend & refresh profile
            try {
              await api.get(`/payment/verify/${encodeURIComponent(data.paymentReference)}`);
            } catch { /* webhook handles it anyway */ }
            await fetchProfile();
            setPaymentSuccess(selectedTier.name);
          },
          onClose: (error) => {
            if (error) {
              setErrorMsg('Payment did not complete. Please try again.');
            }
            // If just cancelled, do nothing — user stays on modal
          },
        });
      } else {
        // Fallback: redirect to hosted checkout (Monnify fallback)
        window.location.href = data.checkoutUrl;
      }
    } catch (err) {
      const msg = err.response?.data?.error || err.message || 'Checkout failed. Try again.';
      setErrorMsg(msg);
      setIsLoading(false);
    }
  };

  // ── Success state ──
  if (paymentSuccess) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6" onClick={onClose}>
        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
        <div
          className="relative bg-white rounded-3xl shadow-2xl w-full max-w-sm p-8 text-center"
          onClick={e => e.stopPropagation()}
        >
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-100 mb-5">
            <Check className="h-8 w-8 text-emerald-600" />
          </div>
          <h2 className="text-2xl font-black text-gray-900 mb-2">You're on {paymentSuccess}!</h2>
          <p className="text-sm text-gray-500 mb-6">Your upgrade is active. Start exploring your new features.</p>
          <button
            onClick={() => { setPaymentSuccess(null); onClose(); }}
            className="w-full bg-primary text-white font-bold py-3 rounded-2xl hover:bg-primary/90 transition-colors cursor-pointer"
          >
            Let's Go
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

      <div
        className="relative bg-white rounded-3xl shadow-2xl w-full max-w-3xl max-h-[92vh] overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 sm:px-8 py-5 border-b border-gray-100 flex-shrink-0">
          <div>
            <h2 className="text-xl font-black text-gray-900">Upgrade Your Plan</h2>
            <p className="text-sm text-gray-500 font-medium mt-0.5">Unlock more features and higher limits</p>
          </div>
          <button
            onClick={onClose}
            className="h-9 w-9 flex items-center justify-center rounded-full bg-gray-50 text-gray-400 hover:text-gray-900 hover:bg-gray-100 transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Tier cards */}
        <div className="flex-1 overflow-y-auto px-6 sm:px-8 py-6">
          {selectedTier ? (
            /* Payment method selection */
            <div className="max-w-sm mx-auto">
              <button
                onClick={() => setSelectedTier(null)}
                className="text-sm font-bold text-primary mb-4 hover:underline cursor-pointer"
              >
                &larr; Back to plans
              </button>

              <div className="text-center mb-6">
                <div className="inline-flex items-center gap-2 bg-primary/10 text-primary font-black text-sm px-4 py-2 rounded-full mb-3">
                  <Star className="h-4 w-4" />
                  {selectedTier.name}
                </div>
                <p className="text-2xl font-black text-gray-900">
                  {formatTierPrice(selectedTier.ngn, selectedTier.usd).primary}
                  <span className="text-sm text-gray-400 font-bold ml-1">/mo</span>
                </p>
                <p className="text-xs text-gray-400 font-medium mt-1">
                  {formatTierPrice(selectedTier.ngn, selectedTier.usd).secondary}
                </p>
              </div>

              {errorMsg && (
                <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-100 text-red-600 text-sm font-medium">
                  {errorMsg}
                </div>
              )}

              <div className="space-y-2.5">
                {getPaymentChannels().map((ch) => {
                  const Icon = ch.icon;
                  return (
                    <button
                      key={ch.id}
                      onClick={() => handleCheckout(ch.id)}
                      disabled={isLoading}
                      className="w-full group flex items-center gap-3 p-4 rounded-2xl bg-gray-50 border border-gray-100 hover:border-primary/40 hover:bg-primary/5 transition-all active:scale-[0.98] disabled:opacity-50 text-left cursor-pointer"
                    >
                      <div className="h-10 w-10 rounded-xl bg-white flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                        <Icon className="h-5 w-5 text-gray-400 group-hover:text-primary transition-colors" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="font-bold text-gray-900 text-sm block">{ch.name}</span>
                        {ch.desc && <span className="text-[11px] text-gray-400 font-medium">{ch.desc}</span>}
                      </div>
                    </button>
                  );
                })}
              </div>

              <p className="text-center text-[10px] font-semibold text-gray-300 mt-5 uppercase tracking-wider">
                Secured by Paystack
              </p>
            </div>
          ) : (
            /* Tier grid */
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {TIERS.map((tier) => {
                const price = formatTierPrice(tier.ngn, tier.usd);
                const Icon = tier.icon;
                const isCurrent = tier.id === currentTier;
                const isDowngrade = TIER_ORDER.indexOf(tier.id) <= currentIdx && tier.id !== 'free';
                const isHighlighted = tier.id === highlightTier;

                return (
                  <div
                    key={tier.id}
                    className={`relative rounded-2xl p-4 sm:p-5 flex flex-col transition-all cursor-pointer
                      ${tier.popular || isHighlighted
                        ? 'bg-primary/5 border-2 border-primary ring-2 ring-primary/10'
                        : 'bg-gray-50 border border-gray-100 hover:border-gray-200'}
                      ${isCurrent ? 'opacity-60 cursor-default' : 'hover:shadow-lg'}
                    `}
                    onClick={() => !isCurrent && handleSelectTier(tier)}
                  >
                    {tier.popular && (
                      <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-primary text-white text-[8px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full whitespace-nowrap">
                        Popular
                      </div>
                    )}

                    <div className="flex items-center gap-2 mb-3">
                      <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${tier.popular ? 'bg-primary/10' : 'bg-gray-100'}`}>
                        <Icon className={`h-4 w-4 ${tier.popular ? 'text-primary' : 'text-gray-400'}`} />
                      </div>
                      <span className="font-black text-gray-900 text-sm">{tier.name}</span>
                    </div>

                    <div className="mb-3">
                      <span className="text-2xl font-black text-gray-900">{price.primary}</span>
                      {tier.id !== 'free' && <span className="text-[10px] text-gray-400 font-bold ml-0.5">/mo</span>}
                      {price.secondary && (
                        <p className="text-[10px] text-gray-400 font-medium mt-0.5">{price.secondary}</p>
                      )}
                    </div>

                    <p className="text-xs text-gray-500 font-medium mb-3">{tier.desc}</p>

                    <div className="space-y-1.5 flex-1 mb-4">
                      {tier.features.map((f) => (
                        <div key={f} className="flex items-start gap-1.5">
                          <Check className="h-3.5 w-3.5 text-emerald-500 flex-shrink-0 mt-0.5" />
                          <span className="text-xs text-gray-600 font-medium">{f}</span>
                        </div>
                      ))}
                    </div>

                    <button
                      disabled={isCurrent || isDowngrade}
                      className={`w-full py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all
                        ${isCurrent
                          ? 'bg-gray-100 text-gray-400 cursor-default'
                          : tier.popular || isHighlighted
                            ? 'bg-primary text-white shadow-md shadow-primary/20 hover:bg-primary/90 active:scale-95'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200 active:scale-95'}
                      `}
                    >
                      {isCurrent ? 'Current' : tier.cta}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Loading overlay */}
        {isLoading && (
          <div className="absolute inset-0 bg-white/80 backdrop-blur-[2px] z-20 flex flex-col items-center justify-center rounded-3xl">
            <Loader2 className="h-8 w-8 text-primary animate-spin mb-3" />
            <p className="text-sm font-bold text-gray-900 animate-pulse">Initializing Checkout...</p>
          </div>
        )}
      </div>
    </div>
  );
}
