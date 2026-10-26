// screens/ApplyLoanScreen.jsx
import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
    TextInput,
    Platform,
    Animated,
    ActivityIndicator,
    Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Header from '../components/Header';
import { COLORS } from '../constants/colors';
import { FONTS } from '../constants/fonts';
import { applyLoan, calculateLoan } from '../services/api/loansService';
import { handleApiError } from '../services/utils/errorHandler';
import { useUser } from '../context/UserContext'; // ← ADD

// ─── Design Tokens ────────────────────────────────────────────────────────────
const GREEN_DARK = COLORS.primary || '#1A3C34';
const GREEN_LIGHT = '#E8F5F0';
const GRAY_BG = COLORS.background || '#F5F7FA';
const WHITE = '#FFFFFF';
const TEXT_DARK = COLORS.black || '#1A1A2E';
const TEXT_GRAY = COLORS.gray || '#6B7280';
const BORDER_CLR = '#E5E7EB';
const ERROR_RED = '#EF4444';
const SUCCESS = '#22C55E';
const WARNING = '#F59E0B';

// ─── Constants ────────────────────────────────────────────────────────────────
const MIN_AMOUNT = 1000;
const MAX_AMOUNT = 500000;

const TENURE_PRESETS = [
    { label: '15 Days', value: 15 },
    { label: '30 Days', value: 30 },
];

const PURPOSE_OPTIONS = [
    'Medical Emergency',
    'Education',
    'Business',
    'Home Renovation',
    'Travel',
    'Wedding',
    'Debt Consolidation',
    'Other',
];

const QUICK_AMOUNTS = [5000, 10000, 25000, 50000, 100000];

// ── Debounce Hook ─────────────────────────────────────────────────────────────
function useDebounce(value, delay) {
    const [debouncedValue, setDebouncedValue] = useState(value);
    useEffect(() => {
        const timer = setTimeout(() => setDebouncedValue(value), delay);
        return () => clearTimeout(timer);
    }, [value, delay]);
    return debouncedValue;
}

// ══════════════════════════════════════════════════════════════════════════════
// ── COMPONENTS ────────────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════

function SelectField({ label, value, options, onSelect, icon, error }) {
    const [modalVisible, setModalVisible] = useState(false);
    const displayValue =
        typeof options[0] === 'object'
            ? options.find((o) => o.value === value)?.label
            : value;

    return (
        <View style={styles.fieldWrap}>
            <Text style={styles.fieldLabel}>{label}</Text>
            <TouchableOpacity
                style={[styles.selectInput, error ? styles.inputError : null]}
                onPress={() => setModalVisible(true)}
                activeOpacity={0.7}
            >
                <Ionicons
                    name={icon}
                    size={18}
                    color={displayValue ? GREEN_DARK : TEXT_GRAY}
                    style={styles.fieldIcon}
                />
                <Text style={[styles.selectText, !displayValue ? styles.selectPlaceholder : null]}>
                    {displayValue || `Select ${label.toLowerCase()}`}
                </Text>
                <Ionicons name="chevron-down" size={18} color={TEXT_GRAY} />
            </TouchableOpacity>
            {error ? (
                <View style={styles.errorRow}>
                    <Ionicons name="alert-circle-outline" size={13} color={ERROR_RED} />
                    <Text style={styles.errorText}>{error}</Text>
                </View>
            ) : null}

            <Modal
                visible={modalVisible}
                transparent
                animationType="fade"
                onRequestClose={() => setModalVisible(false)}
            >
                <TouchableOpacity
                    style={styles.modalOverlay}
                    activeOpacity={1}
                    onPress={() => setModalVisible(false)}
                >
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Select {label}</Text>
                            <TouchableOpacity onPress={() => setModalVisible(false)}>
                                <Ionicons name="close" size={24} color={TEXT_DARK} />
                            </TouchableOpacity>
                        </View>
                        <ScrollView style={styles.optionsList} nestedScrollEnabled>
                            {options.map((option) => {
                                const optLabel = typeof option === 'object' ? option.label : option;
                                const optValue = typeof option === 'object' ? option.value : option;
                                const isSelected = value === optValue;
                                return (
                                    <TouchableOpacity
                                        key={String(optValue)}
                                        style={[styles.optionItem, isSelected ? styles.optionItemSelected : null]}
                                        onPress={() => { onSelect(optValue); setModalVisible(false); }}
                                        activeOpacity={0.7}
                                    >
                                        <Text style={[styles.optionText, isSelected ? styles.optionTextSelected : null]}>
                                            {optLabel}
                                        </Text>
                                        {isSelected ? <Ionicons name="checkmark" size={20} color={GREEN_DARK} /> : null}
                                    </TouchableOpacity>
                                );
                            })}
                        </ScrollView>
                    </View>
                </TouchableOpacity>
            </Modal>
        </View>
    );
}

