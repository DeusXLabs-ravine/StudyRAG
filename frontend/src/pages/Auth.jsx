import { useState } from 'react';
import { Mail, ArrowLeft, Sparkles, Inbox } from 'lucide-react';
import { toast } from 'sonner';
import useAuthStore from '../store/authStore';
import Logo from '../components/common/Logo';
import { MorphingSquare } from '../components/ui/morphing-square';

export default function Auth() {
  const [step, setStep] = useState('email'); // 'email' | 'sent'
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const { sendMagicLink } = useAuthStore();

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
      toast.success('Sign-in link sent! Check your email.');
    } catch (err) {
      toast.error(err.message || 'Failed to send sign-in link');
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
      toast.success('New sign-in link sent!');
    } catch (err) {
      toast.error('Failed to resend link');
    } finally {
      setLoading(false);
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
                ? 'Enter your email to sign in or create an account'
                : `We sent a sign-in link to ${email}`}
            </p>
          </div>

          {step === 'email' ? (
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
                    autoFocus
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
                {loading ? 'Sending...' : 'Continue'}
              </button>
            </form>
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
          No password needed: we'll email you a link each time you sign in.
        </p>
      </div>
    </div>
  );
}
