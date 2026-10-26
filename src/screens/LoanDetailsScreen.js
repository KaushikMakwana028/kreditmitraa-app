// screens/LoanDetailsScreen.jsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    Platform,
    TouchableOpacity,
    Animated,
    RefreshControl,
    Alert,
    ActivityIndicator,
    Image,
    Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import Header from '../components/Header';
import { COLORS } from '../constants/colors';
import { FONTS } from '../constants/fonts';
import { getLoanDetails, submitLoanRepayment } from '../services/api/loansService';
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
const SUCCESS = '#22C55E';
const WARNING = '#F59E0B';
const ERROR_RED = '#EF4444';

// ─── Status Config ────────────────────────────────────────────────────────────
const STATUS_CONFIG = {
    approved: { color: SUCCESS, bg: '#F0FFF4', icon: 'checkmark-circle', label: 'Approved' },
    pending: { color: WARNING, bg: '#FFFBEB', icon: 'time', label: 'Pending' },
    active: { color: '#3B82F6', bg: '#EFF6FF', icon: 'flash', label: 'Active' },
    paid: { color: '#8B5CF6', bg: '#F5F3FF', icon: 'shield-checkmark', label: 'Paid' },
    rejected: { color: ERROR_RED, bg: '#FEF2F2', icon: 'close-circle', label: 'Rejected' },
    disbursed: { color: '#06B6D4', bg: '#ECFEFF', icon: 'arrow-forward-circle', label: 'Disbursed' },
};

const ACTION_STATUS_CONFIG = {
    verification_pending: { label: 'Verification Pending', color: WARNING, bg: '#FEF3C7', icon: 'hourglass-outline' },
    completed: { label: 'Completed', color: SUCCESS, bg: '#DCFCE7', icon: 'checkmark-done-outline' },
    payment_pending: { label: 'Payment Pending', color: ERROR_RED, bg: '#FEE2E2', icon: 'alert-circle-outline' },
    disbursement_pending: { label: 'Disbursement Pending', color: '#3B82F6', bg: '#DBEAFE', icon: 'time-outline' },
    none: { label: 'No Action Required', color: TEXT_GRAY, bg: '#F3F4F6', icon: 'checkmark-outline' },
};

const getStatusConfig = (status) =>
    STATUS_CONFIG[status?.toLowerCase()] || {
        color: COLORS.gray,
        bg: '#F3F4F6',
        icon: 'ellipse-outline',
        label: status || 'Unknown',
    };

const getActionConfig = (actionStatus) =>
    ACTION_STATUS_CONFIG[actionStatus?.toLowerCase()] || {
        label: actionStatus || '',
        color: COLORS.gray,
        bg: '#F3F4F6',
        icon: 'ellipse-outline',
    };

// ══════════════════════════════════════════════════════════════════════════════
// ── SKELETON LOADER ───────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════

function SkeletonBox({ width: w, height: h, borderRadius = 8, style }) {
    const shimmer = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        const animation = Animated.loop(
            Animated.sequence([
                Animated.timing(shimmer, { toValue: 1, duration: 900, useNativeDriver: true }),
                Animated.timing(shimmer, { toValue: 0, duration: 900, useNativeDriver: true }),
            ])
        );
        animation.start();
        return () => animation.stop();
    }, []);

    const opacity = shimmer.interpolate({ inputRange: [0, 1], outputRange: [0.3, 0.8] });

    return (
        <Animated.View
            style={[{ width: w, height: h, borderRadius, backgroundColor: '#CBD5E1', opacity }, style]}
        />
    );
}

function LoadingSkeleton() {
    return (
        <>
            <SkeletonBox width="100%" height={180} borderRadius={20} style={{ marginTop: 14, marginBottom: 14 }} />
            <SkeletonBox width="100%" height={70} borderRadius={14} style={{ marginBottom: 14 }} />
            {[1, 2].map((i) => (
                <SkeletonBox key={i} width="100%" height={220} borderRadius={16} style={{ marginBottom: 14 }} />
            ))}
        </>
    );
}

