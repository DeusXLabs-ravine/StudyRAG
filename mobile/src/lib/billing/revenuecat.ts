import type { CustomerInfo, PurchasesOffering, PurchasesPackage } from 'react-native-purchases';
import { env } from '@/lib/env';

let configuredUserId: string | null = null;
let purchasesModulePromise: Promise<typeof import('react-native-purchases') | null> | null = null;

async function getPurchasesModule() {
  if (purchasesModulePromise) {
    return purchasesModulePromise;
  }

  purchasesModulePromise = (async () => {
    try {
      return await import('react-native-purchases');
    } catch (error) {
      if (__DEV__) {
        console.warn('[Billing] RevenueCat native module unavailable (expected in Expo Go):', error);
      }
      return null;
    }
  })();

  return purchasesModulePromise;
}

export async function configureRevenueCat(appUserID?: string | null) {
  if (!env.revenueCatApiKey) {
    return;
  }

  const module = await getPurchasesModule();
  if (!module) return;

  const Purchases = module.default;
  Purchases.setLogLevel(module.LOG_LEVEL.INFO);

  if (!configuredUserId) {
    await Purchases.configure({
      apiKey: env.revenueCatApiKey,
      appUserID: appUserID || undefined,
    });
    configuredUserId = appUserID || '__anonymous__';
    return;
  }

  if (appUserID && configuredUserId !== appUserID) {
    await Purchases.logIn(appUserID);
    configuredUserId = appUserID;
  }
}

export async function resetRevenueCatIdentity() {
  if (!env.revenueCatApiKey) return;
  const module = await getPurchasesModule();
  if (!module) return;

  const Purchases = module.default;
  try {
    await Purchases.logOut();
  } catch {
    // noop
  }
  configuredUserId = null;
}

export async function getOfferings() {
  if (!env.revenueCatApiKey) return null;
  const module = await getPurchasesModule();
  if (!module) return null;

  const Purchases = module.default;
  return Purchases.getOfferings();
}

export async function purchasePackage(pkg: PurchasesPackage) {
  const module = await getPurchasesModule();
  if (!module) {
    throw new Error('In-app purchases are unavailable in Expo Go. Use a dev build for billing tests.');
  }

  const Purchases = module.default;
  return Purchases.purchasePackage(pkg);
}

export async function restorePurchases() {
  const module = await getPurchasesModule();
  if (!module) {
    throw new Error('Restore purchases is unavailable in Expo Go. Use a dev build for billing tests.');
  }

  const Purchases = module.default;
  return Purchases.restorePurchases();
}

export async function getCustomerInfo() {
  if (!env.revenueCatApiKey) return null;
  const module = await getPurchasesModule();
  if (!module) return null;

  const Purchases = module.default;
  return Purchases.getCustomerInfo();
}

export function hasEntitlement(customerInfo: CustomerInfo | null | undefined, entitlementKey: string) {
  return Boolean(customerInfo?.entitlements?.active?.[entitlementKey]);
}

export type RevenueCatOffering = PurchasesOffering;
