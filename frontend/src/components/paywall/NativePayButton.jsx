import { useState, useEffect, useRef } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import api from '../../services/api';
import { isNigerianUser } from '../../utils/currency';

const STRIPE_KEY = import.meta.env.VITE_STRIPE_PUBLIC_KEY;

// Lazy-load Stripe only once, only if the key is present
const stripePromise = STRIPE_KEY ? loadStripe(STRIPE_KEY) : null;

// Tier amounts in smallest currency unit (kobo / cents)
const STRIPE_AMOUNTS = {
  basic: { ngn: 500_000,   usd: 1_000 },
  pro:   { ngn: 2_000_000, usd: 2_500 },
  max:   { ngn: 5_000_000, usd: 5_000 },
};

/**
 * NativePayButton
 *
 * Renders an Apple Pay or Google Pay button directly on the page using
 * Stripe's Payment Request API — no Paystack popup, no redirect.
 *
 * • Apple Pay  →  visible on Safari / iOS / macOS with a card set up
 * • Google Pay →  visible on Chrome / Android with a saved payment method
 * • Both       →  shown when the browser supports both
 *
 * When neither is supported the component renders nothing (null).
 *
 * Required env vars:
 *   VITE_STRIPE_PUBLIC_KEY   (frontend)
 *   STRIPE_SECRET_KEY        (backend)
 *
 * Required Stripe setup:
 *   1. Enable Apple Pay in Stripe dashboard → Settings → Payment methods
 *   2. Add & verify your domain (studyrag.co) in the Apple Pay tab
 *   3. Google Pay works automatically — no extra setup needed
 */
export default function NativePayButton({ tier, onSuccess, onError }) {
  const containerRef = useRef(null);
  const [canPay, setCanPay] = useState(false);

  const isNG   = isNigerianUser();
  const currency = isNG ? 'ngn' : 'usd';
  const amounts  = STRIPE_AMOUNTS[tier?.toLowerCase()];
  const amount   = amounts ? (isNG ? amounts.ngn : amounts.usd) : 0;

  useEffect(() => {
    if (!stripePromise || !amounts || !containerRef.current) return;

    let destroyed = false;
    let prButton  = null;

    stripePromise.then((stripe) => {
      if (destroyed || !stripe || !containerRef.current) return;

      // Build a Payment Request — this is what triggers the native sheet
      const pr = stripe.paymentRequest({
        // country must match your Stripe account's country.
        // Change 'US' → 'NG' if you're using a Stripe Atlas Nigeria account.
        country: 'US',
        currency,
        total: { label: `StudyRAG ${tier} — 1 month`, amount },
        requestPayerName:  false,
        requestPayerEmail: false,
      });

      // Check if Apple Pay / Google Pay is available in this browser
      pr.canMakePayment().then((result) => {
        if (destroyed || !result || !containerRef.current) return;

        // Mount Stripe's PaymentRequestButtonElement — it auto-renders the
        // correct button (Apple Pay logo on Safari, Google Pay logo on Chrome)
        const elements = stripe.elements();
        prButton = elements.create('paymentRequestButton', {
          paymentRequest: pr,
          style: {
            paymentRequestButton: {
              type:   'default',
              theme:  'dark',
              height: '52px',
            },
          },
        });
        prButton.mount(containerRef.current);
        setCanPay(true);
      });

      // Fired when the user authorises via Apple/Google Pay
      pr.on('paymentmethod', async (ev) => {
        try {
          // 1. Create a PaymentIntent on the backend
          const { data } = await api.post('/payment/stripe/intent', { tier, currency });

          // 2. Confirm using the token from the device's wallet
          const { error: confirmError } = await stripe.confirmCardPayment(
            data.clientSecret,
            { payment_method: ev.paymentMethod.id },
            { handleActions: false }, // keep everything in-page, no redirects
          );

          if (confirmError) {
            ev.complete('fail');
            onError?.(confirmError.message || 'Payment failed. Please try again.');
          } else {
            ev.complete('success');

            // 3. Tell our backend to upgrade the subscription
            try {
              await api.post('/payment/stripe/confirm', {
                paymentIntentId: data.paymentIntentId,
                tier,
              });
            } catch (e) {
              // Non-fatal — backend will catch it via Stripe webhook as fallback
              console.warn('[NativePay] Backend confirm call failed:', e.message);
            }

            onSuccess?.();
          }
        } catch (err) {
          ev.complete('fail');
          onError?.(err?.response?.data?.error || 'Payment failed. Please try again.');
        }
      });
    });

    return () => {
      destroyed = true;
      try { prButton?.destroy(); } catch {}
    };
  }, [tier, currency, amount]);

  // Don't render anything if Stripe isn't configured or the device can't pay
  if (!STRIPE_KEY || !amounts) return null;

  return (
    <div className={canPay ? 'block' : 'hidden'}>
      {/* Stripe mounts the Apple Pay / Google Pay button here */}
      <div ref={containerRef} className="w-full rounded-2xl overflow-hidden" />

      {/* Divider between native-pay buttons and card/bank options below */}
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
