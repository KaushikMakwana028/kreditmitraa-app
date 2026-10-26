// screens/OtpVerificationScreen.jsx
import React, { useState, useRef, useEffect } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    TextInput,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '../constants/colors';
import { FONTS } from '../constants/fonts';
import { loginVerifyOtp, registerVerifyOtp } from '../services/api/authService';
import { handleApiError, showError } from '../services/utils/errorHandler';
import { useUser } from '../context/UserContext'; // ← ADD

const OTP_LENGTH = 6;

export default function OtpVerificationScreen({ navigation, route }) {
    const insets = useSafeAreaInsets();
    const { updateUser } = useUser(); // ← ADD

    // Route params
    const {
        mobile,
        isLogin = false,
        name,
        email,
        referralCode,
    } = route.params || {};

    const [otp, setOtp] = useState(['', '', '', '', '', '']);
    const [loading, setLoading] = useState(false);
    const [resendLoading, setResendLoading] = useState(false);
    const [timer, setTimer] = useState(30);
    const [canResend, setCanResend] = useState(false);

    const inputRefs = useRef([]);
    const shakeAnim = useRef(new Animated.Value(0)).current;
    const fadeAnim = useRef(new Animated.Value(0)).current;

    // ── Fade in on mount ──────────────────────────────────────────────────────
    useEffect(() => {
        Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
        }).start();
    }, []);

    // ── Countdown Timer ───────────────────────────────────────────────────────
    useEffect(() => {
        if (timer <= 0) {
            setCanResend(true);
            return;
        }
        const interval = setInterval(() => {
            setTimer(prev => {
                if (prev <= 1) {
                    setCanResend(true);
                    clearInterval(interval);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(interval);
    }, [timer]);

    // ── Shake Animation ───────────────────────────────────────────────────────
    const triggerShake = () => {
        Animated.sequence([
            Animated.timing(shakeAnim, { toValue: 10, duration: 60, useNativeDriver: true }),
            Animated.timing(shakeAnim, { toValue: -10, duration: 60, useNativeDriver: true }),
            Animated.timing(shakeAnim, { toValue: 10, duration: 60, useNativeDriver: true }),
            Animated.timing(shakeAnim, { toValue: 0, duration: 60, useNativeDriver: true }),
        ]).start();
    };

    // ── OTP Input Handler ─────────────────────────────────────────────────────
    const handleOtpChange = (value, index) => {
        // Allow only digits
        const cleaned = value.replace(/[^0-9]/g, '');
        const newOtp = [...otp];

        if (cleaned.length > 1) {
            // Handle paste
            const digits = cleaned.slice(0, OTP_LENGTH).split('');
            digits.forEach((d, i) => {
                if (index + i < OTP_LENGTH) newOtp[index + i] = d;
            });
            setOtp(newOtp);
            const nextIndex = Math.min(index + digits.length, OTP_LENGTH - 1);
            inputRefs.current[nextIndex]?.focus();
            return;
        }

        newOtp[index] = cleaned;
        setOtp(newOtp);

        // Auto-advance
        if (cleaned && index < OTP_LENGTH - 1) {
            inputRefs.current[index + 1]?.focus();
        }
    };

    const handleKeyPress = (e, index) => {
        if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
            inputRefs.current[index - 1]?.focus();
        }
    };

    // ── Verify OTP ────────────────────────────────────────────────────────────
    const handleVerify = async () => {
        const otpString = otp.join('');
        if (otpString.length !== OTP_LENGTH) {
            showError('Please enter the complete 6-digit OTP.');
            triggerShake();
            return;
        }

        setLoading(true);
        try {
            let result;
            if (isLogin) {
                result = await loginVerifyOtp(mobile, otpString);
            } else {
                result = await registerVerifyOtp(mobile, otpString);
            }

            if (result.success) {
                // ── Save user into context (profile_image included) ──
                if (result.user) {
                    await updateUser(result.user); // ← ADD
                }
                navigation.replace('MainTabs');
            } else {
                showError(result.message || 'Invalid OTP. Please try again.');
                triggerShake();
                setOtp(['', '', '', '', '', '']);
                inputRefs.current[0]?.focus();
            }
        } catch (err) {
            handleApiError(err);
            triggerShake();
        } finally {
            setLoading(false);
        }
    };

    // ── Resend OTP ────────────────────────────────────────────────────────────
    const handleResend = async () => {
        if (!canResend) return;
        setResendLoading(true);
        try {
            // Re-use the same send OTP function based on flow
            const { loginSendOtp, registerSendOtp } = require('../services/api/authService');
            let result;
            if (isLogin) {
                result = await loginSendOtp(mobile);
            } else {
                result = await registerSendOtp({ name, mobile, email, referralCode });
            }

            if (result.success) {
                setOtp(['', '', '', '', '', '']);
                setTimer(30);
                setCanResend(false);
                inputRefs.current[0]?.focus();
            } else {
                showError(result.message || 'Failed to resend OTP.');
            }
        } catch (err) {
            handleApiError(err);
        } finally {
            setResendLoading(false);
        }
    };

    const otpFilled = otp.join('').length === OTP_LENGTH;

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
            {/* Header Gradient */}
            <LinearGradient
                colors={[COLORS.primary, '#1a6fd4']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[styles.headerGradient, { paddingTop: insets.top + 16 }]}
            >
                {/* Back Button */}
                <TouchableOpacity
                    style={styles.backBtn}
                    onPress={() => navigation.goBack()}
                    activeOpacity={0.7}
                >
                    <Ionicons name="arrow-back" size={22} color="#fff" />
                </TouchableOpacity>

                {/* Decorative Bubbles */}
                <View style={styles.bubble1} />
                <View style={styles.bubble2} />

                {/* Icon */}
                <View style={styles.headerIconWrap}>
                    <Ionicons name="shield-checkmark" size={36} color="#fff" />
                </View>
                <Text style={styles.headerTitle}>OTP Verification</Text>
                <Text style={styles.headerSubtitle}>
                    Enter the 6-digit code sent to
                </Text>
                <Text style={styles.headerMobile}>+91 {mobile}</Text>
            </LinearGradient>

            <ScrollView
                style={styles.body}
                contentContainerStyle={[
                    styles.bodyContent,
                    { paddingBottom: insets.bottom + 32 },
                ]}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
            >
                <Animated.View style={{ opacity: fadeAnim }}>
                    {/* OTP Boxes */}
                    <Animated.View
                        style={[
                            styles.otpRow,
                            { transform: [{ translateX: shakeAnim }] },
                        ]}
                    >
                        {otp.map((digit, index) => (
                            <TextInput
                                key={index}
                                ref={ref => (inputRefs.current[index] = ref)}
                                style={[
                                    styles.otpBox,
                                    digit ? styles.otpBoxFilled : null,
                                ]}
                                value={digit}
                                onChangeText={val => handleOtpChange(val, index)}
                                onKeyPress={e => handleKeyPress(e, index)}
                                keyboardType="number-pad"
                                maxLength={OTP_LENGTH}
                                textContentType="oneTimeCode"
                                selectTextOnFocus
                                autoFocus={index === 0}
                            />
                        ))}
                    </Animated.View>

                    {/* Timer / Resend */}
                    <View style={styles.resendRow}>
                        {canResend ? (
                            <TouchableOpacity
                                onPress={handleResend}
                                disabled={resendLoading}
                                activeOpacity={0.7}
                            >
                                {resendLoading ? (
                                    <ActivityIndicator size="small" color={COLORS.primary} />
                                ) : (
                                    <Text style={styles.resendActive}>
                                        Resend OTP
                                    </Text>
                                )}
                            </TouchableOpacity>
                        ) : (
                            <Text style={styles.resendTimer}>
                                Resend OTP in{' '}
                                <Text style={styles.resendTimerBold}>
                                    {timer}s
                                </Text>
                            </Text>
                        )}
                    </View>

                    {/* Verify Button */}
                    <TouchableOpacity
                        style={[
                            styles.verifyBtn,
                            (!otpFilled || loading) && styles.verifyBtnDisabled,
                        ]}
                        onPress={handleVerify}
                        activeOpacity={0.85}
                        disabled={!otpFilled || loading}
                    >
                        <LinearGradient
                            colors={
                                otpFilled && !loading
                                    ? [COLORS.primary, '#1a6fd4']
                                    : ['#9CA3AF', '#6B7280']
                            }
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={styles.verifyBtnGradient}
                        >
                            {loading ? (
                                <ActivityIndicator size="small" color="#fff" />
                            ) : (
                                <>
                                    <Ionicons
                                        name="checkmark-circle-outline"
                                        size={20}
                                        color="#fff"
                                    />
                                    <Text style={styles.verifyBtnText}>
                                        Verify OTP
                                    </Text>
                                </>
                            )}
                        </LinearGradient>
                    </TouchableOpacity>

                    {/* Info */}
                    <View style={styles.infoCard}>
                        <Ionicons
                            name="information-circle-outline"
                            size={18}
                            color={COLORS.primary}
                        />
                        <Text style={styles.infoText}>
                            The OTP is valid for 10 minutes. Do not share it with anyone.
                        </Text>
                    </View>
                </Animated.View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },

    // ── Header ─────────────────────────────────────────────────────────────────
    headerGradient: {
        paddingHorizontal: 24,
        paddingBottom: 40,
        alignItems: 'center',
        overflow: 'hidden',
    },
    backBtn: {
        position: 'absolute',
        left: 20,
        top: 52,
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.15)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 10,
    },
    bubble1: {
        position: 'absolute',
        width: 160,
        height: 160,
        borderRadius: 80,
        backgroundColor: 'rgba(255,255,255,0.07)',
        top: -50,
        right: -40,
    },
    bubble2: {
        position: 'absolute',
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: 'rgba(255,255,255,0.05)',
        bottom: -30,
        left: 10,
    },
    headerIconWrap: {
        width: 72,
        height: 72,
        borderRadius: 36,
        backgroundColor: 'rgba(255,255,255,0.15)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 14,
        borderWidth: 2,
        borderColor: 'rgba(255,255,255,0.3)',
    },
    headerTitle: {
        fontFamily: FONTS.bold,
        fontSize: 24,
        color: '#fff',
        marginBottom: 6,
    },
    headerSubtitle: {
        fontFamily: FONTS.regular,
        fontSize: 13,
        color: 'rgba(255,255,255,0.8)',
        marginBottom: 4,
    },
    headerMobile: {
        fontFamily: FONTS.bold,
        fontSize: 16,
        color: '#fff',
    },

    // ── Body ───────────────────────────────────────────────────────────────────
    body: {
        flex: 1,
        marginTop: -20,
    },
    bodyContent: {
        backgroundColor: COLORS.background,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingHorizontal: 24,
        paddingTop: 32,
    },

    // ── OTP Row ────────────────────────────────────────────────────────────────
    otpRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 24,
    },
    otpBox: {
        width: 48,
        height: 56,
        borderWidth: 1.5,
        borderColor: '#E5E7EB',
        borderRadius: 12,
        textAlign: 'center',
        fontSize: 22,
        fontFamily: FONTS.bold,
        color: COLORS.black,
        backgroundColor: '#fff',
    },
    otpBoxFilled: {
        borderColor: COLORS.primary,
        backgroundColor: COLORS.primary + '10',
        color: COLORS.primary,
    },

    // ── Resend ─────────────────────────────────────────────────────────────────
    resendRow: {
        alignItems: 'center',
        marginBottom: 28,
    },
    resendTimer: {
        fontFamily: FONTS.regular,
        fontSize: 13,
        color: '#6B7280',
    },
    resendTimerBold: {
        fontFamily: FONTS.bold,
        color: COLORS.primary,
    },
    resendActive: {
        fontFamily: FONTS.semiBold,
        fontSize: 14,
        color: COLORS.primary,
        textDecorationLine: 'underline',
    },

    // ── Verify Button ──────────────────────────────────────────────────────────
    verifyBtn: {
        borderRadius: 14,
        overflow: 'hidden',
        marginBottom: 20,
        elevation: 4,
        shadowColor: COLORS.primary,
        shadowOpacity: 0.3,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 4 },
    },
    verifyBtnDisabled: {
        elevation: 0,
        shadowOpacity: 0,
    },
    verifyBtnGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 16,
    },
    verifyBtnText: {
        fontFamily: FONTS.bold,
        fontSize: 16,
        color: '#fff',
    },

    // ── Info Card ──────────────────────────────────────────────────────────────
    infoCard: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 10,
        backgroundColor: COLORS.primary + '10',
        borderRadius: 12,
        padding: 14,
        borderWidth: 1,
        borderColor: COLORS.primary + '30',
    },
    infoText: {
        flex: 1,
        fontFamily: FONTS.regular,
        fontSize: 12,
        color: '#374151',
        lineHeight: 18,
    },
});