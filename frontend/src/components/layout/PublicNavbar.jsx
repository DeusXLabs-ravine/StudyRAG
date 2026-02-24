import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, LogIn, Menu, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Logo from '../common/Logo';
import useAuthStore from '../../store/authStore';

export default function PublicNavbar({ transparent = false }) {
    const { user, profile } = useAuthStore();
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const isAuthenticated = user && profile?.onboardingCompleted;

    const navLinks = [
        { name: 'Home', path: '/' },
        { name: 'About', path: '/about' },
        { name: 'Features', path: '/features' },
        { name: 'Pricing', path: '/pricing' },
    ];

    return (
        <nav className={`sticky top-0 z-50 transition-all duration-300 ${transparent ? 'bg-transparent border-transparent' : 'bg-white border-b border-gray-100 shadow-sm'}`}>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-20">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => setIsMenuOpen(true)}
                        className={`md:hidden p-2 -ml-2 transition-colors ${transparent ? 'text-white hover:bg-white/10' : 'text-gray-900 hover:bg-gray-100'} rounded-lg`}
                    >
                        <Menu className="h-6 w-6" />
                    </button>
                    <Link to="/" className="flex items-center">
                        <Logo
                            className="h-10 w-10 sm:h-12 sm:w-12"
                            textClassName={`text-lg sm:text-2xl font-black ${transparent ? 'text-white' : 'text-gray-900'}`}
                            boxed={transparent}
                        />
                    </Link>
                </div>

                {/* Desktop Links */}
                <div className="hidden md:flex items-center gap-8">
                    {navLinks.map((link) => (
                        <Link
                            key={link.name}
                            to={link.path}
                            className={`text-sm font-bold transition-colors ${transparent ? 'text-gray-300 hover:text-white' : 'text-gray-600 hover:text-primary'}`}
                        >
                            {link.name}
                        </Link>
                    ))}
                </div>

                <div className="flex items-center gap-4">
                    {isAuthenticated ? (
                        <Link
                            to="/documents"
                            className="inline-flex items-center gap-2 bg-primary text-white px-4 sm:px-6 py-2 sm:py-2.5 rounded-xl font-bold text-xs sm:text-sm hover:bg-primary-700 transition-all shadow-lg shadow-primary/20 hover:scale-105 active:scale-95"
                        >
                            <span className="hidden xs:inline">Go to App</span>
                            <span className="xs:hidden">App</span>
                            <ArrowRight className="h-4 w-4" />
                        </Link>
                    ) : (
                        <Link
                            to="/documents"
                            className="inline-flex items-center gap-2 bg-primary text-white px-4 sm:px-6 py-2 sm:py-2.5 rounded-xl font-bold text-xs sm:text-sm hover:bg-primary-700 transition-all shadow-lg shadow-primary/20 hover:scale-105 active:scale-95"
                        >
                            <LogIn className="h-4 w-4" />
                            Sign In
                        </Link>
                    )}
                </div>
            </div>

            {/* Mobile Menu Drawer */}
            <AnimatePresence>
                {isMenuOpen && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsMenuOpen(false)}
                            className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-[60]"
                        />
                        <motion.div
                            initial={{ x: '-100%' }}
                            animate={{ x: 0 }}
                            exit={{ x: '-100%' }}
                            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                            className="fixed inset-y-0 left-0 w-[280px] bg-white z-[70] shadow-2xl flex flex-col"
                        >
                            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                                <Logo className="h-8 w-8" textClassName="text-xl font-black" />
                                <button
                                    onClick={() => setIsMenuOpen(false)}
                                    className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                                >
                                    <X className="h-6 w-6" />
                                </button>
                            </div>
                            <div className="flex-1 py-8 px-6 space-y-2">
                                {navLinks.map((link) => (
                                    <Link
                                        key={link.name}
                                        to={link.path}
                                        onClick={() => setIsMenuOpen(false)}
                                        className="flex items-center py-4 px-4 text-lg font-bold text-gray-900 rounded-2xl hover:bg-gray-50 transition-colors"
                                    >
                                        {link.name}
                                    </Link>
                                ))}
                            </div>
                            <div className="p-6 border-t border-gray-100">
                                <p className="text-center text-[10px] font-black uppercase text-gray-400 tracking-[0.3em]">
                                    StudyRAG 2026
                                </p>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </nav>
    );
}
