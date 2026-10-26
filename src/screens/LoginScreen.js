import React, { useState } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    ActivityIndicator,
    Image,
    Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/colors';
import { FONTS } from '../constants/fonts';
import { loginSendOtp } from '../services/api/authService';
import { handleApiError, showError } from '../services/utils/errorHandler';

export default function LoginScreen({ navigation }) {
    const [mobile, setMobile] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [focused, setFocused] = useState(false);

    const validate = () => {
        if (!mobile.trim()) {
            setError('Mobile number is required');
            return false;
        }
        if (!/^[6-9]\d{9}$/.test(mobile.trim())) {
            setError('Enter a valid 10-digit mobile number');
            return false;
        }
        setError('');
        return true;
    };

    const handleSendOtp = async () => {
        if (!validate()) return;

        setLoading(true);

        try {
            const result = await loginSendOtp(mobile.trim());

            if (result.success) {
                // Navigate directly without alert
                navigation.navigate('OtpVerification', {
                    mobile: mobile.trim(),
                    isLogin: true,
                });
            } else {
                showError(result.message);
            }
        } catch (err) {
            handleApiError(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                style={{ flex: 1 }}
            >
                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                >
                    {/* Logo Section */}
                    <View style={styles.logoContainer}>
                        <View style={styles.logoShadowWrapper}>
                            <Image
                                source={require('../../assets/logo.png')}
                                style={styles.logoImage}
                                resizeMode="contain"
                            />
                        </View>
                        <Text style={styles.brandName}>Kreditmitraa</Text>
                        <View style={styles.taglineRow}>
                            <View style={styles.taglineLine} />
                            <Text style={styles.tagline}>Your Trusted Credit Partner</Text>
                            <View style={styles.taglineLine} />
                        </View>
                    </View>

                    {/* Form Card */}
                    <View style={styles.formCard}>
                        <View style={styles.cardAccentBar} />

                        <Text style={styles.title}>Welcome Back 👋</Text>
                        <Text style={styles.subtitle}>
                            Enter your mobile number to continue
                        </Text>

                        <View style={styles.divider} />

                        <Text style={styles.label}>Mobile Number</Text>
                        <View
                            style={[
                                styles.inputWrapper,
                                focused && styles.inputWrapperFocused,
                                error && styles.inputWrapperError,
                            ]}
                        >
                            <Ionicons
                                name="call-outline"
                                size={18}
                                color={focused ? COLORS.primary : COLORS.gray}
                                style={styles.inputIcon}
                            />
                            <View style={styles.countryCodeWrapper}>
                                <Text style={styles.countryCode}>+91</Text>
                            </View>
                            <View style={styles.countryCodeDivider} />
                            <TextInput
                                style={styles.input}
                                placeholder="Enter mobile number"
                                placeholderTextColor={COLORS.gray}
                                value={mobile}
                                onChangeText={(text) => {
                                    setMobile(text.replace(/[^0-9]/g, ''));
                                    if (error) setError('');
                                }}
                                onFocus={() => setFocused(true)}
                                onBlur={() => setFocused(false)}
                                keyboardType="number-pad"
                                maxLength={10}
                                autoFocus
                                editable={!loading}
                            />
                            {mobile.length === 10 && !error && (
                                <Ionicons
                                    name="checkmark-circle"
                                    size={18}
                                    color={COLORS.success || '#22c55e'}
                                />
                            )}
                        </View>

                        {error ? (
                            <View style={styles.errorRow}>
                                <Ionicons
                                    name="alert-circle-outline"
                                    size={13}
                                    color={COLORS.error}
                                />
                                <Text style={styles.errorText}>{error}</Text>
                            </View>
                        ) : null}

                        <TouchableOpacity
                            style={[styles.button, loading && styles.buttonDisabled]}
                            onPress={handleSendOtp}
                            disabled={loading}
                            activeOpacity={0.85}
                        >
                            {loading ? (
                                <ActivityIndicator color={COLORS.white} />
                            ) : (
                                <View style={styles.buttonContent}>
                                    <Text style={styles.buttonText}>Send OTP</Text>
                                    <Ionicons
                                        name="arrow-forward"
                                        size={18}
                                        color={COLORS.white}
                                        style={{ marginLeft: 6 }}
                                    />
                                </View>
                            )}
                        </TouchableOpacity>

                        <View style={styles.footer}>
                            <Text style={styles.footerText}>Don't have an account? </Text>
                            <TouchableOpacity onPress={() => navigation.navigate('Signup')}>
                                <Text style={styles.footerLink}>Sign Up</Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    <Text style={styles.termsText}>
                        By continuing, you agree to our{' '}
                        <Text style={styles.termsLink}>Terms of Service</Text> &{' '}
                        <Text style={styles.termsLink}>Privacy Policy</Text>
                    </Text>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    scrollContent: {
        flexGrow: 1,
        paddingHorizontal: 20,
        paddingVertical: 30,
        marginTop: 20,
    },

    // ── Logo ──────────────────────────────────────────
    logoContainer: {
        alignItems: 'center',
        marginBottom: 28,
    },
    logoShadowWrapper: {
        shadowColor: COLORS.primary,
        shadowOpacity: 0.18,
        shadowRadius: 16,
        shadowOffset: { width: 0, height: 6 },
        elevation: 6,
        borderRadius: 100,
        marginBottom: 12,
    },
    logoImage: {
        width: 110,
        height: 110,
        borderRadius: 100,
    },
    brandName: {
        fontFamily: FONTS.bold,
        fontSize: 24,
        color: COLORS.primary,
        letterSpacing: 0.4,
    },
    taglineRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 6,
        gap: 8,
    },
    taglineLine: {
        height: 1,
        width: 30,
        backgroundColor: COLORS.border,
    },
    tagline: {
        fontFamily: FONTS.regular,
        fontSize: 12,
        color: COLORS.gray,
    },

    // ── Form Card ─────────────────────────────────────
    formCard: {
        backgroundColor: COLORS.white,
        borderRadius: 20,
        paddingHorizontal: 24,
        paddingBottom: 24,
        paddingTop: 0,
        elevation: 4,
        shadowColor: '#000',
        shadowOpacity: 0.08,
        shadowRadius: 14,
        shadowOffset: { width: 0, height: 4 },
        overflow: 'hidden',
    },
    cardAccentBar: {
        height: 4,
        backgroundColor: COLORS.primary,
        marginHorizontal: -24,
        marginBottom: 20,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
    },
    title: {
        fontFamily: FONTS.semiBold,
        fontSize: 22,
        color: COLORS.black,
        marginBottom: 4,
    },
    subtitle: {
        fontFamily: FONTS.regular,
        fontSize: 13,
        color: COLORS.gray,
        marginBottom: 16,
    },
    divider: {
        height: 1,
        backgroundColor: COLORS.border,
        marginBottom: 20,
        opacity: 0.6,
    },
    label: {
        fontFamily: FONTS.medium,
        fontSize: 13,
        color: COLORS.black,
        marginBottom: 8,
    },

    // ── Input ─────────────────────────────────────────
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1.5,
        borderColor: COLORS.border,
        borderRadius: 12,
        paddingHorizontal: 12,
        backgroundColor: COLORS.background,
        minHeight: 50,
    },
    inputWrapperFocused: {
        borderColor: COLORS.primary,
        backgroundColor: COLORS.white,
    },
    inputWrapperError: {
        borderColor: COLORS.error,
        backgroundColor: '#fff5f5',
    },
    inputIcon: {
        marginRight: 6,
    },
    countryCodeWrapper: {
        paddingRight: 8,
    },
    countryCode: {
        fontFamily: FONTS.medium,
        fontSize: 14,
        color: COLORS.black,
    },
    countryCodeDivider: {
        width: 1,
        height: 18,
        backgroundColor: COLORS.border,
        marginRight: 10,
    },
    input: {
        flex: 1,
        paddingVertical: 13,
        fontFamily: FONTS.regular,
        fontSize: 14,
        color: COLORS.black,
    },

    // ── Error ─────────────────────────────────────────
    errorRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 5,
        marginLeft: 2,
        gap: 4,
    },
    errorText: {
        fontFamily: FONTS.regular,
        fontSize: 11,
        color: COLORS.error,
    },

    // ── Button ────────────────────────────────────────
    button: {
        backgroundColor: COLORS.primary,
        borderRadius: 12,
        paddingVertical: 15,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 22,
        marginBottom: 20,
        elevation: 3,
        shadowColor: COLORS.primary,
        shadowOpacity: 0.35,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 4 },
    },
    buttonDisabled: {
        opacity: 0.75,
    },
    buttonContent: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    buttonText: {
        fontFamily: FONTS.semiBold,
        fontSize: 16,
        color: COLORS.white,
    },

    // ── Footer ────────────────────────────────────────
    footer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
    },
    footerText: {
        fontFamily: FONTS.regular,
        fontSize: 13,
        color: COLORS.gray,
    },
    footerLink: {
        fontFamily: FONTS.semiBold,
        fontSize: 13,
        color: COLORS.primary,
    },
    termsText: {
        fontFamily: FONTS.regular,
        fontSize: 11,
        color: COLORS.gray,
        textAlign: 'center',
        marginTop: 24,
        lineHeight: 18,
    },
    termsLink: {
        fontFamily: FONTS.medium,
        color: COLORS.accent,
    },
});