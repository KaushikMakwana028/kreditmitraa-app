// screens/SplashScreen.jsx
import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Image, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { CommonActions } from '@react-navigation/native';
import { COLORS } from '../constants/colors';
import { FONTS } from '../constants/fonts';
import { getToken } from '../services/utils/storage';
import { useUser } from '../context/UserContext'; // ← ADD

export default function SplashScreen({ navigation }) {
    const { loadUser } = useUser(); // ← ADD

    useEffect(() => {
        checkAuthStatus();
    }, []);

    const checkAuthStatus = async () => {
        try {
            // Wait a bit for splash animation
            await new Promise(resolve => setTimeout(resolve, 2000));

            // Check if token exists
            const token = await getToken();

            if (token) {
                // ✅ Load user data from storage into context
                const userData = await loadUser();

                if (userData) {
                    console.log('✅ User authenticated, navigating to Dashboard');
                    // User is authenticated, go to main app
                    navigation.dispatch(
                        CommonActions.reset({
                            index: 0,
                            routes: [{ name: 'MainTabs' }],
                        })
                    );
                } else {
                    // Token exists but no user data - go to login
                    console.log('⚠️ Token exists but no user data, navigating to Login');
                    navigation.dispatch(
                        CommonActions.reset({
                            index: 0,
                            routes: [{ name: 'Login' }],
                        })
                    );
                }
            } else {
                console.log('ℹ️ No token found, navigating to Login');
                // No token, go to login
                navigation.dispatch(
                    CommonActions.reset({
                        index: 0,
                        routes: [{ name: 'Login' }],
                    })
                );
            }
        } catch (error) {
            console.error('Error checking auth status:', error);
            // On error, navigate to login
            navigation.dispatch(
                CommonActions.reset({
                    index: 0,
                    routes: [{ name: 'Login' }],
                })
            );
        }
    };

    return (
        <LinearGradient
            colors={[COLORS.primary, '#145C4D', '#0D4037']}
            style={styles.container}
        >
            {/* Logo */}
            <View style={styles.logoContainer}>
                <Image
                    source={require('../../assets/logo.png')}
                    style={styles.logo}
                    resizeMode="contain"
                />
            </View>

            {/* App Name */}
            <Text style={styles.appName}>KreditMitraa</Text>
            <Text style={styles.tagline}>Your Financial Partner</Text>

            {/* Loading Indicator */}
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#FFFFFF" />
                <Text style={styles.loadingText}>Loading...</Text>
            </View>

            {/* Version */}
            <Text style={styles.version}>Version 1.0.0</Text>
        </LinearGradient>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    logoContainer: {
        width: 140,
        height: 140,
        borderRadius: 70,
        backgroundColor: 'rgba(255, 255, 255, 0.15)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 30,
        elevation: 8,
        shadowColor: '#000',
        shadowOpacity: 0.3,
        shadowRadius: 15,
        shadowOffset: { width: 0, height: 8 },
    },
    logo: {
        width: 100,
        height: 100,
    },
    appName: {
        fontFamily: FONTS.bold,
        fontSize: 32,
        color: '#FFFFFF',
        marginBottom: 8,
        letterSpacing: 1,
    },
    tagline: {
        fontFamily: FONTS.regular,
        fontSize: 16,
        color: 'rgba(255, 255, 255, 0.85)',
        marginBottom: 60,
    },
    loadingContainer: {
        alignItems: 'center',
        marginBottom: 40,
    },
    loadingText: {
        fontFamily: FONTS.medium,
        fontSize: 14,
        color: 'rgba(255, 255, 255, 0.9)',
        marginTop: 12,
    },
    version: {
        position: 'absolute',
        bottom: 30,
        fontFamily: FONTS.regular,
        fontSize: 12,
        color: 'rgba(255, 255, 255, 0.6)',
    },
});