function TenureSelector({ value, onSelect, error }) {
    return (
        <View style={styles.fieldWrap}>
            <Text style={styles.fieldLabel}>Loan Tenure</Text>
            <View style={styles.tenureChipsRow}>
                {TENURE_PRESETS.map((preset) => {
                    const isSelected = value === preset.value;
                    return (
                        <TouchableOpacity
                            key={preset.value}
                            style={[styles.tenureChip, isSelected ? styles.tenureChipActive : null]}
                            onPress={() => onSelect(preset.value)}
                            activeOpacity={0.75}
                        >
                            <Ionicons
                                name="calendar-outline"
                                size={14}
                                color={isSelected ? WHITE : GREEN_DARK}
                            />
                            <Text style={[styles.tenureChipText, isSelected ? styles.tenureChipTextActive : null]}>
                                {preset.label}
                            </Text>
                        </TouchableOpacity>
                    );
                })}
            </View>
            {value ? (
                <View style={styles.tenureSelectedRow}>
                    <Ionicons name="checkmark-circle" size={14} color={SUCCESS} />
                    <Text style={styles.tenureSelectedText}>{`Selected: ${value} days`}</Text>
                </View>
            ) : null}
            {error ? (
                <View style={styles.errorRow}>
                    <Ionicons name="alert-circle-outline" size={13} color={ERROR_RED} />
                    <Text style={styles.errorText}>{error}</Text>
                </View>
            ) : null}
        </View>
    );
}

function AmountChips({ onSelect }) {
    return (
        <View style={styles.amountChipsRow}>
            {QUICK_AMOUNTS.map((amt) => (
                <TouchableOpacity
                    key={amt}
                    style={styles.amountChip}
                    onPress={() => onSelect(String(amt))}
                    activeOpacity={0.7}
                >
                    <Text style={styles.amountChipText}>
                        {amt >= 100000 ? `₹${amt / 100000}L` : amt >= 1000 ? `₹${amt / 1000}K` : `₹${amt}`}
                    </Text>
                </TouchableOpacity>
            ))}
        </View>
    );
}

function InfoRow({ icon, label, value, valueColor }) {
    return (
        <View style={styles.infoRow}>
            <View style={styles.infoRowLeft}>
                <Ionicons name={icon} size={14} color={TEXT_GRAY} />
                <Text style={styles.infoRowLabel}>{label}</Text>
            </View>
            <Text style={[styles.infoRowValue, valueColor ? { color: valueColor } : null]}>{value}</Text>
        </View>
    );
}

function BreakdownRow({ label, value, highlight, valueColor }) {
    return (
        <View style={[styles.breakdownRow, highlight ? styles.breakdownRowHighlight : null]}>
            <Text style={[styles.breakdownLabel, highlight ? styles.breakdownLabelBold : null]}>{label}</Text>
            <Text style={[styles.breakdownValue, highlight ? styles.breakdownValueBold : null, valueColor ? { color: valueColor } : null]}>
                {value}
            </Text>
        </View>
    );
}