// ══════════════════════════════════════════════════════════════════════════════
// ── REPAYMENT MODAL ───────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════

function RepaymentModal({ visible, onClose, loanId, totalPayable, onSuccess }) {
    const [receiptImage, setReceiptImage] = useState(null);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (visible) {
            setReceiptImage(null);
            setSubmitting(false);
        }
    }, [visible]);

    const pickReceiptImage = () => {
        Alert.alert('Upload Receipt', 'Choose image source', [
            { text: 'Camera', onPress: () => launchCamera() },
            { text: 'Gallery', onPress: () => launchGallery() },
            { text: 'Cancel', style: 'cancel' },
        ]);
    };

    const launchCamera = async () => {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission Required', 'Please allow camera access.');
            return;
        }
        const result = await ImagePicker.launchCameraAsync({ allowsEditing: true, quality: 0.8 });
        if (!result.canceled) setReceiptImage(result.assets[0]);
    };

    const launchGallery = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission Required', 'Please allow gallery access.');
            return;
        }
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            quality: 0.8,
        });
        if (!result.canceled) setReceiptImage(result.assets[0]);
    };

    const handleSubmit = async () => {
        if (!receiptImage) {
            Alert.alert('Receipt Required', 'Please upload your payment receipt to proceed.');
            return;
        }
        setSubmitting(true);
        try {
            const formData = new FormData();
            formData.append('receipt_image', {
                uri: receiptImage.uri,
                type: 'image/jpeg',
                name: 'receipt.jpg',
            });
            const result = await submitLoanRepayment(loanId, formData);
            if (result.success) {
                onClose();
                Alert.alert(
                    'Submitted Successfully!',
                    result.message || 'Your loan repayment details have been submitted successfully.',
                    [{ text: 'OK', onPress: () => onSuccess() }]
                );
            } else {
                handleApiError({ message: result.message });
            }
        } catch (err) {
            handleApiError(err);
        } finally {
            setSubmitting(false);
        }
    };

    const formattedAmount = totalPayable
        ? `₹${Number(totalPayable).toLocaleString('en-IN')}`
        : '₹0';

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <View style={modalStyles.overlay}>
                <View style={modalStyles.container}>
                    <View style={modalStyles.header}>
                        <View style={modalStyles.headerLeft}>
                            <View style={modalStyles.headerIconBox}>
                                <Ionicons name="card-outline" size={20} color={GREEN_DARK} />
                            </View>
                            <View>
                                <Text style={modalStyles.headerTitle}>Submit Repayment</Text>
                                <Text style={modalStyles.headerSubtitle}>Upload payment receipt</Text>
                            </View>
                        </View>
                        <TouchableOpacity onPress={onClose} disabled={submitting} activeOpacity={0.7}>
                            <Ionicons name="close-circle" size={28} color={TEXT_GRAY} />
                        </TouchableOpacity>
                    </View>

                    <View style={modalStyles.divider} />

                    <View style={modalStyles.amountBox}>
                        <Text style={modalStyles.amountLabel}>Total Amount to Pay</Text>
                        <Text style={modalStyles.amountValue}>{formattedAmount}</Text>
                    </View>

                    <View style={modalStyles.instructionBox}>
                        <Ionicons name="information-circle-outline" size={16} color="#3B82F6" />
                        <Text style={modalStyles.instructionText}>
                            Please make the payment and upload the screenshot or receipt as proof.
                            Admin will verify within 24 hours.
                        </Text>
                    </View>

                    <Text style={modalStyles.uploadLabel}>Payment Receipt *</Text>

                    <TouchableOpacity
                        style={[modalStyles.uploadBox, receiptImage ? modalStyles.uploadBoxFilled : null]}
                        onPress={pickReceiptImage}
                        activeOpacity={0.75}
                        disabled={submitting}
                    >
                        {receiptImage ? (
                            <View style={{ width: '100%', height: '100%' }}>
                                <Image source={{ uri: receiptImage.uri }} style={modalStyles.receiptPreview} />
                                <View style={modalStyles.receiptOverlay}>
                                    <Ionicons name="camera-outline" size={24} color={WHITE} />
                                    <Text style={modalStyles.receiptOverlayText}>Tap to change</Text>
                                </View>
                            </View>
                        ) : (
                            <View style={modalStyles.uploadPlaceholder}>
                                <View style={modalStyles.uploadIconBox}>
                                    <Ionicons name="cloud-upload-outline" size={32} color={GREEN_DARK} />
                                </View>
                                <Text style={modalStyles.uploadTitle}>Upload Receipt</Text>
                                <Text style={modalStyles.uploadSubtitle}>
                                    Tap to take photo or choose from gallery
                                </Text>
                            </View>
                        )}
                    </TouchableOpacity>

                    {receiptImage ? (
                        <View style={modalStyles.receiptStatus}>
                            <Ionicons name="checkmark-circle" size={16} color={SUCCESS} />
                            <Text style={modalStyles.receiptStatusText}>Receipt selected successfully</Text>
                        </View>
                    ) : (
                        <View style={modalStyles.receiptStatus} />
                    )}

                    <TouchableOpacity
                        style={[
                            modalStyles.submitBtn,
                            (!receiptImage || submitting) ? modalStyles.submitBtnDisabled : null,
                        ]}
                        onPress={handleSubmit}
                        disabled={!receiptImage || submitting}
                        activeOpacity={0.85}
                    >
                        {submitting ? (
                            <ActivityIndicator color={WHITE} size="small" />
                        ) : (
                            <View style={modalStyles.submitBtnContent}>
                                <Ionicons name="checkmark-circle-outline" size={20} color={WHITE} />
                                <Text style={modalStyles.submitBtnText}>Submit Repayment</Text>
                            </View>
                        )}
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={modalStyles.cancelBtn}
                        onPress={onClose}
                        disabled={submitting}
                        activeOpacity={0.7}
                    >
                        <Text style={modalStyles.cancelBtnText}>Cancel</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
}

