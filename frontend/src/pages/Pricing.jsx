import { useState } from 'react';
import PublicNavbar from '../components/layout/PublicNavbar';
import Footer from '../components/layout/Footer';
import { Check, Star, CreditCard, Landmark, Send, Loader2, X } from 'lucide-react';
import SEO from '../components/common/SEO';
import useAuthStore from '../store/authStore';
import api from '../services/api';

const tiers = [
  {
    id: 'free',
    name: 'Free',
    price: 'NGN 0',
    priceValue: 0,
    usdPrice: '$0',
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
    price: 'NGN 5,000',
    priceValue: 5000,
    usdPrice: '$10',
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
    price: 'NGN 20,000',
    priceValue: 20000,
    usdPrice: '$20',
    desc: 'Advanced tools for deeper study and heavier usage.',
    features: [
      'Up to 50 library documents',
      '1,500 chats per month',
      'Unlock Teach Mode',
      'Unlock in-chat games',
      'Image and diagram generation',
      'Priority processing',
    ],
    cta: 'Go Pro',
    popular: true,
  },
  {
    id: 'max',
    name: 'Max',
    price: 'NGN 30,000',
    priceValue: 30000,
    usdPrice: '$50',
    desc: 'For intensive study loads and power users.',
    features: [
      'Up to 200 library documents',
      'Unlimited AI with fair use',
      'Teach Mode and games',
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
    itemListElement: tiers.map((tier) => ({
      '@type': 'Offer',
      name: tier.name,
      price: String(tier.priceValue),
      priceCurrency: 'NGN',
      description: tier.desc,
      category: 'EducationApplication',
    })),
  },
];

export default function Pricing() {
  const { user } = useAuthStore();
  const [selectedTier, setSelectedTier] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const paymentChannels = [
    { id: 'card', name: 'Pay with Card', icon: CreditCard, description: 'Secure credit or debit card payment' },
    { id: 'bank_transfer', name: 'Pay via Bank Transfer', icon: Send, description: 'Transfer directly from your bank' },
    { id: 'bank', name: 'Pay via Bank or USSD', icon: Landmark, description: 'Use your bank account or USSD code' },
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

      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      } else {
        throw new Error('No checkout URL received');
      }
    } catch (err) {
      console.error('Checkout error:', err);
      const msg = err.response?.data?.error || err.message || 'An error occurred during checkout. Please try again.';
      setErrorMsg(msg);
    } finally {
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
                <div key={tier.id} className={`relative sleek-card p-8 flex flex-col h-full bg-white transition-all hover:shadow-2xl ${tier.popular ? 'border-2 border-primary ring-4 ring-primary/5' : 'border-gray-100'}`}>
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
                      {tier.usdPrice && <span className="text-gray-400 font-medium text-sm">Approx. {tier.usdPrice}</span>}
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
                    onClick={() => (tier.id === 'free' ? window.location.href = '/documents' : setSelectedTier(tier))}
                    className={`w-full py-4 rounded-2xl font-black text-sm uppercase tracking-widest transition-all active:scale-95 ${tier.popular ? 'bg-primary text-white shadow-xl shadow-primary/20 hover:bg-primary-600' : 'bg-gray-100 text-gray-900 hover:bg-gray-200'}`}
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

      {selectedTier && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
            <div className="relative p-6 px-8 border-b border-gray-100 flex items-center justify-between bg-white z-10">
              <div>
                <h3 className="text-xl font-black text-gray-900">Select Payment Method</h3>
                <p className="text-sm font-medium text-gray-500 mt-1">Upgrading to {selectedTier.name} ({selectedTier.price})</p>
              </div>
              <button
                onClick={() => !isLoading && setSelectedTier(null)}
                className="h-10 w-10 flex items-center justify-center rounded-full bg-gray-50 text-gray-400 hover:text-gray-900 hover:bg-gray-100 transition-colors"
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
                      className="w-full relative group flex items-center gap-4 p-5 rounded-2xl bg-white border border-gray-100 hover:border-primary/50 hover:shadow-lg transition-all active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none text-left"
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
                Secured by Paystack and Monnify
              </p>
            </div>

            {isLoading && (
              <div className="absolute inset-0 bg-white/80 backdrop-blur-[2px] z-20 flex flex-col items-center justify-center">
                <Loader2 className="h-10 w-10 text-primary animate-spin mb-4" />
                <p className="text-sm font-bold text-gray-900 animate-pulse">Initializing Checkout...</p>
              </div>
            )}
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}
