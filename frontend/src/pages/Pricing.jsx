import React, { useState, useEffect } from 'react';
import PublicNavbar from '../components/layout/PublicNavbar';
import Footer from '../components/layout/Footer';
import { Check, Star, Loader2 } from 'lucide-react';

export default function Pricing() {
    const [isNigeria, setIsNigeria] = useState(false);
    const [isLoadingPrice, setIsLoadingPrice] = useState(true);

    useEffect(() => {
        const detectLocation = async () => {
            try {
                const response = await fetch('https://ipapi.co/json/');
                const data = await response.json();
                
                if (data.country_code === 'NG') {
                    setIsNigeria(true);
                }
            } catch (error) {
                console.error('Geolocation fetch failed, falling back to timezone check:', error);
                const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
                if (timeZone === 'Africa/Lagos') {
                    setIsNigeria(true);
                }
            } finally {
                setIsLoadingPrice(false);
            }
        };

        detectLocation();
    }, []);

    const tiers = [
        {
            name: 'Free',
            price: '0',
            currency: isNigeria ? '₦' : '$',
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
            price: isNigeria ? '5,000' : '12',
            currency: isNigeria ? '₦' : '$',
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
        <div className="min-h-screen flex flex-col font-sans">
            <PublicNavbar />
            <main className="flex-1 bg-slate-50">
                <section className="py-24 px-6">
                    <div className="max-w-7xl mx-auto">
                        <div className="text-center mb-20">
                            <h1 className="text-4xl md:text-6xl font-black text-slate-900 mb-6 tracking-tight">
                                Focus on Learning, <br /> Not <span className="text-cyan-600">Pricing</span>
                            </h1>
                            <p className="text-lg text-slate-600 font-medium max-w-2xl mx-auto">
                                Everything you need to master your subject, from the first upload to the final exam.
                            </p>
                        </div>

                        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto items-stretch">
                            {tiers.map((tier, i) => (
                                <div key={i} className={`relative p-10 flex flex-col h-full bg-white rounded-3xl transition-all duration-300 hover:shadow-xl ${tier.popular ? 'border-2 border-cyan-500 shadow-lg shadow-cyan-500/10' : 'border border-slate-200 shadow-sm'}`}>
                                    
                                    {tier.popular && (
                                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-cyan-500 text-white text-[10px] font-black uppercase tracking-widest px-4 py-1.5 rounded-full shadow-md flex items-center gap-1.5">
                                            <Star className="h-3 w-3 fill-white" />
                                            Most Popular
                                        </div>
                                    )}
                                    
                                    <div className="mb-8">
                                        <h3 className="text-xl font-bold text-slate-900 mb-4">{tier.name}</h3>
                                        
                                        <div className="flex items-baseline gap-1 mb-2 min-h-[60px]">
                                            {isLoadingPrice ? (
                                                <div className="flex items-center gap-2 text-slate-400">
                                                    <Loader2 className="w-6 h-6 animate-spin" />
                                                    <span className="text-sm font-medium">Loading local pricing...</span>
                                                </div>
                                            ) : (
                                                <>
                                                    <span className="text-3xl font-bold text-slate-900">{tier.currency}</span>
                                                    <span className="text-6xl font-black text-slate-900 tracking-tight">{tier.price}</span>
                                                    <span className="text-slate-400 font-bold uppercase text-xs tracking-widest ml-1">/mo</span>
                                                </>
                                            )}
                                        </div>
                                        
                                        <p className="text-sm text-slate-500 font-medium">{tier.desc}</p>
                                    </div>
                                    
                                    <div className="space-y-4 mb-10 flex-1">
                                        {tier.features.map((feat, j) => (
                                            <div key={j} className="flex gap-3 text-sm font-medium text-slate-600">
                                                <Check className="h-5 w-5 text-cyan-500 flex-shrink-0" />
                                                {feat}
                                            </div>
                                        ))}
                                    </div>
                                    
                                    <button className={`w-full py-4 rounded-2xl font-bold text-sm transition-all active:scale-[0.98] ${tier.popular ? 'bg-cyan-500 text-white shadow-md shadow-cyan-500/20 hover:bg-cyan-400 hover:shadow-lg hover:shadow-cyan-500/30' : 'bg-slate-100 text-slate-900 hover:bg-slate-200'}`}>
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