function SuccessModal({ visible, onDone }) {
    const scaleAnim = useRef(new Animated.Value(0.8)).current;
    const opacityAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (visible) {
            Animated.parallel([
                Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, tension: 60, friction: 8 }),
                Animated.timing(opacityAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
            ]).start();
        } else {
            scaleAnim.setValue(0.8);
            opacityAnim.setValue(0);
        }
    }, [visible]);

    return (
        <Modal visible={visible} transparent animationType="none" onRequestClose={onDone}>
            <View style={styles.successOverlay}>
                <Animated.View
                    style={[styles.successCard, { transform: [{ scale: scaleAnim }], opacity: opacityAnim }]}
                >
                    <View style={styles.successIconWrap}>
                        <LinearGradient colors={[SUCCESS, '#16A34A']} style={styles.successIconGradient}>
                            <Ionicons name="checkmark" size={36} color={WHITE} />
                        </LinearGradient>
                    </View>
                    <Text style={styles.successTitle}>Application Submitted!</Text>
                    <Text style={styles.successSubtitle}>
                        Your loan application has been submitted successfully.
                    </Text>
                    <Text style={styles.successNote}>
                        Our team will review your application and get back to you shortly.
                    </Text>
                    <TouchableOpacity style={styles.successBtn} onPress={onDone} activeOpacity={0.85}>
                        <LinearGradient
                            colors={[GREEN_DARK, '#145C4D']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={styles.successBtnGradient}
                        >
                            <Text style={styles.successBtnText}>View My Loans</Text>
                            <Ionicons name="arrow-forward" size={18} color={WHITE} />
                        </LinearGradient>
                    </TouchableOpacity>
                </Animated.View>
            </View>
        </Modal>
    );
}

// ══════════════════════════════════════════════════════════════════════════════
// ── MAIN SCREEN ───────────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════

