import Purchases, {
    PurchasesOffering,
    CustomerInfo,
    PurchasesPackage,
} from 'react-native-purchases';
import { Platform } from 'react-native';

// ============================================================================
// CONFIGURATION
// ============================================================================

const API_KEYS = {
    ios: 'test_lPoLbFyowpJiuiMThnesLPYifqI',      // Replace with your iOS key
    android: 'test_lPoLbFyowpJiuiMThnesLPYifqI',  // Replace with your Android key
};

const ENTITLEMENT_ID = 'SafePath Pro';

// ============================================================================
// INITIALIZATION
// ============================================================================

export const initializeRevenueCat = async (userId?: string): Promise<void> => {
    try {
        const apiKey = Platform.select({
            ios: API_KEYS.ios,
            android: API_KEYS.android,
        });

        if (!apiKey) {
            throw new Error('No API key for platform');
        }

        await Purchases.configure({
            apiKey,
            appUserID: userId,
        });

        //console.log('✅ RevenueCat initialized');
    } catch (error) {
        //console.error('❌ RevenueCat initialization failed:', error);
    }
};

// ============================================================================
// USER IDENTIFICATION
// ============================================================================

export const identifyUser = async (userId: string): Promise<void> => {
    try {
        await Purchases.logIn(userId);
        //console.log('✅ User identified with RevenueCat:', userId);
    } catch (error) {
        console.error('❌ Failed to identify user:', error);
    }
};

export const logoutUser = async (): Promise<void> => {
    try {
        await Purchases.logOut();
        //console.log('✅ User logged out from RevenueCat');
    } catch (error) {
        console.error('❌ Failed to logout user:', error);
    }
};

// ============================================================================
// SUBSCRIPTION STATUS
// ============================================================================

export const checkPremiumStatus = async (): Promise<boolean> => {
    try {
        const customerInfo = await Purchases.getCustomerInfo();
        return customerInfo.entitlements.active[ENTITLEMENT_ID] !== undefined;
    } catch (error) {
        console.error('❌ Failed to check premium status:', error);
        return false;
    }
};

export const getCustomerInfo = async (): Promise<CustomerInfo | null> => {
    try {
        return await Purchases.getCustomerInfo();
    } catch (error) {
        console.error('❌ Failed to get customer info:', error);
        return null;
    }
};

// ============================================================================
// OFFERINGS (PRODUCTS)
// ============================================================================

export const getOfferings = async (): Promise<PurchasesOffering | null> => {
    try {
        const offerings = await Purchases.getOfferings();
        return offerings.current;
    } catch (error) {
        console.error('❌ Failed to get offerings:', error);
        return null;
    }
};

// ============================================================================
// PURCHASES
// ============================================================================

export const purchasePackage = async (
    pkg: PurchasesPackage
): Promise<{ success: boolean; customerInfo?: CustomerInfo; error?: string }> => {
    try {
        const { customerInfo } = await Purchases.purchasePackage(pkg);
        const isPremium = customerInfo.entitlements.active[ENTITLEMENT_ID] !== undefined;

        if (isPremium) {
            //console.log('✅ Purchase successful');
            return { success: true, customerInfo };
        } else {
            return { success: false, error: 'Purchase completed but entitlement not active' };
        }
    } catch (error: any) {
        if (error.userCancelled) {
            return { success: false, error: 'User cancelled' };
        }
        console.error('❌ Purchase failed:', error);
        return { success: false, error: error.message };
    }
};

// ============================================================================
// RESTORE PURCHASES
// ============================================================================

export const restorePurchases = async (): Promise<{
    success: boolean;
    isPremium: boolean;
    error?: string;
}> => {
    try {
        const customerInfo = await Purchases.restorePurchases();
        const isPremium = customerInfo.entitlements.active[ENTITLEMENT_ID] !== undefined;

        //console.log('✅ Purchases restored, premium:', isPremium);
        return { success: true, isPremium };
    } catch (error: any) {
        console.error('❌ Restore failed:', error);
        return { success: false, isPremium: false, error: error.message };
    }
};

// ============================================================================
// SUBSCRIPTION LISTENER
// ============================================================================

export const addCustomerInfoListener = (
    callback: (customerInfo: CustomerInfo) => void
): (() => void) => {
    Purchases.addCustomerInfoUpdateListener(callback);

    return () => {
        // RevenueCat SDK handles cleanup internally
    };
};