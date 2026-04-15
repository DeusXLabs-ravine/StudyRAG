import { useState, useEffect } from 'react';
import api from '../../services/api';
import useAuthStore from '../../store/authStore';

/**
 * NativePayButton
 *
 * Shows an Apple Pay button when the browser supports it.
 * Payment is processed through Paystack's apple_pay channel —
 * clicking the button opens the Paystack popup restricted to Apple Pay.
 *
 * Renders nothing if Apple Pay is not available on the device/browser.
 */
export default function NativePayButton({ tier, onSuccess, onError }) {
  const [canPay, setCanPay] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { fetchProfile } = useAuthStore();

  useEffect(() => {
    // Apple Pay is available when ApplePaySession exists and canMakePayments() is true
    const supported =
      typeof window !== 'undefined' &&
      window.ApplePaySession &&
      window.ApplePaySession.canMakePayments();
    setCanPay(!!supported);
  }, []);

  const handleApplePay = async () => {
    setIsLoading(true);
    try {
      // Initialize a Paystack transaction restricted to apple_pay channel
      const { data } = await api.post('/payment/checkout', {
        tier,
        channel: 'apple_pay',
      });

      if (!data.accessCode && !data.checkoutUrl) {
        throw new Error('No payment session received');
      }

      if (data.accessCode) {
        const { default: PaystackPop } = await import('@paystack/inline-js');
        const popup = new PaystackPop();
        popup.resumeTransaction(data.accessCode, {
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

  if (!canPay) return null;

  return (
    <div>
      <button
        onClick={handleApplePay}
        disabled={isLoading}
        className="w-full h-[52px] bg-black text-white rounded-2xl flex items-center justify-center gap-2 font-semibold text-base hover:bg-gray-900 active:scale-[0.98] transition-all disabled:opacity-60 cursor-pointer"
        style={{ WebkitAppearance: '-apple-pay-button', ApplePayButtonType: 'plain' }}
      >
        {/* Fallback content shown if -apple-pay-button CSS isn't supported */}
        {!isLoading && (
          <>
            <svg viewBox="0 0 24 24" className="h-5 w-auto fill-white" xmlns="http://www.w3.org/2000/svg">
              <path d="M17.0425 12.7875C17.025 10.8375 18.6375 9.8925 18.7125 9.8475C17.805 8.505 16.3875 8.3175 15.885 8.3025C14.685 8.175 13.5225 9.0225 12.9075 9.0225C12.285 9.0225 11.3325 8.3175 10.32 8.3325C9.0075 8.355 7.7925 9.105 7.1175 10.2975C5.73 12.7275 6.735 16.3425 8.07 18.33C8.7375 19.305 9.525 20.3925 10.5525 20.3475C11.55 20.3025 11.9325 19.695 13.14 19.695C14.3475 19.695 14.7 20.3475 15.7425 20.325C16.815 20.3025 17.4975 19.35 18.15 18.3675C18.93 17.235 19.245 16.1325 19.26 16.0725C19.2375 16.065 17.0625 15.225 17.0425 12.7875Z" />
              <path d="M15.1275 7.0575C15.675 6.3825 16.05 5.46 15.945 4.5C15.165 4.5375 14.1975 5.0325 13.6275 5.6925C13.1175 6.27 12.6675 7.2225 12.7875 8.1225C13.665 8.19 14.565 7.7325 15.1275 7.0575Z" />
            </svg>
            <span>Pay</span>
          </>
        )}
        {isLoading && (
          <svg className="animate-spin h-5 w-5 fill-white" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" d="M4 12a8 8 0 018-8v8z" />
          </svg>
        )}
      </button>

      <div className="flex items-center gap-3 my-4">
        <div className="flex-1 h-px bg-gray-200" />
        <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
          or pay another way
        </span>
        <div className="flex-1 h-px bg-gray-200" />
      </div>
    </div>
  );
}