// ══════════════════════════════════════════════════════════════════════════════
// ── HELPER COMPONENTS ─────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════

function SectionCard({ title, icon, children }) {
    return (
        <View style={styles.sectionCard}>
            <View style={styles.sectionCardHeader}>
                <View style={styles.sectionCardIconWrap}>
                    <Ionicons name={icon} size={16} color={GREEN_DARK} />
                </View>
                <Text style={styles.sectionCardTitle}>{title}</Text>
            </View>
            {children}
        </View>
    );
}

function DetailRow({ label, value, valueColor, bold }) {
    return (
        <View style={styles.detailRow}>
            <Text style={styles.detailRowLabel}>{label}</Text>
            <Text
                style={[
                    styles.detailRowValue,
                    bold && { fontFamily: FONTS.bold },
                    valueColor && { color: valueColor },
                ]}
            >
                {value}
            </Text>
        </View>
    );
}

function TermsRow({ label, value, highlight }) {
    return (
        <View style={[styles.termsRow, highlight && styles.termsRowHighlight]}>
            <Text style={[styles.termsRowLabel, highlight && styles.termsRowLabelBold]}>
                {label}
            </Text>
            <Text style={[styles.termsRowValue, highlight && styles.termsRowValueBold]}>
                {value}
            </Text>
        </View>
    );
}

// ══════════════════════════════════════════════════════════════════════════════
// ── MAIN SCREEN ───────────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════

