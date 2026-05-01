import { useState } from 'react';
import api from '../../services/api';
import useAuthStore from '../../store/authStore';

/**
 * NativePayButton
 *
 * Shows an Apple Pay button unconditionally to all users.
 * Payment is processed through Paystack's apple_pay channel —
 * clicking the button opens the Paystack popup restricted to Apple Pay.
 */
export default function NativePayButton({ tier, currency = 'NGN', user, onRequireLogin, onSuccess, onError }) {
  const [isLoading, setIsLoading] = useState(false);
  const { fetchProfile } = useAuthStore();

  const handleApplePay = async () => {
    if (!user) {
      if (onRequireLogin) onRequireLogin();
      return;
    }

    // Option 1: Friendly error for non-Apple devices before attempting checkout
    const isSupported =
      typeof window !== 'undefined' &&
      window.ApplePaySession &&
      window.ApplePaySession.canMakePayments();

    if (!isSupported) {
      onError?.('Apple Pay is only available on Safari and Apple devices. Please choose another payment method.');
      return;
    }

    setIsLoading(true);
    try {
      // Initialize a Paystack transaction restricted to apple_pay channel
      const { data } = await api.post('/payment/checkout', {
        tier,
        channel: 'apple_pay',
        currency,
      });

      if (!data.accessCode && !data.checkoutUrl) {
        throw new Error('No payment session received');
      }

      if (data.accessCode) {
        const { default: PaystackPop } = await import('@paystack/inline-js');
        const popup = new PaystackPop();
        
        // Pass the public key explicitly as requested
        const publicKey = import.meta.env.VITE_PAYSTACK_PUBLIC_KEY;
        
        popup.resumeTransaction(data.accessCode, {
          key: publicKey,
          async onSuccess(transaction) {
            try {
              await api.get(`/payment/verify/${encodeURIComponent(data.paymentReference)}`);
            } catch { /* webhook handles it as fallback */ }
            await fetchProfile();
            onSuccess?.();
          },
          onCancel() {
            // User cancelled — do nothing
          },
          onError(err) {
            onError?.(err?.message || 'Payment failed. Please try again.');
          },
        });
      } else {
        window.location.href = data.checkoutUrl;
      }
    } catch (err) {
      onError?.(err?.response?.data?.error || err.message || 'Payment failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <div className="relative w-full">
        <button
          type="button"
          onClick={handleApplePay}
          disabled={isLoading}
          aria-label="Pay with Apple Pay"
          className="apple-pay-button w-full h-[52px] rounded-2xl cursor-pointer disabled:opacity-60 active:scale-[0.98] transition-transform bg-black flex items-center justify-center text-white font-semibold"
          style={{
            WebkitAppearance: '-apple-pay-button',
            appearance: '-apple-pay-button',
            WebkitApplePayButtonType: 'pay',
            WebkitApplePayButtonStyle: 'black',
          }}
        >
          {/* Fallback text for browsers that don't support the native Apple Pay button appearance */}
          <span className="apple-pay-fallback-text" style={{ display: 'none' }}>Pay with Apple Pay</span>
        </button>
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-black/30 pointer-events-none">
            <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
            </svg>
          </div>
        )}
      </div>

      <div className="flex items-center gap-3 my-4">
        <div className="flex-1 h-px bg-gray-200" />
        <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
          or pay another way
        </span>
        <div className="flex-1 h-px bg-gray-200" />
      </div>

      <style>{`
        @supports not (appearance: -apple-pay-button) {
          .apple-pay-button .apple-pay-fallback-text {
            display: inline-block !important;
          }
        }
        @supports not (-webkit-appearance: -apple-pay-button) {
          .apple-pay-button .apple-pay-fallback-text {
            display: inline-block !important;
          }
        }
      `}</style>
    </div>
  );
}
