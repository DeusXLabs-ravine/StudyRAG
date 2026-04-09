import { create } from 'zustand';
import {
  getCustomerInfo,
  getOfferings,
  hasEntitlement as revenueCatHasEntitlement,
  purchasePackage as revenueCatPurchasePackage,
  restorePurchases as revenueCatRestorePurchases,
} from '@/lib/billing/revenuecat';

type BillingState = {
  loading: boolean;
  syncing: boolean;
  offerings: Awaited<ReturnType<typeof getOfferings>> | null;
  customerInfo: Awaited<ReturnType<typeof getCustomerInfo>> | null;
  sync: () => Promise<void>;
  purchasePackage: (packageId: string) => Promise<void>;
  restorePurchases: () => Promise<void>;
  hasEntitlement: (entitlementKey: string) => boolean;
};

export const useBillingStore = create<BillingState>((set, get) => ({
  loading: false,
  syncing: false,
  offerings: null,
  customerInfo: null,
  sync: async () => {
    set({ syncing: true });
    try {
      const [offerings, customerInfo] = await Promise.all([getOfferings(), getCustomerInfo()]);
      set({ offerings, customerInfo });
    } finally {
      set({ syncing: false });
    }
  },
  purchasePackage: async packageId => {
    const offerings = get().offerings;
    const availablePackages = offerings?.current?.availablePackages || [];
    const pkg = availablePackages.find(item => item.identifier === packageId);
    if (!pkg) {
      throw new Error('That package is not available right now.');
    }

    set({ loading: true });
    try {
      await revenueCatPurchasePackage(pkg);
      const customerInfo = await getCustomerInfo();
      set({ customerInfo });
    } finally {
      set({ loading: false });
    }
  },
  restorePurchases: async () => {
    set({ loading: true });
    try {
      const customerInfo = await revenueCatRestorePurchases();
      set({ customerInfo });
    } finally {
      set({ loading: false });
    }
  },
  hasEntitlement: entitlementKey => revenueCatHasEntitlement(get().customerInfo, entitlementKey),
}));
