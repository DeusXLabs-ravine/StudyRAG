import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { CheckCircle, XCircle, Loader2, ArrowRight } from 'lucide-react';
import useAuthStore from '../store/authStore';
import api from '../services/api';

export default function PaymentVerify() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { fetchProfile } = useAuthStore();
  const reference = searchParams.get('reference');

  const [state, setState] = useState('loading'); // loading | success | pending | failed | error
  const [tier, setTier] = useState(null);

  useEffect(() => {
    if (!reference) {
      setState('error');
      return;
    }
    verify();
  }, [reference]);

  async function verify() {
    setState('loading');
    try {
      const { data } = await api.get(`/payment/verify/${encodeURIComponent(reference)}`);

      if (data.status === 'success') {
        setTier(data.tier);
        setState('success');
        // Refresh profile so subscription_tier is up to date in the store
        fetchProfile();
      } else if (data.status === 'pending') {
        setState('pending');
      } else {
        setState('failed');
      }
    } catch {
      setState('error');
    }
  }

  const tierLabel = tier
    ? tier.charAt(0).toUpperCase() + tier.slice(1)
    : null;

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-3xl shadow-xl border border-gray-100 max-w-md w-full p-10 text-center">

        {state === 'loading' && (
          <>
            <Loader2 className="h-12 w-12 text-primary animate-spin mx-auto mb-6" />
            <h1 className="text-2xl font-black text-gray-900 mb-2">Confirming payment…</h1>
            <p className="text-gray-500 text-sm">Checking with Paystack, this takes a moment.</p>
          </>
        )}

        {state === 'success' && (
          <>
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-6" />
            <h1 className="text-2xl font-black text-gray-900 mb-2">Payment confirmed!</h1>
            <p className="text-gray-600 mb-6">
              Your account has been upgraded to{' '}
              <span className="font-bold text-primary">{tierLabel}</span>. Start learning!
            </p>
            <button
              onClick={() => navigate('/documents')}
              className="inline-flex items-center gap-2 bg-primary text-white font-bold px-6 py-3 rounded-2xl hover:bg-primary/90 transition-colors"
            >
              Go to my Library <ArrowRight className="h-4 w-4" />
            </button>
          </>
        )}

        {state === 'pending' && (
          <>
            <Loader2 className="h-12 w-12 text-yellow-500 mx-auto mb-6" />
            <h1 className="text-2xl font-black text-gray-900 mb-2">Payment processing</h1>
            <p className="text-gray-600 mb-6">
              Your payment is still being confirmed. This usually completes within a minute.
            </p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={verify}
                className="inline-flex items-center gap-2 bg-primary text-white font-bold px-5 py-2.5 rounded-2xl hover:bg-primary/90 transition-colors text-sm"
              >
                <Loader2 className="h-4 w-4" /> Check again
              </button>
              <button
                onClick={() => navigate('/documents')}
                className="inline-flex items-center gap-2 bg-gray-100 text-gray-700 font-bold px-5 py-2.5 rounded-2xl hover:bg-gray-200 transition-colors text-sm"
              >
                Go to Library
              </button>
            </div>
          </>
        )}

        {state === 'failed' && (
          <>
            <XCircle className="h-12 w-12 text-red-500 mx-auto mb-6" />
            <h1 className="text-2xl font-black text-gray-900 mb-2">Payment not completed</h1>
            <p className="text-gray-600 mb-6">
              It looks like the payment didn't go through. No charge was made.
            </p>
            <button
              onClick={() => navigate('/pricing')}
              className="inline-flex items-center gap-2 bg-primary text-white font-bold px-6 py-3 rounded-2xl hover:bg-primary/90 transition-colors"
            >
              Back to Pricing
            </button>
          </>
        )}

        {state === 'error' && (
          <>
            <XCircle className="h-12 w-12 text-red-400 mx-auto mb-6" />
            <h1 className="text-2xl font-black text-gray-900 mb-2">Something went wrong</h1>
            <p className="text-gray-600 mb-6">
              We couldn't verify your payment. If you were charged, please contact support with your reference:{' '}
              <span className="font-mono text-sm bg-gray-100 px-2 py-0.5 rounded">{reference || 'N/A'}</span>
            </p>
            <button
              onClick={() => navigate('/pricing')}
              className="inline-flex items-center gap-2 bg-gray-100 text-gray-700 font-bold px-6 py-3 rounded-2xl hover:bg-gray-200 transition-colors"
            >
              Back to Pricing
            </button>
          </>
        )}

      </div>
    </div>
  );
}
