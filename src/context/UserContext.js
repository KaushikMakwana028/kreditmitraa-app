// src/context/UserContext.js
import React, { createContext, useContext, useState, useCallback } from 'react';
import { getUserData, saveUserData, updateStoredProfileImage } from '../services/utils/storage';

const UserContext = createContext(null);
const BASE_URL = 'https://moneymitraa.com/';

export function UserProvider({ children }) {
    const [user, setUser] = useState(null);

    /**
     * Normalize profile image URL
     */
    const normalizeImageUrl = (imageUrl) => {
        if (!imageUrl) return null;
        if (imageUrl.startsWith('http')) return imageUrl;
        if (imageUrl.startsWith('data:')) return imageUrl; // base64
        return BASE_URL + imageUrl;
    };

    /**
     * Load user from AsyncStorage
     */
    const loadUser = useCallback(async () => {
        try {
            const stored = await getUserData();
            if (stored) {
                const normalized = {
                    ...stored,
                    profile_image: normalizeImageUrl(stored.profile_image),
                };
                setUser(normalized);
                console.log('📦 User loaded from storage:', normalized.name, normalized.profile_image ? '(with image)' : '(no image)');
                return normalized;
            }
            return null;
        } catch (error) {
            console.error('❌ Error loading user:', error);
            return null;
        }
    }, []);

    /**
     * Set user data in state + storage
     * @param {Object} userData
     */
    const updateUser = useCallback(async (userData) => {
        if (!userData) return;

        const normalized = {
            ...userData,
            profile_image: normalizeImageUrl(userData.profile_image),
        };

        setUser(normalized);
        await saveUserData(normalized);
        console.log('💾 User updated in context:', normalized.name, normalized.profile_image ? '(with image)' : '(no image)');
    }, []);

    /**
     * Update only profile image URL
     * @param {string} imageUrl
     */
    const updateProfileImage = useCallback(async (imageUrl) => {
        if (!imageUrl) return;

        const normalizedUrl = normalizeImageUrl(imageUrl);

        setUser(prev => {
            if (!prev) return prev;
            const updated = { ...prev, profile_image: normalizedUrl };
            console.log('🖼️ Profile image updated:', normalizedUrl);
            return updated;
        });
        await updateStoredProfileImage(normalizedUrl);
    }, []);

    /**
     * Clear user (logout)
     */
    const clearUser = useCallback(() => {
        setUser(null);
        console.log('🧹 User cleared from context');
    }, []);

    return (
        <UserContext.Provider value={{
            user,
            loadUser,
            updateUser,
            updateProfileImage,
            clearUser,
        }}>
            {children}
        </UserContext.Provider>
    );
}

export function useUser() {
    const context = useContext(UserContext);
    if (!context) {
        throw new Error('useUser must be used within a UserProvider');
    }
    return context;
}