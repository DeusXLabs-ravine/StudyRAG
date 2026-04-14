import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import PublicNavbar from '../components/layout/PublicNavbar';
import Footer from '../components/layout/Footer';
import { Check, Star, CheckCircle, CreditCard, Landmark, Send, Loader2, X } from 'lucide-react';
import SEO from '../components/common/SEO';
import useAuthStore from '../store/authStore';
import api from '../services/api';
import { formatTierPrice, isNigerianUser } from '../utils/currency';

/* ── Apple Pay logo (inline SVG) ── */
const ApplePayIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M7.08 4.63c-.44.52-1.15.93-1.85.87-.09-.7.26-1.45.66-1.91.44-.52 1.21-.9 1.84-.93.07.73-.21 1.45-.65 1.97zm.65 1.01c-1.02-.06-1.9.58-2.38.58s-1.24-.55-2.05-.53c-1.05.02-2.03.61-2.57 1.56-1.1 1.9-.28 4.72.78 6.27.52.76 1.15 1.6 1.97 1.57.78-.03 1.09-.51 2.04-.51s1.22.51 2.05.49c.85-.01 1.39-.76 1.91-1.52.6-.87.84-1.71.86-1.75-.02-.01-1.65-.63-1.66-2.51-.02-1.57 1.28-2.32 1.34-2.36-.73-1.08-1.87-1.2-2.28-1.23v-.06z" />
  </svg>
);

const tierData = [
  {
    id: 'free',
    name: 'Free',
    ngn: 0,
    usd: 0,
    desc: 'Start studying with your own material for free.',
    features: [
      'Up to 2 library documents',
      '50 chats per month',
      'Temporary chats only',
      'Learn mode included',
      'Community support',
    ],
    cta: 'Get Started',
    popular: false,
  },
  {
    id: 'basic',
    name: 'Basic',
    ngn: 5000,
    usd: 10,
    desc: 'Best for regular coursework and weekly revision.',
    features: [
      'Up to 10 library documents',
      '200 chats per month',
      'Full chat history',
      'Learn mode included',
      'Standard support',
    ],
    cta: 'Choose Basic',
    popular: false,
  },
  {
    id: 'pro',
    name: 'Pro',
    ngn: 20000,
    usd: 25,
    desc: 'Advanced tools for deeper study and heavier usage.',
    features: [
      'Up to 50 library documents',
      '1,500 chats per month',
      'Unlock Teach Mode',
      'Study Break podcast',
      'Image and diagram generation',
      'Priority processing',
    ],
    cta: 'Go Pro',
    popular: true,
  },
  {
    id: 'max',
    name: 'Max',
    ngn: 50000,
    usd: 50,
    desc: 'For intensive study loads and power users.',
    features: [
      'Up to 200 library documents',
      'Unlimited AI with fair use',
      'Everything in Pro',
      'Priority AI reasoning models',
      'Early access to new features',
      '24/7 priority support',
    ],
    cta: 'Get Max',
    popular: false,
  },
];

const pricingHighlights = [
  {
    title: 'Start free, upgrade when your workload grows',
    text: 'The free plan lets you test StudyRAG with real material before moving to higher chat or document limits.',
  },
  {
    title: 'Choose by document volume and study intensity',
    text: 'If you study from many textbooks, papers, or lecture packs, the higher tiers are designed to give you more room and more conversations.',
  },
  {
    title: 'Built for students who study from sources',
    text: 'Every plan is designed around notes, PDFs, lecture slides, and revision workflows rather than generic AI usage alone.',
  },
];

const pricingSchema = [
  {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: 'StudyRAG Pricing',
    url: 'https://studyrag.co/pricing',
    description: 'StudyRAG pricing plans for students who want AI-powered study from notes, PDFs, and other source material.',
  },
  {
    '@context': 'https://schema.org',
    '@type': 'OfferCatalog',
    name: 'StudyRAG Pricing Plans',
    itemListElement: tierData.map((tier) => ({
      '@type': 'Offer',
      name: tier.name,
      price: String(tier.usd),
      priceCurrency: 'USD',
      description: tier.desc,
      category: 'EducationApplication',
    })),
  },
];

