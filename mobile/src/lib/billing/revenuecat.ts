import Purchases, {
  CustomerInfo,
  LOG_LEVEL,
  PurchasesOffering,
  PurchasesPackage,
} from 'react-native-purchases';
import { env } from '@/lib/env';

let configuredUserId: string | null = null;

export async function configureRevenueCat(appUserID?: string | null) {
  if (!env.revenueCatApiKey) {
    return;
  }

  Purchases.setLogLevel(LOG_LEVEL.INFO);

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
  try {
    await Purchases.logOut();
  } catch {
    // noop
  }
  configuredUserId = null;
}

export async function getOfferings() {
  if (!env.revenueCatApiKey) return null;
  return Purchases.getOfferings();
}

export async function purchasePackage(pkg: PurchasesPackage) {
  return Purchases.purchasePackage(pkg);
}

export async function restorePurchases() {
  return Purchases.restorePurchases();
}

export async function getCustomerInfo() {
  if (!env.revenueCatApiKey) return null;
  return Purchases.getCustomerInfo();
}

export function hasEntitlement(customerInfo: CustomerInfo | null | undefined, entitlementKey: string) {
  return Boolean(customerInfo?.entitlements?.active?.[entitlementKey]);
}

export type RevenueCatOffering = PurchasesOffering;
