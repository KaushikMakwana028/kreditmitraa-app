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
import { registerSendOtp } from '../services/api/authService';
import { handleApiError, showError } from '../services/utils/errorHandler';

export default function SignupScreen({ navigation }) {
    const [name, setName] = useState('');
    const [mobile, setMobile] = useState('');
    const [email, setEmail] = useState('');
    const [referralCode, setReferralCode] = useState('');
    const [agreeTerms, setAgreeTerms] = useState(false);
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState({});
    const [focusedField, setFocusedField] = useState('');

    const validate = () => {
        let newErrors = {};

        if (!name.trim()) {
            newErrors.name = 'Full name is required';
        } else if (name.trim().length < 3) {
            newErrors.name = 'Name must be at least 3 characters';
        }

        if (!mobile.trim()) {
            newErrors.mobile = 'Mobile number is required';
        } else if (!/^[6-9]\d{9}$/.test(mobile.trim())) {
            newErrors.mobile = 'Enter a valid 10-digit mobile number';
        }

        if (!email.trim()) {
            newErrors.email = 'Email is required';
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
            newErrors.email = 'Enter a valid email address';
        }

        if (!agreeTerms) {
            newErrors.terms = 'Please accept Terms & Privacy Policy';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSignup = async () => {
        if (!validate()) return;

        setLoading(true);

        try {
            const userData = {
                name: name.trim(),
                mobile: mobile.trim(),
                email: email.trim(),
            };

            // Add referral code if provided
            if (referralCode.trim()) {
                userData.referralCode = referralCode.trim();
            }

            const result = await registerSendOtp(userData);

            if (result.success) {
                // Show OTP hint in development/testing
                if (result.data?.otp_hint && __DEV__) {
                    Alert.alert(
                        'OTP Sent',
                        `${result.message}\n\n${result.data.otp_hint}`,
                        [{
                            text: 'OK',
                            onPress: () => navigation.navigate('OtpVerification', {
                                mobile: mobile.trim(),
                                isLogin: false,
                                userData,
                            })
                        }]
                    );
                } else {
                    Alert.alert('Success', result.message, [
                        {
                            text: 'OK',
                            onPress: () => navigation.navigate('OtpVerification', {
                                mobile: mobile.trim(),
                                isLogin: false,
                                userData,
                            })
                        }
                    ]);
                }
            } else {
                showError(result.message);
            }
        } catch (err) {
            handleApiError(err);
        } finally {
            setLoading(false);
        }
    };

    const getFieldValue = (field) => {
        if (field === 'name') return name;
        if (field === 'mobile') return mobile;
        if (field === 'email') return email;
        return referralCode;
    };

    const isFieldValid = (field) => {
        if (field === 'name') return name.trim().length >= 3;
        if (field === 'mobile') return /^[6-9]\d{9}$/.test(mobile.trim());
        if (field === 'email') return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
        return false;
    };

    const renderInput = ({
        field,
        label,
        placeholder,
        icon,
        keyboardType,
        maxLength,
        optional,
        prefix,
    }) => (
        <View style={{ marginBottom: 16 }}>
            <View style={styles.labelRow}>
                <Text style={styles.label}>{label}</Text>
                {optional && (
                    <View style={styles.optionalBadge}>
                        <Text style={styles.optionalTag}>Optional</Text>
                    </View>
                )}
            </View>

            <View
                style={[
                    styles.inputWrapper,
                    focusedField === field && styles.inputWrapperFocused,
                    errors[field] && styles.inputWrapperError,
                ]}
            >
                <Ionicons
                    name={icon}
                    size={18}
                    color={
                        errors[field]
                            ? COLORS.error
                            : focusedField === field
                                ? COLORS.primary
                                : COLORS.gray
                    }
                    style={styles.inputIcon}
                />

                {prefix ? (
                    <>
                        <Text style={styles.countryCode}>{prefix}</Text>
                        <View style={styles.countryCodeDivider} />
                    </>
                ) : null}

                <TextInput
                    style={styles.input}
                    placeholder={placeholder}
                    placeholderTextColor={COLORS.gray}
                    value={getFieldValue(field)}
                    onChangeText={(text) => {
                        if (field === 'name') setName(text);
                        else if (field === 'mobile') setMobile(text.replace(/[^0-9]/g, ''));
                        else if (field === 'email') setEmail(text);
                        else setReferralCode(text.toUpperCase());
                        if (errors[field]) setErrors({ ...errors, [field]: '' });
                    }}
                    onFocus={() => setFocusedField(field)}
                    onBlur={() => setFocusedField('')}
                    keyboardType={keyboardType || 'default'}
                    maxLength={maxLength}
                    autoCapitalize={
                        field === 'email'
                            ? 'none'
                            : field === 'referralCode'
                                ? 'characters'
                                : 'words'
                    }
                    editable={!loading}
                />

                {!optional && isFieldValid(field) && !errors[field] && (
                    <Ionicons
                        name="checkmark-circle"
                        size={18}
                        color={COLORS.success || '#22c55e'}
                    />
                )}
            </View>

            {errors[field] ? (
                <View style={styles.errorRow}>
                    <Ionicons name="alert-circle-outline" size={13} color={COLORS.error} />
                    <Text style={styles.errorText}>{errors[field]}</Text>
                </View>
            ) : null}
        </View>
    );

    return (
        <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
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

                        <Text style={styles.title}>Create Account 🚀</Text>
                        <Text style={styles.subtitle}>
                            Fill in your details to get started
                        </Text>

                        <View style={styles.divider} />

                        {renderInput({
                            field: 'name',
                            label: 'Full Name',
                            placeholder: 'Enter your full name',
                            icon: 'person-outline',
                        })}

                        {renderInput({
                            field: 'mobile',
                            label: 'Mobile Number',
                            placeholder: 'Enter mobile number',
                            icon: 'call-outline',
                            keyboardType: 'number-pad',
                            maxLength: 10,
                            prefix: '+91',
                        })}

                        {renderInput({
                            field: 'email',
                            label: 'Email Address',
                            placeholder: 'Enter your email',
                            icon: 'mail-outline',
                            keyboardType: 'email-address',
                        })}

                        {renderInput({
                            field: 'referralCode',
                            label: 'Referral Code',
                            placeholder: 'Enter referral code',
                            icon: 'gift-outline',
                            optional: true,
                            maxLength: 12,
                        })}

                        {/* Terms Checkbox */}
                        <TouchableOpacity
                            style={styles.checkboxRow}
                            activeOpacity={0.8}
                            onPress={() => {
                                setAgreeTerms(!agreeTerms);
                                if (errors.terms) setErrors({ ...errors, terms: '' });
                            }}
                            disabled={loading}
                        >
                            <View style={[styles.checkbox, agreeTerms && styles.checkboxChecked]}>
                                {agreeTerms && (
                                    <Ionicons name="checkmark" size={13} color={COLORS.white} />
                                )}
                            </View>
                            <Text style={styles.checkboxText}>
                                I agree to the{' '}
                                <Text style={styles.checkboxLink}>Terms of Service</Text> &{' '}
                                <Text style={styles.checkboxLink}>Privacy Policy</Text>
                            </Text>
                        </TouchableOpacity>

                        {errors.terms ? (
                            <View style={styles.errorRow}>
                                <Ionicons
                                    name="alert-circle-outline"
                                    size={13}
                                    color={COLORS.error}
                                />
                                <Text style={styles.errorText}>{errors.terms}</Text>
                            </View>
                        ) : null}

                        <TouchableOpacity
                            style={[styles.button, loading && styles.buttonDisabled]}
                            onPress={handleSignup}
                            disabled={loading}
                            activeOpacity={0.85}
                        >
                            {loading ? (
                                <ActivityIndicator color={COLORS.white} />
                            ) : (
                                <View style={styles.buttonContent}>
                                    <Text style={styles.buttonText}>Create Account</Text>
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
                            <Text style={styles.footerText}>Already have an account? </Text>
                            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                                <Text style={styles.footerLink}>Login</Text>
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
        paddingTop: 30,
        paddingBottom: 60,
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

    // ── Label ─────────────────────────────────────────
    labelRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    label: {
        fontFamily: FONTS.medium,
        fontSize: 13,
        color: COLORS.black,
    },
    optionalBadge: {
        backgroundColor: COLORS.background,
        borderRadius: 8,
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    optionalTag: {
        fontFamily: FONTS.regular,
        fontSize: 10,
        color: COLORS.gray,
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
        marginRight: 8,
    },
    countryCode: {
        fontFamily: FONTS.medium,
        fontSize: 14,
        color: COLORS.black,
        marginRight: 8,
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

    // ── Checkbox ──────────────────────────────────────
    checkboxRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginTop: 6,
        marginBottom: 6,
    },
    checkbox: {
        width: 20,
        height: 20,
        borderRadius: 5,
        borderWidth: 1.5,
        borderColor: COLORS.border,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 10,
        marginTop: 1,
    },
    checkboxChecked: {
        backgroundColor: COLORS.primary,
        borderColor: COLORS.primary,
    },
    checkboxText: {
        flex: 1,
        fontFamily: FONTS.regular,
        fontSize: 12,
        color: COLORS.gray,
        lineHeight: 18,
    },
    checkboxLink: {
        fontFamily: FONTS.medium,
        color: COLORS.accent,
    },

    // ── Button ────────────────────────────────────────
    button: {
        backgroundColor: COLORS.primary,
        borderRadius: 12,
        paddingVertical: 15,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 20,
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