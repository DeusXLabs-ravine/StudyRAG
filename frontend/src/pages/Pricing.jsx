import PublicNavbar from '../components/layout/PublicNavbar';
import Footer from '../components/layout/Footer';
import { Check, Star } from 'lucide-react';
import SEO from '../components/common/SEO';

export default function Pricing() {
    const tiers = [
        {
            name: 'Free',
            price: '$0',
            desc: 'Start mastering for free.',
            features: [
                'Up to 5 Library Documents',
                'Basic Retrieval (RAG)',
                'Auto-Generated Quizzes',
                '20 Flashcards/Day Limit',
                'Community Support',
                'Web Link Indexing (Limited)'
            ],
            cta: 'Get Started',
            popular: false
        },
        {
            name: 'Pro',
            price: '$12',
            desc: 'Unlimited power for serious academics.',
            features: [
                'Unlimited Library Storage',
                'Sage 1.5 Pro Reasoning Model',
                'Priority RAG Processing',
                'Unlimited Flashcards & Quizzes',
                'Deep Context Citation Engine',
                'Excel & STEM LaTeX Support',
                'Adaptive Learning Analytics',
                'Priority 24/7 Support'
            ],
            cta: 'Go Pro',
            popular: true
        }
    ];

    return (
        <div className="min-h-screen flex flex-col">
            <SEO 
                title="Sponsorship & Pricing Plans"
                description="Choose the right plan for your academic journey. From our free starter tier to the advanced Pro plan with Sage 1.5 Pro reasoning models."
                canonical="/pricing"
            />
            <PublicNavbar />
            <main className="flex-1 bg-gray-50/50">
                <section className="py-24 px-6">
                    <div className="max-w-7xl mx-auto">
                        <div className="text-center mb-20">
                            <h1 className="text-4xl md:text-6xl font-black text-gray-900 mb-6 tracking-tight">Focus on Learning, <br /> Not <span className="text-primary">Pricing</span></h1>
                            <p className="text-lg text-gray-600 font-medium max-w-2xl mx-auto">Everything you need to master your subject, from the first upload to the final exam.</p>
                        </div>

                        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto items-stretch">
                            {tiers.map((tier, i) => (
                                <div key={i} className={`relative sleek-card p-10 flex flex-col h-full bg-white transition-all hover:shadow-2xl ${tier.popular ? 'border-2 border-primary ring-4 ring-primary/5' : 'border-gray-100'}`}>
                                    {tier.popular && (
                                        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-primary text-white text-[10px] font-black uppercase tracking-widest px-4 py-1.5 rounded-full shadow-lg flex items-center gap-1.5">
                                            <Star className="h-3 w-3 fill-white" />
                                            Most Popular
                                        </div>
                                    )}
                                    <div className="mb-8">
                                        <h3 className="text-xl font-black text-gray-900 mb-2">{tier.name}</h3>
                                        <div className="flex items-baseline gap-1 mb-2">
                                            <span className="text-5xl font-black text-gray-900">{tier.price}</span>
                                            {tier.price !== 'Custom' && <span className="text-gray-400 font-bold uppercase text-[10px] tracking-widest">/mo</span>}
                                        </div>
                                        <p className="text-sm text-gray-500 font-medium">{tier.desc}</p>
                                    </div>
                                    <div className="space-y-4 mb-10 flex-1">
                                        {tier.features.map((feat, j) => (
                                            <div key={j} className="flex gap-3 text-sm font-medium text-gray-600">
                                                <Check className="h-5 w-5 text-emerald-500 flex-shrink-0" />
                                                {feat}
                                            </div>
                                        ))}
                                    </div>
                                    <button className={`w-full py-4 rounded-2xl font-black text-sm uppercase tracking-widest transition-all active:scale-95 ${tier.popular ? 'bg-primary text-white shadow-xl shadow-primary/20 hover:bg-primary-600' : 'bg-gray-100 text-gray-900 hover:bg-gray-200'}`}>
                                        {tier.cta}
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>
            </main>
            <Footer />
        </div>
    );
}