/**
 * Open Paystack Inline Popup using @paystack/inline-js.
 * Renders inside the current page — no redirect.
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

export default function Pricing() {
  const navigate = useNavigate();
  const { user, fetchProfile } = useAuthStore();
  const [selectedTier, setSelectedTier] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [paymentSuccess, setPaymentSuccess] = useState(null);

  const tiers = useMemo(() => tierData.map(t => {
    const price = formatTierPrice(t.ngn, t.usd);
    return { ...t, price: price.primary, priceSecondary: price.secondary, priceValue: t.ngn };
  }), []);

  const isNG = isNigerianUser();

  const paymentChannels = [
    { id: 'card', name: 'Pay with Card', icon: CreditCard, description: 'Visa, Mastercard, Verve' },
    { id: 'apple_pay', name: 'Pay with Apple Pay', icon: ApplePayIcon, description: 'Quick checkout on Apple devices' },
    ...(isNG ? [
      { id: 'bank_transfer', name: 'Pay via Bank Transfer', icon: Send, description: 'Transfer directly from your bank' },
      { id: 'bank', name: 'Pay via Bank or USSD', icon: Landmark, description: 'Use your bank account or USSD code' },
    ] : []),
  ];

  const handleCheckout = async (channelId) => {
    if (!user) {
      window.location.href = '/login?redirect=/pricing';
      return;
    }

    setIsLoading(true);
    setErrorMsg('');

    try {
      const { data } = await api.post('/payment/checkout', {
        tier: selectedTier.id,
        channel: channelId,
      });

      if (!data.accessCode && !data.checkoutUrl) {
        throw new Error('No payment session received');
      }

      // Prefer inline popup (embedded)
      if (data.accessCode) {
        setIsLoading(false);
        await openPaystackInline({
          accessCode: data.accessCode,
          onSuccess: async () => {
            try {
              await api.get(`/payment/verify/${encodeURIComponent(data.paymentReference)}`);
            } catch { /* webhook handles it */ }
            await fetchProfile();
            setPaymentSuccess(selectedTier.name);
            setSelectedTier(null);
          },
          onClose: (error) => {
            if (error) setErrorMsg('Payment did not complete. Please try again.');
          },
        });
      } else {
        // Fallback: redirect (Monnify)
        window.location.href = data.checkoutUrl;
      }
    } catch (err) {
      console.error('Checkout error:', err);
      const msg = err.response?.data?.error || err.message || 'An error occurred during checkout. Please try again.';
      setErrorMsg(msg);
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <SEO
        title="StudyRAG Pricing Plans for Students and Exam Prep"
        description="Compare StudyRAG pricing plans for grounded AI study with notes, PDFs, quizzes, flashcards, and higher document limits as your workload grows."
        canonical="/pricing"
        keywords={[
          'study app pricing',
          'ai study platform pricing',
          'exam prep ai subscription',
          'study rag pricing',
          'student ai plans',
        ]}
        schema={pricingSchema}
      />
      <PublicNavbar />
      <main className="flex-1 bg-gray-50/50">
        <section className="py-24 px-6">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-20">
              <h1 className="text-4xl md:text-6xl font-black text-gray-900 mb-6 tracking-tight">
                Focus on Learning, <br /> Not <span className="text-primary">Pricing</span>
              </h1>
              <p className="text-lg text-gray-600 font-medium max-w-3xl mx-auto">
                Choose the StudyRAG plan that matches your document volume, chat frequency, and exam-prep intensity. Start free, then upgrade when you need more room for notes, PDFs, flashcards, and guided study.
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto items-stretch">
              {tiers.map((tier) => (
                <div key={tier.id} className={`relative sleek-card p-8 flex flex-col h-full bg-white transition-all hover:shadow-2xl cursor-pointer ${tier.popular ? 'border-2 border-primary ring-4 ring-primary/5' : 'border-gray-100'}`}>
                  {tier.popular && (
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-primary text-white text-[10px] font-black uppercase tracking-widest px-4 py-1.5 rounded-full shadow-lg flex items-center gap-1.5">
                      <Star className="h-3 w-3 fill-white" />
                      Most Popular
                    </div>
                  )}
                  <div className="mb-8">
                    <h3 className="text-xl font-black text-gray-900 mb-2">{tier.name}</h3>
                    <div className="flex flex-col mb-4">
                      <div className="flex items-baseline gap-1">
                        <span className="text-4xl font-black text-gray-900">{tier.price}</span>
                        {tier.id !== 'free' && <span className="text-gray-400 font-bold uppercase text-[10px] tracking-widest">/mo</span>}
                      </div>
                      {tier.priceSecondary && <span className="text-gray-400 font-medium text-sm">{tier.priceSecondary}</span>}
                    </div>
                    <p className="text-sm text-gray-500 font-medium">{tier.desc}</p>
                  </div>
                  <div className="space-y-4 mb-10 flex-1">
                    {tier.features.map((feat) => (
                      <div key={feat} className="flex gap-3 text-sm font-medium text-gray-600">
                        <Check className="h-5 w-5 text-emerald-500 flex-shrink-0" />
                        {feat}
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={() => (tier.id === 'free' ? navigate('/documents') : setSelectedTier(tier))}
                    className={`w-full py-4 rounded-2xl font-black text-sm uppercase tracking-widest transition-all active:scale-95 cursor-pointer ${tier.popular ? 'bg-primary text-white shadow-xl shadow-primary/20 hover:bg-primary/90' : 'bg-gray-100 text-gray-900 hover:bg-gray-200'}`}
                  >
                    {tier.cta}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="pb-24 px-6">
          <div className="max-w-6xl mx-auto grid md:grid-cols-3 gap-6">
            {pricingHighlights.map((item) => (
              <article key={item.title} className="rounded-[2rem] border border-gray-200 bg-white p-8 shadow-sm">
                <h2 className="text-2xl font-black text-gray-900 mb-4">{item.title}</h2>
                <p className="text-gray-600 font-medium leading-relaxed">{item.text}</p>
              </article>
            ))}
          </div>
        </section>
      </main>

      {/* ── Payment method modal ── */}
      {selectedTier && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm" onClick={() => !isLoading && setSelectedTier(null)}>
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
            <div className="relative p-6 px-8 border-b border-gray-100 flex items-center justify-between bg-white z-10">
              <div>
                <h3 className="text-xl font-black text-gray-900">Select Payment Method</h3>
                <p className="text-sm font-medium text-gray-500 mt-1">Upgrading to {selectedTier.name} ({selectedTier.price})</p>
              </div>
              <button
                onClick={() => !isLoading && setSelectedTier(null)}
                className="h-10 w-10 flex items-center justify-center rounded-full bg-gray-50 text-gray-400 hover:text-gray-900 hover:bg-gray-100 transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 px-8 overflow-y-auto bg-gray-50/50 flex-1">
              {errorMsg && (
                <div className="mb-6 p-4 rounded-2xl bg-red-50 border border-red-100 text-red-600 text-sm font-medium">
                  {errorMsg}
                </div>
              )}

              <div className="space-y-3">
                {paymentChannels.map((channel) => {
                  const Icon = channel.icon;
                  return (
                    <button
                      key={channel.id}
                      onClick={() => handleCheckout(channel.id)}
                      disabled={isLoading}
                      className="w-full relative group flex items-center gap-4 p-5 rounded-2xl bg-white border border-gray-100 hover:border-primary/50 hover:shadow-lg transition-all active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none text-left cursor-pointer"
                    >
                      <div className="h-12 w-12 rounded-xl bg-gray-50 flex flex-shrink-0 items-center justify-center group-hover:bg-primary/10 transition-colors">
                        <Icon className="h-6 w-6 text-gray-400 group-hover:text-primary transition-colors" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-base font-bold text-gray-900 mb-0.5">{channel.name}</div>
                        <div className="text-sm font-medium text-gray-500">{channel.description}</div>
                      </div>
                    </button>
                  );
                })}
              </div>

              <p className="text-center text-xs font-semibold text-gray-400 mt-6 flex items-center justify-center gap-1.5">
                Secured by Paystack
              </p>
            </div>

            {isLoading && (
              <div className="absolute inset-0 bg-white/80 backdrop-blur-[2px] z-20 flex flex-col items-center justify-center rounded-3xl">
                <Loader2 className="h-10 w-10 text-primary animate-spin mb-4" />
                <p className="text-sm font-bold text-gray-900 animate-pulse">Initializing Checkout...</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Success toast ── */}
      {paymentSuccess && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm" onClick={() => setPaymentSuccess(null)}>
          <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full p-8 text-center" onClick={e => e.stopPropagation()}>
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-100 mb-5">
              <CheckCircle className="h-8 w-8 text-emerald-600" />
            </div>
            <h2 className="text-2xl font-black text-gray-900 mb-2">You're on {paymentSuccess}!</h2>
            <p className="text-sm text-gray-500 mb-6">Your upgrade is active. Start exploring your new features.</p>
            <button
              onClick={() => { setPaymentSuccess(null); navigate('/documents'); }}
              className="w-full bg-primary text-white font-bold py-3 rounded-2xl hover:bg-primary/90 transition-colors cursor-pointer"
            >
              Go to Library
            </button>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}