export default function LoanDetailsScreen({ navigation, route }) {
    const { loanId } = route.params;
    const insets = useSafeAreaInsets();

    // ── Use context instead of local storage ──────────────────────────────────
    const { user, loadUser } = useUser(); // ← REPLACE local user state

    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [loan, setLoan] = useState(null);
    const [repaymentModalVisible, setRepaymentModalVisible] = useState(false);

    // ── Load user from context/storage on mount ────────────────────────────────
    useEffect(() => {
        loadUser(); // ← Ensures context has latest user with updated profile image
    }, []);

    // ── Fetch Loan Details ─────────────────────────────────────────────────────
    const fetchLoanDetails = async (isRefreshing = false) => {
        if (!isRefreshing) setLoading(true);
        try {
            const loanResult = await getLoanDetails(loanId);

            if (loanResult.success) {
                setLoan(loanResult.data);
            } else {
                handleApiError({ message: loanResult.message });
            }
        } catch (err) {
            handleApiError(err);
        } finally {
            setLoading(false);
            if (isRefreshing) setRefreshing(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            fetchLoanDetails();
        }, [loanId])
    );

    const onRefresh = () => {
        setRefreshing(true);
        fetchLoanDetails(true);
    };

    const handleRepaymentSuccess = () => {
        fetchLoanDetails(true);
    };

    // ── Get initials from context user ─────────────────────────────────────────
    const getUserInitials = () => {
        if (!user?.name) return 'U';
        const parts = user.name.trim().split(' ');
        if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
        return parts[0][0].toUpperCase();
    };

    const bottomPadding =
        Platform.OS === 'ios' ? 100 : insets.bottom > 0 ? insets.bottom + 80 : 80;

    // ── Loading State ──────────────────────────────────────────────────────────
    if (loading) {
        return (
            <View style={styles.container}>
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
                >
                    <LoadingSkeleton />
                </ScrollView>
            </View>
        );
    }

    // ── Error State ────────────────────────────────────────────────────────────
    if (!loan) {
        return (
            <View style={styles.container}>
                <Header
                    showLogo
                    showProfile
                    avatarText={getUserInitials()}
                    profileImageUrl={user?.profile_image || null} // ← ADD
                    onProfilePress={() => navigation.navigate('Profile')}
                />
                <View style={styles.errorState}>
                    <Ionicons name="alert-circle-outline" size={48} color={ERROR_RED} />
                    <Text style={styles.errorTitle}>Loan Not Found</Text>
                    <Text style={styles.errorText}>
                        Unable to fetch loan details. Please try again.
                    </Text>
                    <TouchableOpacity
                        style={styles.errorBtn}
                        onPress={() => navigation.goBack()}
                        activeOpacity={0.75}
                    >
                        <Text style={styles.errorBtnText}>Go Back</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    const statusCfg = getStatusConfig(loan.status);
    const actionCfg = getActionConfig(loan.action_status);
    const terms = loan.terms;

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
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        colors={[GREEN_DARK]}
                        tintColor={GREEN_DARK}
                    />
                }
            >
                {/* ── Hero Card ── */}
                <LinearGradient
                    colors={[GREEN_DARK, '#145C4D', '#0D4037']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.heroCard}
                >
                    <View style={styles.heroBubble1} />
                    <View style={styles.heroBubble2} />

                    <View style={[styles.heroStatusBadge, { backgroundColor: statusCfg.bg }]}>
                        <Ionicons name={statusCfg.icon} size={14} color={statusCfg.color} />
                        <Text style={[styles.heroStatusText, { color: statusCfg.color }]}>
                            {statusCfg.label}
                        </Text>
                    </View>

                    <Text style={styles.heroLabel}>Loan Amount</Text>
                    <Text style={styles.heroAmount}>
                        ₹{Number(loan.amount).toLocaleString('en-IN')}
                    </Text>

                    <View style={styles.heroMetaRow}>
                        <View style={styles.heroMeta}>
                            <Ionicons name="calendar-outline" size={13} color="rgba(255,255,255,0.7)" />
                            <Text style={styles.heroMetaText}>
                                Applied: {loan.formatted_applied_date}
                            </Text>
                        </View>
                        {loan.days_left && loan.days_left !== '-' && (
                            <View style={styles.heroMeta}>
                                <Ionicons name="time-outline" size={13} color="rgba(255,255,255,0.7)" />
                                <Text style={styles.heroMetaText}>{loan.days_left}</Text>
                            </View>
                        )}
                    </View>
                </LinearGradient>

                {/* ── Action Status ── */}
                {loan.action_status && loan.action_status !== 'none' ? (
                    <View style={[styles.actionCard, { backgroundColor: actionCfg.bg }]}>
                        <View style={[styles.actionIconWrap, { backgroundColor: actionCfg.color + '20' }]}>
                            <Ionicons name={actionCfg.icon} size={20} color={actionCfg.color} />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={[styles.actionTitle, { color: actionCfg.color }]}>
                                {actionCfg.label}
                            </Text>
                            <Text style={styles.actionSubtitle}>Current loan action status</Text>
                        </View>
                    </View>
                ) : null}

                {loan.show_pay_now_button ? (
                    <TouchableOpacity
                        style={styles.payNowBtn}
                        onPress={() =>
                            navigation.navigate('Payment', {
                                loanId: loanId,
                                totalPayable: terms?.total_payable || 0,
                            })
                        }
                        activeOpacity={0.85}
                    >
                        <LinearGradient
                            colors={['#22C55E', '#16A34A']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={styles.payNowBtnGradient}
                        >
                            <Ionicons name="card-outline" size={20} color={WHITE} />
                            <Text style={styles.payNowBtnText}>Pay Now</Text>
                            {terms?.total_payable ? (
                                <View style={styles.payNowAmount}>
                                    <Text style={styles.payNowAmountText}>
                                        {`₹${Number(terms.total_payable).toLocaleString('en-IN')}`}
                                    </Text>
                                </View>
                            ) : null}
                        </LinearGradient>
                    </TouchableOpacity>
                ) : null}

                {/* ── Loan Details Section ── */}
                <SectionCard title="Loan Details" icon="document-text-outline">
                    <DetailRow label="Loan ID" value={`#${loan.id}`} bold />
                    <DetailRow label="Purpose" value={loan.purpose || 'N/A'} />
                    <DetailRow label="Tenure" value={`${loan.tenure_days} Days`} />
                    {loan.interest_rate ? (
                        <DetailRow label="Interest Rate" value={`${loan.interest_rate}%`} />
                    ) : null}
                    <DetailRow label="Applied On" value={loan.formatted_applied_date} />
                    {terms?.due_date && terms.due_date !== 'N/A' ? (
                        <DetailRow label="Due Date" value={terms.due_date} valueColor={WARNING} />
                    ) : null}
                    {loan.days_left && loan.days_left !== '-' ? (
                        <DetailRow
                            label="Days Left"
                            value={loan.days_left}
                            valueColor={
                                loan.days_left === 'Paid'
                                    ? SUCCESS
                                    : loan.days_left?.includes('Remaining')
                                        ? WARNING
                                        : TEXT_DARK
                            }
                        />
                    ) : null}
                    {loan.repayment_method ? (
                        <DetailRow label="Repayment Method" value={loan.repayment_method} />
                    ) : null}
                    {loan.approved_at ? (
                        <DetailRow label="Approved At" value={loan.approved_at} valueColor={SUCCESS} />
                    ) : null}
                </SectionCard>

                {/* ── Loan Breakdown Section ── */}
                {terms ? (
                    <SectionCard title="Loan Breakdown" icon="receipt-outline">
                        <TermsRow
                            label="Principal Amount"
                            value={`₹${Number(terms.amount || 0).toLocaleString('en-IN')}`}
                        />
                        {Number(terms.processing_fee || 0) > 0 ? (
                            <TermsRow
                                label="Processing Fee"
                                value={`₹${Number(terms.processing_fee).toLocaleString('en-IN')}`}
                            />
                        ) : null}
                        {Number(terms.platform_charge || 0) > 0 ? (
                            <TermsRow
                                label="Platform Charge"
                                value={`₹${Number(terms.platform_charge).toLocaleString('en-IN')}`}
                            />
                        ) : null}
                        {Number(terms.gst_amount || 0) > 0 ? (
                            <TermsRow
                                label="GST Amount"
                                value={`₹${Number(terms.gst_amount).toLocaleString('en-IN')}`}
                            />
                        ) : null}
                        {Number(terms.due_charges || 0) > 0 ? (
                            <TermsRow
                                label="Due Charges"
                                value={`₹${Number(terms.due_charges).toLocaleString('en-IN')}`}
                                valueColor={ERROR_RED}
                            />
                        ) : null}
                        {terms.is_emi === 1 ? (
                            <>
                                <TermsRow label="EMI Count" value={`${terms.emi_count} EMIs`} />
                                <TermsRow
                                    label="EMI Amount"
                                    value={`₹${Number(terms.emi_amount).toLocaleString('en-IN')}`}
                                />
                            </>
                        ) : null}
                        {terms.total_payable ? (
                            <TermsRow
                                label="Total Payable"
                                value={`₹${Number(terms.total_payable).toLocaleString('en-IN')}`}
                                highlight
                            />
                        ) : null}
                    </SectionCard>
                ) : null}

                {loan.repayment_submitted_at ? (
                    <SectionCard title="Repayment Receipt" icon="checkmark-done-circle-outline">
                        <View style={styles.receiptSubmittedBox}>
                            <View style={styles.receiptSubmittedIcon}>
                                <Ionicons name="checkmark-circle" size={28} color={SUCCESS} />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.receiptSubmittedTitle}>Receipt Submitted</Text>
                                <Text style={styles.receiptSubmittedDate}>
                                    {`Submitted at: ${loan.repayment_submitted_at}`}
                                </Text>
                            </View>
                        </View>
                        <DetailRow label="Status" value="Under Review" valueColor={WARNING} />
                    </SectionCard>
                ) : null}

                {/* ── Back Button ── */}
                <TouchableOpacity
                    style={styles.backBtn}
                    onPress={() => navigation.goBack()}
                    activeOpacity={0.75}
                >
                    <Ionicons name="arrow-back-outline" size={18} color={GREEN_DARK} />
                    <Text style={styles.backBtnText}>Back to Loans</Text>
                </TouchableOpacity>
            </ScrollView>

            {/* ── Repayment Modal ── */}
            <RepaymentModal
                visible={repaymentModalVisible}
                onClose={() => setRepaymentModalVisible(false)}
                loanId={loanId}
                totalPayable={terms?.total_payable}
                onSuccess={handleRepaymentSuccess}
            />
        </View>
    );
}

