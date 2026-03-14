import { useState } from 'react';
import { Mail, ArrowLeft, Inbox } from 'lucide-react';
import { toast } from 'sonner';
import useAuthStore from '../store/authStore';
import Logo from '../components/common/Logo';
import { MorphingSquare } from '../components/ui/morphing-square';

export default function Auth() {
  const [step, setStep] = useState('email'); // 'email' | 'sent'
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState(null);
  const [resendCooldown, setResendCooldown] = useState(0);
  const { sendMagicLink, signInWithGoogle, signInWithApple } = useAuthStore();

  const startCooldown = () => {
    setResendCooldown(60);
    const interval = setInterval(() => {
      setResendCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleSendLink = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    try {
      await sendMagicLink(email.trim());
      setStep('sent');
      startCooldown();
      toast.success('Magic link dispatched!', {
        description: `Check ${email} to sign in.`,
        icon: <Inbox className="h-4 w-4 text-emerald-500" />
      });
    } catch (err) {
      toast.error('Dispatch failed', {
        description: err.message || 'Failed to send sign-in link'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0) return;
    setLoading(true);
    try {
      await sendMagicLink(email.trim());
      startCooldown();
      toast.success('New link sent!', {
        description: 'Check your inbox again.',
        icon: <Inbox className="h-4 w-4 text-emerald-500" />
      });
    } catch (err) {
      toast.error('Resend failed', {
        description: 'Failed to resend link'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleOAuth = async (provider) => {
    setOauthLoading(provider);
    try {
      if (provider === 'google') await signInWithGoogle();
      else if (provider === 'apple') await signInWithApple();
    } catch (err) {
      toast.error(`Sign in failed`, {
        description: err.message || `Failed to sign in with ${provider}`
      });
      setOauthLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md relative z-10 animate-in fade-in slide-in-from-bottom-8 duration-700">
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
          {/* Logo & Header */}
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <Logo className="h-24 w-24" hideText />
            </div>
            <h1 className="text-2xl font-black text-gray-900">
              {step === 'email' ? 'Welcome to StudyRAG' : 'Check Your Email'}
            </h1>
            <p className="text-sm text-gray-500 mt-2">
              {step === 'email'
                ? 'Sign in or create an account to get started'
                : `We sent a sign-in link to ${email}`}
            </p>
          </div>

          {step === 'email' ? (
            <>
              {/* OAuth Buttons */}
              <div className="space-y-3 mb-6">
                <button
                  onClick={() => handleOAuth('google')}
                  disabled={oauthLoading !== null}
                  className="group w-full flex items-center justify-center gap-3 py-3 px-4 bg-white border border-gray-200 rounded-xl text-sm font-bold text-gray-700 hover:bg-gray-50 hover:border-gray-300 hover:shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {oauthLoading === 'google' ? (
                    <MorphingSquare className="w-4 h-4 bg-gray-400" />
                  ) : (
                    <svg className="w-5 h-5 group-hover:scale-110 transition-transform" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                    </svg>
                  )}
                  Continue with Google
                </button>

                <button
                  onClick={() => handleOAuth('apple')}
                  disabled={oauthLoading !== null}
                  className="group w-full flex items-center justify-center gap-3 py-3 px-4 bg-[#000000] text-white rounded-xl text-sm font-bold hover:bg-[#1a1a1a] hover:shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm border border-black"
                >
                  {oauthLoading === 'apple' ? (
                    <MorphingSquare className="w-4 h-4 bg-white" />
                  ) : (
                    <svg className="w-5 h-5 group-hover:scale-110 transition-transform" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.702z" />
                    </svg>
                  )}
                  Continue with Apple
                </button>
              </div>

              {/* Divider */}
              <div className="relative mb-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-200" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-white px-4 text-gray-400 font-bold uppercase tracking-widest">or</span>
                </div>
              </div>

              {/* Email Form */}
              <form onSubmit={handleSendLink}>
                <div className="mb-6">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="w-full pl-11 pr-4 py-3 rounded-xl border border-gray-200 text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all"
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading || !email.trim()}
                  className="w-full py-3 bg-primary text-white font-bold rounded-xl hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
                >
                  {loading && <MorphingSquare className="w-4 h-4 bg-white" />}
                  {loading ? 'Sending...' : 'Continue with Email'}
                </button>
              </form>
            </>
          ) : (
            <div className="text-center">
              <div className="flex justify-center mb-6">
                <div className="w-16 h-16 bg-primary-50 rounded-2xl flex items-center justify-center">
                  <Inbox className="h-8 w-8 text-primary-600" />
                </div>
              </div>

              <p className="text-sm text-gray-600 mb-6 leading-relaxed">
                Click the link in your email to sign in or sign up. If you don't see it, check your spam folder.
              </p>

              <div className="flex items-center justify-between text-sm">
                <button
                  onClick={() => setStep('email')}
                  className="flex items-center gap-1 text-gray-500 hover:text-gray-700 transition-colors"
                >
                  <ArrowLeft className="h-4 w-4" /> Change email
                </button>
                <button
                  onClick={handleResend}
                  disabled={resendCooldown > 0}
                  className="text-primary hover:text-primary-700 font-semibold transition-colors disabled:text-gray-400 disabled:cursor-not-allowed"
                >
                  {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend link'}
                </button>
              </div>
            </div>
          )}
        </div>

        <p className="text-center text-gray-400 text-xs mt-6">
          By continuing, you agree to our Terms of Service and Privacy Policy.
        </p>
      </div>
    </div>
  );
}
