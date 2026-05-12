import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import PublicNavbar from '../components/layout/PublicNavbar';
import Footer from '../components/layout/Footer';
import { Check, Star, CheckCircle, CreditCard, Landmark, Send, Loader2, X, GraduationCap } from 'lucide-react';
import SEO from '../components/common/SEO';
import useAuthStore from '../store/authStore';
import api from '../services/api';
import { formatTierPrice, checkIsNigerianUser, isNigerianUserSync } from '../utils/currency';
import NativePayButton from '../components/paywall/NativePayButton';

const MONTHLY_TIERS = [
  {
    id: 'free',
    name: 'Free',
    ngn: 0,
    usd: 0,
    desc: 'Start studying with your own material for free.',
    features: [
      'Up to 3 library documents',
      '75 chats per month',
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
    desc: 'Regular coursework with a taste of advanced tools.',
    features: [
      'Up to 10 library documents',
      '200 chats per month',
      'Full chat history',
      '3 Teach Mode sessions/month',
      '2 Study podcasts/month',
      'Standard support',
    ],
    cta: 'Choose Basic',
    popular: false,
  },
  {
    id: 'pro',
    name: 'Pro',
    ngn: 15000,
    usd: 20,
    desc: 'Unlimited advanced tools for deeper study.',
    features: [
      'Up to 50 library documents',
      '1,500 chats per month',
      'Unlimited Teach Mode',
      'Unlimited Study podcasts',
      'Image and diagram generation',
      'Priority processing',
    ],
    cta: 'Go Pro',
    popular: true,
  },
  {
    id: 'max',
    name: 'Max',
    ngn: 45000,
    usd: 45,
    desc: 'For intensive study loads and power users.',
    features: [
      'Up to 200 library documents',
      'Unlimited AI with fair use',
      'Everything in Pro',
      'Priority AI reasoning models',
      'Study Buddy voice partner',
      '24/7 priority support',
    ],
    cta: 'Get Max',
    popular: false,
  },
];

// Annual = 10 months price (2 months free)
const ANNUAL_MULTIPLIER = 10;
const STUDENT_DISCOUNT = 0.75; // 25% off

function getAnnualTiers(isStudent) {
  return MONTHLY_TIERS.map(t => {
    if (t.id === 'free') return { ...t };
    const annualNgn = Math.round(t.ngn * ANNUAL_MULTIPLIER * (isStudent ? STUDENT_DISCOUNT : 1));
    const annualUsd = Math.round(t.usd * ANNUAL_MULTIPLIER * (isStudent ? STUDENT_DISCOUNT : 1));
    const monthlyEquivNgn = Math.round(annualNgn / 12);
    const monthlyEquivUsd = Math.round(annualUsd / 12 * 10) / 10;
    return {
      ...t,
      ngn: annualNgn,
      usd: annualUsd,
      annualNgn,
      annualUsd,
      monthlyEquivNgn,
      monthlyEquivUsd,
      isAnnual: true,
    };
  });
}

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
    description: 'StudyRAG pricing plans for students who want AI-powered study from notes, PDFs, and other source material. Plans from free to ₦45,000/mo.',
  },
  {
    '@context': 'https://schema.org',
    '@type': 'OfferCatalog',
    name: 'StudyRAG Pricing Plans',
    itemListElement: MONTHLY_TIERS.map((tier) => ({
      '@type': 'Offer',
      name: tier.name,
      price: String(tier.usd),
      priceCurrency: 'USD',
      description: tier.desc,
      category: 'EducationApplication',
    })),
  },
];

async function openFlutterwaveInline({ publicKey, txRef, amount, currency, userEmail, userName, tier, billing, onSuccess, onClose }) {
  if (!window.FlutterwaveCheckout) {
    await new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://checkout.flutterwave.com/v3.js';
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }
  window.FlutterwaveCheckout({
    public_key: publicKey,
    tx_ref: txRef,
    amount,
    currency,
    payment_options: 'card',
    meta: { tier, billing: billing || 'monthly', source: 'studyrag_web' },
    customer: { email: userEmail, name: userName },
    callback: (data) => {
      if (data.status === 'successful' || data.status === 'completed') {
        onSuccess?.(data);
      } else {
        onClose?.(new Error('Payment was not successful'));
      }
    },
    onclose: () => onClose?.(),
    customizations: {
      title: 'StudyRAG',
      description: `StudyRAG ${tier ? tier.charAt(0).toUpperCase() + tier.slice(1) : ''} Subscription`,
      logo: 'https://studyrag.co/logo.png',
    },
  });
}