export default function ApplyLoanScreen({ navigation }) {
    const insets = useSafeAreaInsets();

    // ── Use context instead of local storage ──────────────────────────────────
    const { user, loadUser } = useUser(); // ← REPLACE local user state

    const [submitting, setSubmitting] = useState(false);
    const [successModal, setSuccessModal] = useState(false);

    // ── Form State ─────────────────────────────────────────────────────────────
    const [amount, setAmount] = useState('');
    const [tenure, setTenure] = useState(null);
    const [purpose, setPurpose] = useState('');
    const [customPurpose, setCustomPurpose] = useState('');

    // ── Calculation State ──────────────────────────────────────────────────────
    const [calculation, setCalculation] = useState(null);
    const [calculating, setCalculating] = useState(false);
    const [calcError, setCalcError] = useState(null);

    // ── Error State ────────────────────────────────────────────────────────────
    const [errors, setErrors] = useState({});

    const debouncedAmount = useDebounce(amount, 600);

    // ── Load user from context on mount ───────────────────────────────────────
    useEffect(() => {
        loadUser(); // ← Ensures context has latest user with updated profile image
    }, []);

    // ── Call Calculate API whenever amount or tenure changes ───────────────────
    useEffect(() => {
        const numAmount = Number(debouncedAmount);
        const isValidAmount =
            debouncedAmount &&
            !isNaN(numAmount) &&
            numAmount >= MIN_AMOUNT &&
            numAmount <= MAX_AMOUNT;

        if (isValidAmount && tenure) {
            fetchCalculation(numAmount, tenure);
        } else {
            setCalculation(null);
            setCalcError(null);
        }
    }, [debouncedAmount, tenure]);

    const fetchCalculation = async (amt, tenureDays) => {
        setCalculating(true);
        setCalcError(null);
        try {
            const result = await calculateLoan({ amount: amt, tenure_days: tenureDays });
            if (result.success) {
                setCalculation(result.data);
            } else {
                setCalcError(result.message);
                setCalculation(null);
            }
        } catch (err) {
            setCalcError('Unable to fetch calculation. Please try again.');
            setCalculation(null);
        } finally {
            setCalculating(false);
        }
    };

    const validate = () => {
        const newErrors = {};
        const numAmount = Number(amount);
        if (!amount.trim()) {
            newErrors.amount = 'Loan amount is required.';
        } else if (isNaN(numAmount) || numAmount <= 0) {
            newErrors.amount = 'Please enter a valid amount.';
        } else if (numAmount < MIN_AMOUNT) {
            newErrors.amount = `Minimum loan amount is ₹${MIN_AMOUNT.toLocaleString('en-IN')}.`;
        } else if (numAmount > MAX_AMOUNT) {
            newErrors.amount = `Maximum loan amount is ₹${MAX_AMOUNT.toLocaleString('en-IN')}.`;
        }
        if (!tenure) newErrors.tenure = 'Please select a loan tenure.';
        if (!purpose) newErrors.purpose = 'Please select a loan purpose.';
        if (purpose === 'Other' && !customPurpose.trim()) {
            newErrors.customPurpose = 'Please specify your purpose.';
        }
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async () => {
        if (!validate()) return;
        setSubmitting(true);
        try {
            const payload = {
                amount: Number(amount),
                tenure_days: tenure,
                purpose: purpose === 'Other' ? customPurpose.trim() : purpose,
            };
            const result = await applyLoan(payload);
            if (result.success) {
                setSuccessModal(true);
            } else {
                handleApiError({ message: result.message });
            }
        } catch (err) {
            handleApiError(err);
        } finally {
            setSubmitting(false);
        }
    };

    const handleSuccessDone = () => {
        setSuccessModal(false);
        navigation.replace('MainTabs', { screen: 'Loans' });
    };

    // ── Get initials from context user ─────────────────────────────────────────
    const getUserInitials = () => {
        if (!user?.name) return 'U';
        const parts = user.name.trim().split(' ');
        if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
        return parts[0][0].toUpperCase();
    };

    const numAmount = Number(amount) || 0;
    const hasValidInputs = numAmount >= MIN_AMOUNT && numAmount <= MAX_AMOUNT && tenure !== null;
    const bottomPadding = Platform.OS === 'ios' ? 100 : insets.bottom > 0 ? insets.bottom + 80 : 80;

    // ── Render ─────────────────────────────────────────────────────────────────
    return (
        <View style={styles.container}>
            {/* ── Header: profile image from context, auto-updates ── */}
            <Header
                showLogo
                showProfile
                avatarText={getUserInitials()}
                profileImageUrl={user?.profile_image || null} // ← ADD
                onProfilePress={() => navigation.navigate('Profile')}
            />

            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: bottomPadding, paddingHorizontal: 20 }}
                keyboardShouldPersistTaps="handled"
            >
                <Text style={styles.pageTitle}>Apply for Loan</Text>
                <Text style={styles.pageSubtitle}>
                    Fill in the details below to submit your loan application.
                </Text>

                {/* ── Info Banner ── */}
                <View style={styles.infoBanner}>
                    <View style={styles.infoBannerIconWrap}>
                        <Ionicons name="shield-checkmark" size={20} color={GREEN_DARK} />
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.infoBannerTitle}>Quick & Secure</Text>
                        <Text style={styles.infoBannerText}>
                            Your application is encrypted and reviewed within 24 hours.
                        </Text>
                    </View>
                </View>

                {/* ── Form Card ── */}
                <View style={styles.formCard}>
                    <View style={styles.formCardAccent} />

                    {/* ── Amount Field ── */}
                    <View style={styles.fieldWrap}>
                        <Text style={styles.fieldLabel}>Loan Amount</Text>
                        <View style={[styles.amountInputWrapper, errors.amount ? styles.inputError : null]}>
                            <Text style={styles.rupeeSymbol}>₹</Text>
                            <TextInput
                                style={styles.amountInput}
                                placeholder={`Min ₹${MIN_AMOUNT.toLocaleString('en-IN')} – Max ₹${MAX_AMOUNT.toLocaleString('en-IN')}`}
                                placeholderTextColor={TEXT_GRAY}
                                keyboardType="numeric"
                                value={amount}
                                onChangeText={(text) => {
                                    setAmount(text.replace(/[^0-9]/g, ''));
                                    if (errors.amount) setErrors({ ...errors, amount: '' });
                                }}
                            />
                            {amount.length > 0 ? (
                                <TouchableOpacity
                                    onPress={() => { setAmount(''); setCalculation(null); }}
                                    style={{ padding: 4 }}
                                >
                                    <Ionicons name="close-circle" size={18} color={TEXT_GRAY} />
                                </TouchableOpacity>
                            ) : null}
                        </View>
                        {errors.amount ? (
                            <View style={styles.errorRow}>
                                <Ionicons name="alert-circle-outline" size={13} color={ERROR_RED} />
                                <Text style={styles.errorText}>{errors.amount}</Text>
                            </View>
                        ) : null}
                        <AmountChips
                            onSelect={(val) => {
                                setAmount(val);
                                if (errors.amount) setErrors({ ...errors, amount: '' });
                            }}
                        />
                    </View>

                    {/* ── Tenure Field ── */}
                    <TenureSelector
                        value={tenure}
                        onSelect={(val) => {
                            setTenure(val);
                            if (errors.tenure) setErrors({ ...errors, tenure: '' });
                        }}
                        error={errors.tenure}
                    />

                    {/* ── Purpose Field ── */}
                    <SelectField
                        label="Loan Purpose"
                        value={purpose}
                        options={PURPOSE_OPTIONS}
                        onSelect={(val) => {
                            setPurpose(val);
                            if (errors.purpose) setErrors({ ...errors, purpose: '' });
                        }}
                        icon="bookmark-outline"
                        error={errors.purpose}
                    />

                    {/* ── Custom Purpose ── */}
                    {purpose === 'Other' ? (
                        <View style={styles.fieldWrap}>
                            <Text style={styles.fieldLabel}>Specify Purpose</Text>
                            <View style={[styles.textAreaWrapper, errors.customPurpose ? styles.inputError : null]}>
                                <TextInput
                                    style={styles.textArea}
                                    placeholder="Describe your loan purpose..."
                                    placeholderTextColor={TEXT_GRAY}
                                    multiline
                                    numberOfLines={3}
                                    textAlignVertical="top"
                                    value={customPurpose}
                                    onChangeText={(text) => {
                                        setCustomPurpose(text);
                                        if (errors.customPurpose) setErrors({ ...errors, customPurpose: '' });
                                    }}
                                />
                            </View>
                            {errors.customPurpose ? (
                                <View style={styles.errorRow}>
                                    <Ionicons name="alert-circle-outline" size={13} color={ERROR_RED} />
                                    <Text style={styles.errorText}>{errors.customPurpose}</Text>
                                </View>
                            ) : null}
                        </View>
                    ) : null}
                </View>

                {/* ── Loan Calculation Preview Card ── */}
                {hasValidInputs ? (
                    <View style={styles.previewCard}>
                        <View style={styles.previewHeader}>
                            <View style={styles.previewHeaderLeft}>
                                <View style={styles.previewHeaderIcon}>
                                    <Ionicons name="calculator-outline" size={18} color={GREEN_DARK} />
                                </View>
                                <Text style={styles.previewTitle}>Loan Breakdown</Text>
                            </View>
                            {calculating ? (
                                <View style={styles.calcLoadingRow}>
                                    <ActivityIndicator size="small" color={GREEN_DARK} />
                                    <Text style={styles.calcLoadingText}>Calculating...</Text>
                                </View>
                            ) : (
                                <View style={styles.previewBadge}>
                                    <Text style={styles.previewBadgeText}>Live</Text>
                                </View>
                            )}
                        </View>

                        {calcError ? (
                            <View style={styles.calcErrorBox}>
                                <Ionicons name="alert-circle-outline" size={16} color={ERROR_RED} />
                                <Text style={styles.calcErrorText}>{calcError}</Text>
                            </View>
                        ) : null}

                        {calculation && !calculating ? (
                            <>
                                <InfoRow
                                    icon="cash-outline"
                                    label="Loan Amount"
                                    value={`₹${Number(calculation.amount).toLocaleString('en-IN')}`}
                                />
                                <InfoRow
                                    icon="calendar-outline"
                                    label="Tenure"
                                    value={`${calculation.tenure_days} Days`}
                                />
                                <InfoRow
                                    icon="bookmark-outline"
                                    label="Purpose"
                                    value={purpose === 'Other' ? customPurpose || 'Other' : purpose}
                                />
                                <View style={styles.previewDivider} />
                                <Text style={styles.breakdownSectionTitle}>Fee Breakdown</Text>
                                <BreakdownRow
                                    label="Interest Rate"
                                    value={`${calculation.interest_rate}%`}
                                    valueColor={WARNING}
                                />
                                <BreakdownRow
                                    label="Interest Amount"
                                    value={`₹${Number(calculation.interest_amount).toLocaleString('en-IN')}`}
                                    valueColor={WARNING}
                                />
                                {Number(calculation.processing_fee) > 0 ? (
                                    <BreakdownRow
                                        label="Processing Fee"
                                        value={`₹${Number(calculation.processing_fee).toLocaleString('en-IN')}`}
                                    />
                                ) : null}
                                {Number(calculation.platform_charge) > 0 ? (
                                    <BreakdownRow
                                        label="Platform Charge"
                                        value={`₹${Number(calculation.platform_charge).toLocaleString('en-IN')}`}
                                    />
                                ) : null}
                                {Number(calculation.gst_amount) > 0 ? (
                                    <BreakdownRow
                                        label="GST Amount"
                                        value={`₹${Number(calculation.gst_amount).toLocaleString('en-IN')}`}
                                    />
                                ) : null}
                                {Number(calculation.due_charges) > 0 ? (
                                    <BreakdownRow
                                        label="Due Charges"
                                        value={`₹${Number(calculation.due_charges).toLocaleString('en-IN')}`}
                                        valueColor={ERROR_RED}
                                    />
                                ) : null}
                                <View style={styles.previewDivider} />
                                <BreakdownRow
                                    label="Total Payable"
                                    value={`₹${Number(calculation.total_payable).toLocaleString('en-IN')}`}
                                    highlight
                                />
                                <Text style={styles.previewDisclaimer}>
                                    * Actual charges may vary based on admin approval.
                                </Text>
                            </>
                        ) : null}

                        {calculating ? (
                            <View style={styles.calcSkeletonWrap}>
                                {[1, 2, 3, 4, 5].map((i) => (
                                    <View key={i} style={styles.calcSkeletonRow}>
                                        <View style={[styles.calcSkeletonBox, { width: '40%' }]} />
                                        <View style={[styles.calcSkeletonBox, { width: '25%' }]} />
                                    </View>
                                ))}
                            </View>
                        ) : null}
                    </View>
                ) : null}

                {/* ── Terms Notice ── */}
                <View style={styles.termsNotice}>
                    <Ionicons name="information-circle-outline" size={14} color={TEXT_GRAY} />
                    <Text style={styles.termsNoticeText}>
                        {'By submitting, you agree to our '}
                        <Text style={styles.termsLink}>Terms & Conditions</Text>
                        {' and '}
                        <Text style={styles.termsLink}>Privacy Policy</Text>
                        {'.'}
                    </Text>
                </View>

                {/* ── Submit Button ── */}
                <TouchableOpacity
                    style={[styles.submitBtn, submitting ? styles.submitBtnDisabled : null]}
                    onPress={handleSubmit}
                    activeOpacity={0.85}
                    disabled={submitting}
                >
                    <LinearGradient
                        colors={submitting ? ['#9CA3AF', '#6B7280'] : [GREEN_DARK, '#145C4D']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.submitBtnGradient}
                    >
                        {submitting ? (
                            <>
                                <ActivityIndicator size="small" color={WHITE} />
                                <Text style={styles.submitBtnText}>Submitting...</Text>
                            </>
                        ) : (
                            <>
                                <Ionicons name="send-outline" size={18} color={WHITE} />
                                <Text style={styles.submitBtnText}>Submit Application</Text>
                            </>
                        )}
                    </LinearGradient>
                </TouchableOpacity>

                {/* ── Cancel ── */}
                <TouchableOpacity
                    style={styles.cancelBtn}
                    onPress={() => navigation.goBack()}
                    activeOpacity={0.7}
                >
                    <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
            </ScrollView>

            {/* ── Success Modal ── */}
            <SuccessModal visible={successModal} onDone={handleSuccessDone} />
        </View>
    );
}

