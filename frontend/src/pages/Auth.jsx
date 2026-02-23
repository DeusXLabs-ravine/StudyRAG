import { useState, useRef, useEffect } from 'react';
import { Mail, ArrowLeft, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import useAuthStore from '../store/authStore';
import Logo from '../components/common/Logo';
import Spinner from '../components/common/Spinner';

export default function Auth() {
  const [step, setStep] = useState('email'); // 'email' | 'otp'
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const otpRefs = useRef([]);
  const { sendOtp, verifyOtp } = useAuthStore();

  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const handleSendOtp = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    try {
      await sendOtp(email.trim());
      setStep('otp');
      setResendCooldown(60);
      toast.success('Code sent! Check your email.');
    } catch (err) {
      toast.error(err.message || 'Failed to send code');
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (index, value) => {
    if (value.length > 1) value = value.slice(-1);
    if (value && !/^\d$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto-advance
    if (value && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }

    // Auto-submit when all 6 digits filled
    if (value && newOtp.every(d => d !== '')) {
      handleVerifyOtp(newOtp.join(''));
    }
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e) => {
    const paste = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (paste.length === 6) {
      const newOtp = paste.split('');
      setOtp(newOtp);
      otpRefs.current[5]?.focus();
      handleVerifyOtp(paste);
    }
  };

  const handleVerifyOtp = async (token) => {
    setLoading(true);
    try {
      await verifyOtp(email.trim(), token);
      toast.success('Verified!');
    } catch (err) {
      toast.error(err.message || 'Invalid code. Please try again.');
      setOtp(['', '', '', '', '', '']);
      otpRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0) return;
    setLoading(true);
    try {
      await sendOtp(email.trim());
      setResendCooldown(60);
      toast.success('New code sent!');
    } catch (err) {
      toast.error('Failed to resend code');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-700 via-primary-600 to-primary-800 flex items-center justify-center px-4">
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none opacity-20">
        <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-white rounded-full blur-[120px]" />
        <div className="absolute -bottom-[10%] -right-[10%] w-[40%] h-[40%] bg-primary-400 rounded-full blur-[120px]" />
      </div>

      <div className="w-full max-w-md relative z-10 animate-in fade-in slide-in-from-bottom-8 duration-700">
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          {/* Logo & Header */}
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <Logo className="h-12 w-12" />
            </div>
            <h1 className="text-2xl font-black text-gray-900">
              {step === 'email' ? 'Welcome to StudyRAG' : 'Enter Verification Code'}
            </h1>
            <p className="text-sm text-gray-500 mt-2">
              {step === 'email'
                ? 'Sign in with your email to get started'
                : `We sent a 6-digit code to ${email}`}
            </p>
          </div>

          {step === 'email' ? (
            <form onSubmit={handleSendOtp}>
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
                className="w-full py-3 bg-primary text-white font-bold rounded-xl hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? <Spinner size="sm" /> : <Sparkles className="h-5 w-5" />}
                {loading ? 'Sending...' : 'Send Code'}
              </button>
            </form>
          ) : (
            <div>
              {/* OTP Input */}
              <div className="flex gap-3 justify-center mb-6" onPaste={handleOtpPaste}>
                {otp.map((digit, i) => (
                  <input
                    key={i}
                    ref={(el) => (otpRefs.current[i] = el)}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpChange(i, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(i, e)}
                    autoFocus={i === 0}
                    className="w-12 h-14 text-center text-xl font-bold rounded-xl border-2 border-gray-200 text-gray-900 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all"
                  />
                ))}
              </div>

              <button
                onClick={() => handleVerifyOtp(otp.join(''))}
                disabled={loading || otp.some(d => !d)}
                className="w-full py-3 bg-primary text-white font-bold rounded-xl hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mb-4"
              >
                {loading ? <Spinner size="sm" /> : null}
                {loading ? 'Verifying...' : 'Verify'}
              </button>

              <div className="flex items-center justify-between text-sm">
                <button
                  onClick={() => {
                    setStep('email');
                    setOtp(['', '', '', '', '', '']);
                  }}
                  className="flex items-center gap-1 text-gray-500 hover:text-gray-700 transition-colors"
                >
                  <ArrowLeft className="h-4 w-4" /> Change email
                </button>
                <button
                  onClick={handleResend}
                  disabled={resendCooldown > 0}
                  className="text-primary hover:text-primary-700 font-semibold transition-colors disabled:text-gray-400 disabled:cursor-not-allowed"
                >
                  {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend code'}
                </button>
              </div>
            </div>
          )}
        </div>

        <p className="text-center text-primary-200 text-xs mt-6">
          No password needed — we'll email you a code each time you sign in.
        </p>
      </div>
    </div>
  );
}