// ══════════════════════════════════════════════════════════════════════════════
// ── STYLES ────────────────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: GRAY_BG },
    heroCard: {
        borderRadius: 20,
        padding: 22,
        marginTop: 14,
        marginBottom: 14,
        overflow: 'hidden',
        position: 'relative',
        elevation: 6,
        shadowColor: GREEN_DARK,
        shadowOpacity: 0.3,
        shadowRadius: 16,
        shadowOffset: { width: 0, height: 6 },
    },
    heroBubble1: {
        position: 'absolute',
        width: 160,
        height: 160,
        borderRadius: 80,
        backgroundColor: 'rgba(255,255,255,0.06)',
        top: -50,
        right: -40,
    },
    heroBubble2: {
        position: 'absolute',
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: 'rgba(255,255,255,0.04)',
        bottom: -20,
        left: 10,
    },
    heroStatusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        alignSelf: 'flex-start',
        paddingHorizontal: 12,
        paddingVertical: 5,
        borderRadius: 20,
        marginBottom: 14,
    },
    heroStatusText: { fontFamily: FONTS.semiBold, fontSize: 12 },
    heroLabel: {
        fontFamily: FONTS.regular,
        fontSize: 12,
        color: 'rgba(255,255,255,0.65)',
        marginBottom: 4,
    },
    heroAmount: { fontFamily: FONTS.bold, fontSize: 36, color: WHITE, marginBottom: 14 },
    heroMetaRow: { flexDirection: 'row', gap: 16, flexWrap: 'wrap' },
    heroMeta: { flexDirection: 'row', alignItems: 'center', gap: 5 },
    heroMetaText: { fontFamily: FONTS.regular, fontSize: 12, color: 'rgba(255,255,255,0.75)' },
    actionCard: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        borderRadius: 14,
        padding: 14,
        marginBottom: 14,
    },
    actionIconWrap: {
        width: 44,
        height: 44,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    actionTitle: { fontFamily: FONTS.semiBold, fontSize: 14, marginBottom: 2 },
    actionSubtitle: { fontFamily: FONTS.regular, fontSize: 11, color: TEXT_GRAY },
    payNowBtn: {
        borderRadius: 14,
        overflow: 'hidden',
        marginBottom: 14,
        elevation: 5,
        shadowColor: SUCCESS,
        shadowOpacity: 0.35,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 4 },
    },
    payNowBtnGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        gap: 12,
    },
    payNowBtnText: { fontFamily: FONTS.bold, fontSize: 16, color: WHITE },
    payNowAmount: {
        backgroundColor: 'rgba(255,255,255,0.2)',
        borderRadius: 20,
        paddingHorizontal: 12,
        paddingVertical: 4,
    },
    payNowAmountText: { fontFamily: FONTS.bold, fontSize: 14, color: WHITE },
    sectionCard: {
        backgroundColor: WHITE,
        borderRadius: 16,
        padding: 16,
        marginBottom: 14,
        elevation: 2,
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 2 },
    },
    sectionCardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 14,
        paddingBottom: 10,
        borderBottomWidth: 1,
        borderBottomColor: BORDER_CLR,
    },
    sectionCardIconWrap: {
        width: 34,
        height: 34,
        borderRadius: 9,
        backgroundColor: GREEN_LIGHT,
        justifyContent: 'center',
        alignItems: 'center',
    },
    sectionCardTitle: { fontFamily: FONTS.semiBold, fontSize: 15, color: TEXT_DARK },
    detailRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: BORDER_CLR,
    },
    detailRowLabel: { fontFamily: FONTS.regular, fontSize: 13, color: TEXT_GRAY },
    detailRowValue: {
        fontFamily: FONTS.semiBold,
        fontSize: 13,
        color: TEXT_DARK,
        maxWidth: '55%',
        textAlign: 'right',
    },
    termsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: BORDER_CLR,
    },
    termsRowHighlight: {
        backgroundColor: GREEN_LIGHT,
        marginHorizontal: -16,
        paddingHorizontal: 16,
        marginTop: 6,
        borderBottomWidth: 0,
        borderRadius: 8,
    },
    termsRowLabel: { fontFamily: FONTS.regular, fontSize: 13, color: TEXT_GRAY },
    termsRowLabelBold: { fontFamily: FONTS.bold, color: GREEN_DARK },
    termsRowValue: { fontFamily: FONTS.semiBold, fontSize: 13, color: TEXT_DARK },
    termsRowValueBold: { fontFamily: FONTS.bold, fontSize: 15, color: GREEN_DARK },
    receiptSubmittedBox: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        backgroundColor: '#F0FFF4',
        borderRadius: 10,
        padding: 12,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: '#BBF7D0',
    },
    receiptSubmittedIcon: {
        width: 44,
        height: 44,
        borderRadius: 12,
        backgroundColor: '#DCFCE7',
        justifyContent: 'center',
        alignItems: 'center',
    },
    receiptSubmittedTitle: { fontFamily: FONTS.semiBold, fontSize: 13, color: '#166534', marginBottom: 2 },
    receiptSubmittedDate: { fontFamily: FONTS.regular, fontSize: 11, color: '#15803D' },
    backBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        borderWidth: 1.5,
        borderColor: GREEN_DARK,
        borderRadius: 12,
        paddingVertical: 14,
        marginBottom: 8,
        backgroundColor: WHITE,
    },
    backBtnText: { fontFamily: FONTS.semiBold, fontSize: 14, color: GREEN_DARK },
    errorState: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 40,
    },
    errorTitle: { fontFamily: FONTS.bold, fontSize: 20, color: TEXT_DARK, marginTop: 16, marginBottom: 8 },
    errorText: {
        fontFamily: FONTS.regular,
        fontSize: 14,
        color: TEXT_GRAY,
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: 24,
    },
    errorBtn: { backgroundColor: GREEN_DARK, borderRadius: 12, paddingVertical: 14, paddingHorizontal: 32 },
    errorBtnText: { fontFamily: FONTS.semiBold, fontSize: 15, color: WHITE },
});

