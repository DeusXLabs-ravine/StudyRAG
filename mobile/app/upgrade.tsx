import { useEffect } from 'react';
import { router } from 'expo-router';
import { Alert, Text, View } from 'react-native';
import { Card } from '@/components/ui/Card';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { Screen } from '@/components/ui/Screen';
import { SectionTitle } from '@/components/ui/SectionTitle';
import { env } from '@/lib/env';
import { colors, fonts } from '@/lib/theme/tokens';
import { useBillingStore } from '@/stores/billing-store';

export default function UpgradeScreen() {
  const offerings = useBillingStore(state => state.offerings);
  const loading = useBillingStore(state => state.loading);
  const syncing = useBillingStore(state => state.syncing);
  const sync = useBillingStore(state => state.sync);
  const purchasePackage = useBillingStore(state => state.purchasePackage);
  const restorePurchases = useBillingStore(state => state.restorePurchases);

  useEffect(() => {
    sync().catch(() => undefined);
  }, [sync]);

  const packages = offerings?.current?.availablePackages || [];

  return (
    <Screen>
      <PrimaryButton label="Close" onPress={() => router.back()} variant="ghost" />
      <SectionTitle
        eyebrow="Upgrade"
        title="Manage mobile billing with RevenueCat."
        subtitle="This app intentionally keeps StoreKit and Google Billing client code out of the app surface. RevenueCat handles offerings, purchases, and restores for mobile."
      />

      {!env.revenueCatApiKey ? (
        <Card style={{ backgroundColor: colors.dangerSoft }}>
          <Text style={{ color: colors.danger, fontFamily: fonts.uiBold, fontSize: 15 }}>
            RevenueCat SDK keys are missing. Add the values in `mobile/.env.example` before testing purchases.
          </Text>
        </Card>
      ) : null}

      {packages.map(pkg => (
        <Card key={pkg.identifier}>
          <View style={{ gap: 10 }}>
            <Text style={{ color: colors.text, fontFamily: fonts.uiBlack, fontSize: 22 }}>
              {pkg.product.title}
            </Text>
            <Text style={{ color: colors.textMuted, fontFamily: fonts.uiMedium, fontSize: 14, lineHeight: 20 }}>
              {pkg.product.description}
            </Text>
            <Text style={{ color: colors.primaryDeep, fontFamily: fonts.uiBlack, fontSize: 18 }}>
              {pkg.product.priceString}
            </Text>
            <PrimaryButton
              label={loading ? 'Processing...' : 'Choose this plan'}
              onPress={() =>
                purchasePackage(pkg.identifier)
                  .then(() => Alert.alert('Purchase complete', 'Your StudyRAG mobile entitlement has been updated.'))
                  .catch(error => Alert.alert('Purchase failed', error.message))
              }
              disabled={loading}
            />
          </View>
        </Card>
      ))}

      <PrimaryButton label={syncing ? 'Refreshing...' : 'Refresh offerings'} onPress={() => sync().catch(error => Alert.alert('Refresh failed', error.message))} variant="secondary" />
      <PrimaryButton label="Restore purchases" onPress={() => restorePurchases().then(() => Alert.alert('Restore complete', 'Mobile purchases were restored if available.')).catch(error => Alert.alert('Restore failed', error.message))} variant="secondary" />
    </Screen>
  );
}
