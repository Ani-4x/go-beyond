import Purchases, { type CustomerInfo, type PurchasesOffering, type PurchasesPackage } from 'react-native-purchases';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, Linking, Platform } from 'react-native';
import { supabase } from '../lib/supabase';
import { useAuth } from './auth';

export const PRO_ENTITLEMENT = 'go_beyond_pro';

type MonetizationStatus = 'loading' | 'ready' | 'unavailable' | 'error';
type Monetization = {
  status: MonetizationStatus;
  isPro: boolean;
  offering: PurchasesOffering | null;
  error: string | null;
  purchase: (product: PurchasesPackage) => Promise<void>;
  manageSubscription: () => Promise<void>;
  restore: () => Promise<void>;
  redeemJudgeCode: (code: string) => Promise<void>;
  refresh: () => Promise<void>;
  clearError: () => void;
};

const Context = createContext<Monetization | null>(null);
const apiKey = __DEV__
  ? process.env.EXPO_PUBLIC_REVENUECAT_TEST_API_KEY
  : Platform.OS === 'ios'
    ? process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY
    : process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY;

function hasPro(customerInfo: CustomerInfo) {
  return Boolean(customerInfo.entitlements.active[PRO_ENTITLEMENT]);
}

export function MonetizationProvider({ children }: { children: React.ReactNode }) {
  const { userId, status: authStatus } = useAuth();
  const configuredUserId = useRef<string | null>(null);
  const sdkConfigured = useRef(false);
  const [status, setStatus] = useState<MonetizationStatus>('loading');
  const [isPro, setIsPro] = useState(false);
  const [offering, setOffering] = useState<PurchasesOffering | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!apiKey || Platform.OS === 'web') return;
    try {
      const info = await Purchases.getCustomerInfo();
      setIsPro(hasPro(info));
      const offerings = await Purchases.getOfferings();
      setOffering(offerings.current ?? null);
      setError(offerings.current ? null : 'No Go Beyond Pro offering is configured in RevenueCat yet.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not refresh RevenueCat.');
      throw e;
    }
  }, []);

  useEffect(() => {
    if (authStatus === 'loading') return;
    if (Platform.OS === 'web' || !apiKey) {
      setStatus('unavailable');
      setError(Platform.OS === 'web' ? 'Purchases are available in the iOS and Android app.' : 'Add the RevenueCat Test Store API key to .env.');
      return;
    }
    if (authStatus === 'signedOut') {
      if (!configuredUserId.current) {
        setStatus('unavailable');
        setIsPro(false);
        return;
      }
      configuredUserId.current = null;
      Purchases.logOut()
        .then(() => { setIsPro(false); setStatus('ready'); })
        .catch((e: unknown) => setError(e instanceof Error ? e.message : 'Could not clear the purchase account.'));
      return;
    }
    if (!userId) return;

    let live = true;
    setStatus('loading');
    setError(null);
    const syncCustomer = (info: CustomerInfo) => {
      if (live) setIsPro(hasPro(info));
    };
    Purchases.addCustomerInfoUpdateListener(syncCustomer);

    (async () => {
      try {
        if (!sdkConfigured.current) {
          Purchases.configure({ apiKey, appUserID: userId });
          sdkConfigured.current = true;
          configuredUserId.current = userId;
        } else if (configuredUserId.current !== userId) {
          await Purchases.logIn(userId);
          configuredUserId.current = userId;
        }
        const info = await Purchases.getCustomerInfo();
        if (!live) return;
        setIsPro(hasPro(info));
        setStatus('ready');
        try {
          const offerings = await Purchases.getOfferings();
          if (!live) return;
          setOffering(offerings.current ?? null);
          if (!offerings.current) setError('No Go Beyond Pro offering is configured in RevenueCat yet.');
        } catch (e) {
          if (live) setError(e instanceof Error ? e.message : 'Could not load subscription plans.');
        }
      } catch (e) {
        if (!live) return;
        setStatus('error');
        setError(e instanceof Error ? e.message : 'Could not connect to RevenueCat.');
      }
    })();

    return () => {
      live = false;
      Purchases.removeCustomerInfoUpdateListener(syncCustomer);
    };
  }, [authStatus, userId]);

  // Refresh after a user returns from the App Store or Play subscription settings.
  useEffect(() => {
    const listener = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active' && userId && sdkConfigured.current) {
        refresh().catch(() => {});
      }
    });
    return () => listener.remove();
  }, [refresh, userId]);

  const purchase = useCallback(async (product: PurchasesPackage) => {
    setError(null);
    try {
      const result = await Purchases.purchasePackage(product);
      setIsPro(hasPro(result.customerInfo));
    } catch (e) {
      if ((e as { userCancelled?: boolean })?.userCancelled) return;
      setError(e instanceof Error ? e.message : 'Purchase could not be completed.');
      throw e;
    }
  }, []);

  const manageSubscription = useCallback(async () => {
    setError(null);
    try {
      const info = await Purchases.getCustomerInfo();
      setIsPro(hasPro(info));
      if (!info.managementURL) {
        const store = String(info.entitlements.active[PRO_ENTITLEMENT]?.store ?? '').toLowerCase();
        if (__DEV__ || store.includes('test')) {
          throw new Error('This is a RevenueCat Test Store purchase, not an App Store or Google Play subscription. It expires automatically after up to five renewals, so there is no store cancellation page.');
        }
        if (store.includes('promotional')) {
          throw new Error('This Pro access was granted for judging. It has an expiry date and is not billed by an app store.');
        }
        const storeSettingsUrl = Platform.OS === 'ios'
          ? 'https://apps.apple.com/account/subscriptions'
          : 'https://play.google.com/store/account/subscriptions';
        await Linking.openURL(storeSettingsUrl);
        return;
      }
      await Linking.openURL(info.managementURL);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not open subscription settings.');
      throw e;
    }
  }, []);

  const restore = useCallback(async () => {
    setError(null);
    try {
      const info = await Purchases.restorePurchases();
      setIsPro(hasPro(info));
      if (!hasPro(info)) setError('No active Go Beyond Pro purchase was found for this store account.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Purchases could not be restored.');
      throw e;
    }
  }, []);

  const redeemJudgeCode = useCallback(async (code: string) => {
    setError(null);
    try {
      const { error: invokeError } = await supabase.functions.invoke('judge-access', { body: { code } });
      if (invokeError) throw invokeError;
      // RevenueCat remains the authority: refresh its customer record after server-side grant.
      await Purchases.invalidateCustomerInfoCache();
      const info = await Purchases.getCustomerInfo();
      setIsPro(hasPro(info));
      if (!hasPro(info)) throw new Error('Judge access was granted but has not synced yet. Tap refresh to try again.');
    } catch (e) {
      const message = e instanceof Error ? e.message : 'That judge code could not be activated.';
      setError(message);
      throw e;
    }
  }, []);

  const clearError = useCallback(() => setError(null), []);
  const value = useMemo(() => ({ status, isPro, offering, error, purchase, manageSubscription, restore, redeemJudgeCode, refresh, clearError }),
    [status, isPro, offering, error, purchase, manageSubscription, restore, redeemJudgeCode, refresh, clearError]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useMonetization() {
  const context = useContext(Context);
  if (!context) throw new Error('useMonetization must be used inside <MonetizationProvider>');
  return context;
}