async function openPaystackInline({ accessCode, onSuccess, onClose: onPopupClose }) {
  const { default: PaystackPop } = await import('@paystack/inline-js');
  const popup = new PaystackPop();
  popup.resumeTransaction(accessCode, {
    onSuccess(transaction) { onSuccess?.(transaction); },
    onCancel() { onPopupClose?.(); },
    onError(error) { onPopupClose?.(error); },
  });
}

export default function Pricing() {
  const navigate = useNavigate();
  const { user, fetchProfile } = useAuthStore();
  const [selectedTier, setSelectedTier] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [paymentSuccess, setPaymentSuccess] = useState(null);
  const [isNG, setIsNG] = useState(isNigerianUserSync());
  const [billing, setBilling] = useState('monthly');

  // Student discount state
  const [isStudent, setIsStudent] = useState(false);
  const [showStudentModal, setShowStudentModal] = useState(false);
  const [studentEmail, setStudentEmail] = useState('');
  const [studentLoading, setStudentLoading] = useState(false);
  const [studentError, setStudentError] = useState('');

  useEffect(() => {
    checkIsNigerianUser().then(setIsNG);
  }, []);

  const tierData = useMemo(
    () => billing === 'annual' ? getAnnualTiers(isStudent) : MONTHLY_TIERS,
    [billing, isStudent]
  );

  const tiers = useMemo(() => tierData.map(t => {
    if (billing === 'annual' && t.id !== 'free') {
      // Show per-month equivalent
      const equiv = isNG ? t.monthlyEquivNgn : t.monthlyEquivUsd;
      const currency = isNG ? '₦' : '$';
      const total = isNG ? t.ngn : t.usd;
      const totalCurrency = isNG ? '₦' : '$';
      return {
        ...t,
        price: `${currency}${equiv?.toLocaleString()}`,
        priceSecondary: `${totalCurrency}${total?.toLocaleString()} billed annually`,
        priceValue: t.ngn,
      };
    }
    const price = formatTierPrice(t.ngn, t.usd, isNG);
    return { ...t, price: price.primary, priceSecondary: price.secondary, priceValue: t.ngn };
  }), [tierData, isNG, billing]);

  useEffect(() => {
    if (user && tiers.length > 0) {
      const params = new URLSearchParams(window.location.search);
      const checkoutTier = params.get('checkoutTier');
      const checkoutChannel = params.get('checkoutChannel');
      const checkoutGateway = params.get('checkoutGateway') || (params.get('checkoutChannel') === 'card' ? 'flutterwave' : 'paystack');

      if (checkoutTier && checkoutChannel) {
        const tierObj = tiers.find(t => t.id === checkoutTier);
        if (tierObj) {
          setSelectedTier(tierObj);
          window.history.replaceState({}, '', '/pricing');
          handleCheckout(checkoutChannel, checkoutGateway, tierObj);
        }
      }
    }
  }, [user, tiers]);

  const paymentChannels = isNG ? [
    { id: 'card', gateway: 'flutterwave', name: 'Pay with Card', icon: CreditCard, description: 'Visa, Mastercard, Verve — all countries' },
    { id: 'bank_transfer', gateway: 'paystack', name: 'Pay via Bank Transfer', icon: Send, description: 'Transfer directly from your bank' },
    { id: 'bank', gateway: 'paystack', name: 'Pay via Bank or USSD', icon: Landmark, description: 'Use your bank account or USSD code' },
  ] : [
    { id: 'card', gateway: 'flutterwave', name: 'Pay with Card', icon: CreditCard, description: 'Visa, Mastercard — international cards accepted' },
  ];

  const handleCheckout = async (channelId, gateway = 'paystack', customTier = selectedTier) => {
    if (!user) {
      const redirectUri = encodeURIComponent(`/pricing?checkoutTier=${customTier.id}&checkoutChannel=${channelId}&checkoutGateway=${gateway}`);
      window.location.href = `/login?redirect=${redirectUri}`;
      return;
    }

    setIsLoading(true);
    setErrorMsg('');

    try {
      const { data } = await api.post('/payment/checkout', {
        tier: customTier.id,
        channel: channelId,
        gateway,
        currency: isNG ? 'NGN' : 'USD',
        billing,
      });

      if (!data.flutterwavePublicKey && !data.accessCode && !data.checkoutUrl) {
        throw new Error('No payment session received');
      }

      if (data.flutterwavePublicKey) {
        setIsLoading(false);
        await openFlutterwaveInline({
          publicKey: data.flutterwavePublicKey,
          txRef: data.txRef || data.paymentReference,
          amount: data.amount,
          currency: data.currency,
          userEmail: data.userEmail,
          userName: data.userName,
          tier: customTier.id,
          billing,
          onSuccess: async (flwData) => {
            try {
              await api.post('/payment/verify-flutterwave', {
                transactionId: flwData.transaction_id,
                txRef: data.txRef || data.paymentReference,
              });
            } catch { /* webhook handles it */ }
            await fetchProfile();
            setPaymentSuccess(customTier.name);
            setSelectedTier(null);
          },
          onClose: (error) => {
            if (error) setErrorMsg('Payment did not complete. Please try again.');
          },
        });
      } else if (data.accessCode) {
        setIsLoading(false);
        await openPaystackInline({
          accessCode: data.accessCode,
          onSuccess: async () => {
            try {
              await api.get(`/payment/verify/${encodeURIComponent(data.paymentReference)}`);
            } catch { /* webhook handles it */ }
            await fetchProfile();
            setPaymentSuccess(customTier.name);
            setSelectedTier(null);
          },
          onClose: (error) => {
            if (error) setErrorMsg('Payment did not complete. Please try again.');
          },
        });
      } else if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      } else {
        throw new Error('Payment gateway unavailable. Please try a different payment method.');
      }
    } catch (err) {
      const msg = err.response?.data?.error || err.message || 'An error occurred during checkout. Please try again.';
      setErrorMsg(msg);
      setIsLoading(false);
    }
  };

  const handleClaimStudent = async () => {
    setStudentLoading(true);
    setStudentError('');
    try {
      await api.post('/auth/claim-student', { studentEmail });
      setIsStudent(true);
      setBilling('annual');
      setShowStudentModal(false);
      setStudentEmail('');
    } catch (err) {
      setStudentError(err.message || 'Could not verify student status. Check your email and try again.');
    } finally {
      setStudentLoading(false);
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
            <div className="text-center mb-12">
              <h1 className="text-4xl md:text-6xl font-black text-gray-900 mb-6 tracking-tight">
                Focus on Learning, <br /> Not <span className="text-primary">Pricing</span>
              </h1>
              <p className="text-lg text-gray-600 font-medium max-w-3xl mx-auto mb-10">
                Choose the StudyRAG plan that matches your document volume, chat frequency, and exam-prep intensity.
              </p>

              {/* Billing toggle */}
              <div className="inline-flex items-center gap-1 bg-gray-100 p-1 rounded-2xl mb-3">
                <button
                  onClick={() => setBilling('monthly')}
                  className={`px-5 py-2 rounded-xl text-sm font-bold transition-all cursor-pointer ${billing === 'monthly' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  Monthly
                </button>
                <button
                  onClick={() => setBilling('annual')}
                  className={`px-5 py-2 rounded-xl text-sm font-bold transition-all cursor-pointer flex items-center gap-2 ${billing === 'annual' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  Annual
                  <span className="bg-emerald-100 text-emerald-700 text-[10px] font-black uppercase tracking-wide px-2 py-0.5 rounded-full">
                    2 months free
                  </span>
                </button>
              </div>

              {/* Student discount banner */}
              {!isStudent && (
                <div className="flex items-center justify-center gap-2 mt-2">
                  <button
                    onClick={() => setShowStudentModal(true)}
                    className="flex items-center gap-2 text-sm font-semibold text-indigo-600 hover:text-indigo-700 underline underline-offset-2 cursor-pointer"
                  >
                    <GraduationCap className="h-4 w-4" />
                    Student? Get an extra 25% off annual plans
                  </button>
                </div>
              )}
              {isStudent && billing === 'annual' && (
                <div className="inline-flex items-center gap-2 bg-indigo-50 border border-indigo-200 text-indigo-700 text-sm font-bold px-4 py-2 rounded-full mt-2">
                  <GraduationCap className="h-4 w-4" />
                  Student discount applied (25% off annual)
                </div>
              )}
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
                        {tier.id !== 'free' && (
                          <span className="text-gray-400 font-bold uppercase text-[10px] tracking-widest">
                            {billing === 'annual' ? '/mo' : '/mo'}
                          </span>
                        )}
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
                <p className="text-sm font-medium text-gray-500 mt-1">
                  Upgrading to {selectedTier.name} ({selectedTier.price}/mo
                  {billing === 'annual' ? `, billed annually` : ''})
                </p>
              </div>
              <button
                onClick={() => !isLoading && setSelectedTier(null)}
                className="h-10 w-10 flex items-center justify-center rounded-full bg-gray-50 text-gray-400 hover:text-gray-900 hover:bg-gray-100 transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 px-8 overflow-y-auto bg-gray-50/50 flex-1">
              <NativePayButton
                tier={selectedTier.id}
                currency={isNG ? 'NGN' : 'USD'}
                user={user}
                onRequireLogin={() => handleCheckout('apple_pay', 'paystack', selectedTier)}
                onSuccess={async () => {
                  await fetchProfile();
                  setPaymentSuccess(selectedTier.name);
                  setSelectedTier(null);
                }}
                onError={(msg) => setErrorMsg(typeof msg === 'string' ? msg : 'Payment failed. Please try again.')}
              />

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
                      onClick={() => handleCheckout(channel.id, channel.gateway)}
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
                Secured by Flutterwave &amp; Paystack
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
              onClick={() => { setPaymentSuccess(null); navigate('/library'); }}
              className="w-full bg-primary text-white font-bold py-3 rounded-2xl hover:bg-primary/90 transition-colors cursor-pointer"
            >
              Go to Library
            </button>
          </div>
        </div>
      )}

      {/* ── Student discount modal ── */}
      {showStudentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm" onClick={() => setShowStudentModal(false)}>
          <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full p-8" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-indigo-100 flex items-center justify-center">
                  <GraduationCap className="h-5 w-5 text-indigo-600" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-gray-900">Student Discount</h3>
                  <p className="text-xs text-gray-500 font-medium">25% off all annual plans</p>
                </div>
              </div>
              <button onClick={() => setShowStudentModal(false)} className="h-8 w-8 flex items-center justify-center rounded-full bg-gray-50 text-gray-400 hover:bg-gray-100 cursor-pointer">
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="text-sm text-gray-600 font-medium mb-4">
              Enter your academic email address (.edu, .ac.uk, .edu.ng, etc.) to unlock the student discount on annual plans.
            </p>

            {studentError && (
              <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-100 text-red-600 text-sm font-medium">
                {studentError}
              </div>
            )}

            <input
              type="email"
              value={studentEmail}
              onChange={e => { setStudentEmail(e.target.value); setStudentError(''); }}
              placeholder="yourname@university.edu"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-300 mb-4"
            />

            <button
              onClick={handleClaimStudent}
              disabled={studentLoading || !studentEmail.trim()}
              className="w-full bg-indigo-600 text-white font-bold py-3 rounded-2xl hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:pointer-events-none cursor-pointer flex items-center justify-center gap-2"
            >
              {studentLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {studentLoading ? 'Verifying...' : 'Apply Student Discount'}
            </button>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}
