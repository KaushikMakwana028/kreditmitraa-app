import AsyncStorage from '@react-native-async-storage/async-storage';

// Storage keys
const STORAGE_KEYS = {
    TOKEN: '@kreditmitraa_auth_token',
    USER: '@kreditmitraa_user_data',
    ONBOARDING: '@kreditmitraa_onboarding_complete',
};

// ─── Token Management ─────────────────────────────────────────────────────────

/**
 * Save authentication token
 * @param {string} token
 */
export const saveToken = async (token) => {
    try {
        if (!token) {
            console.warn('Attempted to save null/undefined token');
            return false;
        }
        await AsyncStorage.setItem(STORAGE_KEYS.TOKEN, token);
        console.log('✅ Token saved successfully');
        return true;
    } catch (error) {
        console.error('❌ Error saving token:', error);
        return false;
    }
};

/**
 * Get authentication token
 * @returns {Promise<string|null>}
 */
export const getToken = async () => {
    try {
        const token = await AsyncStorage.getItem(STORAGE_KEYS.TOKEN);
        if (token) {
            console.log('✅ Token retrieved');
        } else {
            console.log('ℹ️ No token found');
        }
        return token;
    } catch (error) {
        console.error('❌ Error getting token:', error);
        return null;
    }
};

/**
 * Clear authentication token
 */
export const clearToken = async () => {
    try {
        await AsyncStorage.removeItem(STORAGE_KEYS.TOKEN);
        console.log('✅ Token cleared');
        return true;
    } catch (error) {
        console.error('❌ Error clearing token:', error);
        return false;
    }
};

// ─── User Data Management ─────────────────────────────────────────────────────

/**
 * Save user data
 * @param {Object} userData
 */
export const saveUserData = async (userData) => {
    try {
        if (!userData) {
            console.warn('Attempted to save null/undefined user data');
            return false;
        }
        await AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(userData));
        console.log('✅ User data saved successfully');
        return true;
    } catch (error) {
        console.error('❌ Error saving user data:', error);
        return false;
    }
};

/**
 * Get user data
 * @returns {Promise<Object|null>}
 */
export const getUserData = async () => {
    try {
        const userData = await AsyncStorage.getItem(STORAGE_KEYS.USER);
        if (userData) {
            console.log('✅ User data retrieved');
            return JSON.parse(userData);
        }
        console.log('ℹ️ No user data found');
        return null;
    } catch (error) {
        console.error('❌ Error getting user data:', error);
        return null;
    }
};

/**
 * Clear user data
 */
export const clearUserData = async () => {
    try {
        await AsyncStorage.removeItem(STORAGE_KEYS.USER);
        console.log('✅ User data cleared');
        return true;
    } catch (error) {
        console.error('❌ Error clearing user data:', error);
        return false;
    }
};

/**
 * Update only profile image in stored user data
 * @param {string} imageUrl
 */
export const updateStoredProfileImage = async (imageUrl) => {
    try {
        const userData = await getUserData();
        if (userData) {
            const updated = { ...userData, profile_image: imageUrl };
            await saveUserData(updated);
            return true;
        }
        return false;
    } catch (error) {
        console.error('❌ Error updating profile image:', error);
        return false;
    }
};

// ─── Clear All Data ───────────────────────────────────────────────────────────

/**
 * Clear all stored data (logout)
 */
export const clearAllData = async () => {
    try {
        await AsyncStorage.multiRemove([STORAGE_KEYS.TOKEN, STORAGE_KEYS.USER]);
        console.log('✅ All data cleared');
        return true;
    } catch (error) {
        console.error('❌ Error clearing all data:', error);
        return false;
    }
};

// ─── Onboarding ───────────────────────────────────────────────────────────────

/**
 * Mark onboarding as complete
 */
export const setOnboardingComplete = async () => {
    try {
        await AsyncStorage.setItem(STORAGE_KEYS.ONBOARDING, 'true');
        return true;
    } catch (error) {
        console.error('Error setting onboarding:', error);
        return false;
    }
};

/**
 * Check if onboarding is complete
 * @returns {Promise<boolean>}
 */
export const isOnboardingComplete = async () => {
    try {
        const value = await AsyncStorage.getItem(STORAGE_KEYS.ONBOARDING);
        return value === 'true';
    } catch (error) {
        console.error('Error checking onboarding:', error);
        return false;
    }
};

/**
 * Debug: Get all stored keys
 */
export const getAllKeys = async () => {
    try {
        const keys = await AsyncStorage.getAllKeys();
        console.log('📦 All stored keys:', keys);
        return keys;
    } catch (error) {
        console.error('Error getting keys:', error);
        return [];
    }
};

/**
 * Debug: Clear all AsyncStorage
 */
export const clearAllStorage = async () => {
    try {
        await AsyncStorage.clear();
        console.log('🗑️ All storage cleared');
        return true;
    } catch (error) {
        console.error('Error clearing storage:', error);
        return false;
    }
};