const modalStyles = StyleSheet.create({
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
    container: {
        backgroundColor: WHITE,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 24,
        paddingBottom: Platform.OS === 'ios' ? 40 : 24,
        elevation: 10,
        shadowColor: '#000',
        shadowOpacity: 0.2,
        shadowRadius: 20,
        shadowOffset: { width: 0, height: -5 },
    },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
    headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    headerIconBox: {
        width: 42,
        height: 42,
        borderRadius: 12,
        backgroundColor: GREEN_LIGHT,
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitle: { fontFamily: FONTS.bold, fontSize: 16, color: TEXT_DARK },
    headerSubtitle: { fontFamily: FONTS.regular, fontSize: 12, color: TEXT_GRAY },
    divider: { height: 1, backgroundColor: BORDER_CLR, marginBottom: 16 },
    amountBox: {
        backgroundColor: GREEN_LIGHT,
        borderRadius: 12,
        padding: 14,
        marginBottom: 14,
        alignItems: 'center',
    },
    amountLabel: { fontFamily: FONTS.regular, fontSize: 12, color: GREEN_DARK, marginBottom: 4 },
    amountValue: { fontFamily: FONTS.bold, fontSize: 28, color: GREEN_DARK },
    instructionBox: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 8,
        backgroundColor: '#EFF6FF',
        borderRadius: 10,
        padding: 12,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#BFDBFE',
    },
    instructionText: { fontFamily: FONTS.regular, fontSize: 12, color: '#1D4ED8', flex: 1, lineHeight: 18 },
    uploadLabel: { fontFamily: FONTS.medium, fontSize: 13, color: TEXT_DARK, marginBottom: 10 },
    uploadBox: {
        height: 160,
        borderWidth: 2,
        borderStyle: 'dashed',
        borderColor: BORDER_CLR,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: GRAY_BG,
        overflow: 'hidden',
        marginBottom: 10,
    },
    uploadBoxFilled: { borderColor: GREEN_DARK, borderStyle: 'solid' },
    uploadPlaceholder: { alignItems: 'center', gap: 8 },
    uploadIconBox: {
        width: 56,
        height: 56,
        borderRadius: 16,
        backgroundColor: GREEN_LIGHT,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 4,
    },
    uploadTitle: { fontFamily: FONTS.semiBold, fontSize: 14, color: TEXT_DARK },
    uploadSubtitle: { fontFamily: FONTS.regular, fontSize: 12, color: TEXT_GRAY, textAlign: 'center' },
    receiptPreview: { width: '100%', height: '100%' },
    receiptOverlay: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: 'rgba(0,0,0,0.45)',
        paddingVertical: 8,
        alignItems: 'center',
        gap: 2,
    },
    receiptOverlayText: { fontFamily: FONTS.medium, fontSize: 12, color: WHITE },
    receiptStatus: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 16 },
    receiptStatusText: { fontFamily: FONTS.medium, fontSize: 13, color: SUCCESS },
    submitBtn: {
        backgroundColor: GREEN_DARK,
        borderRadius: 12,
        paddingVertical: 16,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 10,
        elevation: 3,
        shadowColor: GREEN_DARK,
        shadowOpacity: 0.3,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 3 },
    },
    submitBtnDisabled: { opacity: 0.55 },
    submitBtnContent: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    submitBtnText: { fontFamily: FONTS.bold, fontSize: 15, color: WHITE },
    cancelBtn: { paddingVertical: 12, alignItems: 'center' },
    cancelBtnText: { fontFamily: FONTS.medium, fontSize: 14, color: TEXT_GRAY },
});