import { Link } from 'react-router-dom';
import { ArrowRight, LogIn } from 'lucide-react';
import Logo from '../common/Logo';
import useAuthStore from '../../store/authStore';

export default function PublicNavbar({ transparent = false }) {
    const { user, profile } = useAuthStore();
    const isAuthenticated = user && profile?.onboardingCompleted;

    return (
        <nav className={`sticky top-0 z-50 transition-all duration-300 ${transparent ? 'bg-transparent border-transparent' : 'bg-white border-b border-gray-100 shadow-sm'}`}>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-20">
                <Link to="/" className="flex items-center">
                    <Logo
                        className="h-12 w-12"
                        textClassName={`text-2xl font-black ${transparent ? 'text-white' : 'text-gray-900'}`}
                        boxed={transparent}
                    />
                </Link>

                {/* Desktop Links */}
                <div className="hidden md:flex items-center gap-8">
                    <Link to="/" className={`text-sm font-bold transition-colors ${transparent ? 'text-gray-300 hover:text-white' : 'text-gray-600 hover:text-primary'}`}>Home</Link>
                    <Link to="/about" className={`text-sm font-bold transition-colors ${transparent ? 'text-gray-300 hover:text-white' : 'text-gray-600 hover:text-primary'}`}>About</Link>
                    <Link to="/features" className={`text-sm font-bold transition-colors ${transparent ? 'text-gray-300 hover:text-white' : 'text-gray-600 hover:text-primary'}`}>Features</Link>
                    <Link to="/pricing" className={`text-sm font-bold transition-colors ${transparent ? 'text-gray-300 hover:text-white' : 'text-gray-600 hover:text-primary'}`}>Pricing</Link>
                </div>

                <div className="flex items-center gap-4">
                    {isAuthenticated ? (
                        <Link
                            to="/documents"
                            className="inline-flex items-center gap-2 bg-primary text-white px-6 py-2.5 rounded-xl font-bold text-sm hover:bg-primary-700 transition-all shadow-lg shadow-primary/20 hover:scale-105 active:scale-95"
                        >
                            Go to App
                            <ArrowRight className="h-4 w-4" />
                        </Link>
                    ) : (
                        <Link
                            to="/documents"
                            className="inline-flex items-center gap-2 bg-primary text-white px-6 py-2.5 rounded-xl font-bold text-sm hover:bg-primary-700 transition-all shadow-lg shadow-primary/20 hover:scale-105 active:scale-95"
                        >
                            <LogIn className="h-4 w-4" />
                            Sign In
                        </Link>
                    )}
                </div>
            </div>
        </nav>
    );
}