// ── Styles (unchanged) ────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: GRAY_BG },
    pageTitle: { fontFamily: FONTS.bold, fontSize: 22, color: TEXT_DARK, marginTop: 14, marginBottom: 4 },
    pageSubtitle: { fontFamily: FONTS.regular, fontSize: 12, color: TEXT_GRAY, lineHeight: 18, marginBottom: 16 },
    infoBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        backgroundColor: GREEN_LIGHT,
        borderRadius: 12,
        padding: 14,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#BBF7D0',
    },
    infoBannerIconWrap: { width: 40, height: 40, borderRadius: 10, backgroundColor: WHITE, justifyContent: 'center', alignItems: 'center' },
    infoBannerTitle: { fontFamily: FONTS.semiBold, fontSize: 13, color: GREEN_DARK, marginBottom: 2 },
    infoBannerText: { fontFamily: FONTS.regular, fontSize: 11, color: '#166534', lineHeight: 16 },
    formCard: {
        backgroundColor: WHITE,
        borderRadius: 20,
        paddingHorizontal: 20,
        paddingBottom: 20,
        paddingTop: 0,
        marginBottom: 16,
        elevation: 3,
        shadowColor: '#000',
        shadowOpacity: 0.07,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 4 },
        overflow: 'hidden',
    },
    formCardAccent: { height: 4, backgroundColor: GREEN_DARK, marginHorizontal: -20, marginBottom: 20, borderTopLeftRadius: 20, borderTopRightRadius: 20 },
    fieldWrap: { marginBottom: 18 },
    fieldLabel: { fontFamily: FONTS.medium, fontSize: 13, color: TEXT_DARK, marginBottom: 8 },
    fieldIcon: { marginRight: 8 },
    amountInputWrapper: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: BORDER_CLR, borderRadius: 12, paddingHorizontal: 14, backgroundColor: GRAY_BG, minHeight: 52 },
    rupeeSymbol: { fontFamily: FONTS.bold, fontSize: 18, color: GREEN_DARK, marginRight: 6 },
    amountInput: { flex: 1, fontFamily: FONTS.regular, fontSize: 15, color: TEXT_DARK, paddingVertical: 14 },
    amountChipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
    amountChip: { borderWidth: 1.5, borderColor: GREEN_DARK, borderRadius: 20, paddingVertical: 6, paddingHorizontal: 14 },
    amountChipText: { fontFamily: FONTS.semiBold, fontSize: 12, color: GREEN_DARK },
    tenureChipsRow: { flexDirection: 'row', gap: 12 },
    tenureChip: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1.5, borderColor: GREEN_DARK, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 20, backgroundColor: WHITE, flex: 1, justifyContent: 'center' },
    tenureChipActive: { backgroundColor: GREEN_DARK },
    tenureChipText: { fontFamily: FONTS.semiBold, fontSize: 14, color: GREEN_DARK },
    tenureChipTextActive: { color: WHITE },
    tenureSelectedRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 8 },
    tenureSelectedText: { fontFamily: FONTS.medium, fontSize: 12, color: SUCCESS },
    selectInput: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: BORDER_CLR, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 14, backgroundColor: GRAY_BG },
    selectText: { flex: 1, fontFamily: FONTS.regular, fontSize: 14, color: TEXT_DARK },
    selectPlaceholder: { color: TEXT_GRAY },
    textAreaWrapper: { borderWidth: 1.5, borderColor: BORDER_CLR, borderRadius: 12, backgroundColor: GRAY_BG, padding: 14 },
    textArea: { fontFamily: FONTS.regular, fontSize: 14, color: TEXT_DARK, minHeight: 80 },
    inputError: { borderColor: ERROR_RED, backgroundColor: '#FFF5F5' },
    errorRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 5 },
    errorText: { fontFamily: FONTS.regular, fontSize: 11, color: ERROR_RED },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
    modalContent: { backgroundColor: WHITE, borderRadius: 16, width: '100%', maxHeight: '70%', elevation: 5, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 15, shadowOffset: { width: 0, height: 5 } },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: BORDER_CLR },
    modalTitle: { fontFamily: FONTS.semiBold, fontSize: 16, color: TEXT_DARK },
    optionsList: { maxHeight: 320 },
    optionItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: BORDER_CLR },
    optionItemSelected: { backgroundColor: GREEN_LIGHT },
    optionText: { fontFamily: FONTS.regular, fontSize: 14, color: TEXT_DARK },
    optionTextSelected: { fontFamily: FONTS.semiBold, color: GREEN_DARK },
    previewCard: { backgroundColor: WHITE, borderRadius: 16, padding: 16, marginBottom: 16, elevation: 3, shadowColor: GREEN_DARK, shadowOpacity: 0.1, shadowRadius: 10, shadowOffset: { width: 0, height: 3 }, borderWidth: 1, borderColor: GREEN_LIGHT },
    previewHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
    previewHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    previewHeaderIcon: { width: 34, height: 34, borderRadius: 9, backgroundColor: GREEN_LIGHT, justifyContent: 'center', alignItems: 'center' },
    previewTitle: { fontFamily: FONTS.semiBold, fontSize: 15, color: TEXT_DARK },
    previewBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#DCFCE7', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
    previewBadgeText: { fontFamily: FONTS.bold, fontSize: 11, color: SUCCESS },
    calcLoadingRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    calcLoadingText: { fontFamily: FONTS.regular, fontSize: 12, color: GREEN_DARK },
    calcErrorBox: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#FEF2F2', borderRadius: 10, padding: 12, marginBottom: 10, borderWidth: 1, borderColor: '#FECACA' },
    calcErrorText: { fontFamily: FONTS.regular, fontSize: 12, color: ERROR_RED, flex: 1 },
    infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: BORDER_CLR },
    infoRowLeft: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    infoRowLabel: { fontFamily: FONTS.regular, fontSize: 12, color: TEXT_GRAY },
    infoRowValue: { fontFamily: FONTS.semiBold, fontSize: 13, color: TEXT_DARK },
    previewDivider: { height: 1, backgroundColor: BORDER_CLR, marginVertical: 10 },
    breakdownSectionTitle: { fontFamily: FONTS.semiBold, fontSize: 12, color: TEXT_GRAY, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 },
    breakdownRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: BORDER_CLR },
    breakdownRowHighlight: { backgroundColor: GREEN_LIGHT, marginHorizontal: -16, paddingHorizontal: 16, marginTop: 4, borderBottomWidth: 0, borderRadius: 8, paddingVertical: 12 },
    breakdownLabel: { fontFamily: FONTS.regular, fontSize: 13, color: TEXT_GRAY },
    breakdownLabelBold: { fontFamily: FONTS.bold, fontSize: 14, color: GREEN_DARK },
    breakdownValue: { fontFamily: FONTS.semiBold, fontSize: 13, color: TEXT_DARK },
    breakdownValueBold: { fontFamily: FONTS.bold, fontSize: 16, color: GREEN_DARK },
    previewDisclaimer: { fontFamily: FONTS.regular, fontSize: 10, color: TEXT_GRAY, fontStyle: 'italic', marginTop: 10 },
    calcSkeletonWrap: { gap: 10, marginTop: 4 },
    calcSkeletonRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6 },
    calcSkeletonBox: { height: 12, backgroundColor: '#E2E8F0', borderRadius: 6 },
    termsNotice: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginBottom: 16 },
    termsNoticeText: { fontFamily: FONTS.regular, fontSize: 11, color: TEXT_GRAY, flex: 1, lineHeight: 17 },
    termsLink: { fontFamily: FONTS.medium, color: GREEN_DARK },
    submitBtn: { borderRadius: 14, overflow: 'hidden', marginBottom: 12, elevation: 4, shadowColor: GREEN_DARK, shadowOpacity: 0.3, shadowRadius: 8, shadowOffset: { width: 0, height: 4 } },
    submitBtnDisabled: { opacity: 0.7 },
    submitBtnGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, gap: 10 },
    submitBtnText: { fontFamily: FONTS.bold, fontSize: 15, color: WHITE },
    cancelBtn: { alignItems: 'center', paddingVertical: 14, marginBottom: 8 },
    cancelBtnText: { fontFamily: FONTS.medium, fontSize: 14, color: TEXT_GRAY },
    successOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', alignItems: 'center', padding: 24 },
    successCard: { backgroundColor: WHITE, borderRadius: 24, padding: 28, alignItems: 'center', width: '100%', elevation: 10, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 20, shadowOffset: { width: 0, height: 8 } },
    successIconWrap: { marginBottom: 20, elevation: 6, shadowColor: SUCCESS, shadowOpacity: 0.4, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, borderRadius: 40 },
    successIconGradient: { width: 80, height: 80, borderRadius: 40, justifyContent: 'center', alignItems: 'center' },
    successTitle: { fontFamily: FONTS.bold, fontSize: 22, color: TEXT_DARK, marginBottom: 8, textAlign: 'center' },
    successSubtitle: { fontFamily: FONTS.regular, fontSize: 13, color: TEXT_GRAY, textAlign: 'center', lineHeight: 20, marginBottom: 16 },
    successNote: { fontFamily: FONTS.regular, fontSize: 12, color: TEXT_GRAY, textAlign: 'center', lineHeight: 18, marginBottom: 24 },
    successBtn: { width: '100%', borderRadius: 14, overflow: 'hidden', elevation: 3, shadowColor: GREEN_DARK, shadowOpacity: 0.3, shadowRadius: 8, shadowOffset: { width: 0, height: 4 } },
    successBtnGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 15, gap: 10 },
    successBtnText: { fontFamily: FONTS.bold, fontSize: 15, color: WHITE },
});