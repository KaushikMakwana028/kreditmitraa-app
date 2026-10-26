// screens/PaymentScreen.jsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
    Platform,
    Alert,
    Image,
    ActivityIndicator,
    Modal,
    Animated,
    Clipboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import Header from '../components/Header';
import { COLORS } from '../constants/colors';
import { FONTS } from '../constants/fonts';
import { getAdminPaymentDetails, submitLoanRepayment } from '../services/api/loansService';
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

// ══════════════════════════════════════════════════════════════════════════════
// ── SKELETON COMPONENTS ───────────────────────────────────────────────────────
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
            <SkeletonBox width="100%" height={100} borderRadius={16} style={{ marginBottom: 16 }} />
            <SkeletonBox width="100%" height={200} borderRadius={16} style={{ marginBottom: 16 }} />
            <SkeletonBox width="100%" height={220} borderRadius={16} style={{ marginBottom: 16 }} />
            <SkeletonBox width="100%" height={180} borderRadius={16} style={{ marginBottom: 16 }} />
        </>
    );
}

// ══════════════════════════════════════════════════════════════════════════════
// ── HELPER COMPONENTS ─────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════

function SectionCard({ title, icon, iconBg, iconColor, children }) {
    return (
        <View style={styles.sectionCard}>
            <View style={styles.sectionCardHeader}>
                <View style={[styles.sectionCardIconWrap, { backgroundColor: iconBg || GREEN_LIGHT }]}>
                    <Ionicons name={icon} size={18} color={iconColor || GREEN_DARK} />
                </View>
                <Text style={styles.sectionCardTitle}>{title}</Text>
            </View>
            {children}
        </View>
    );
}

function BankDetailRow({ label, value, copyable }) {
    const handleCopy = () => {
        Clipboard.setString(value);
        Alert.alert('Copied!', `${label} copied to clipboard.`);
    };
    return (
        <View style={styles.bankDetailRow}>
            <View style={{ flex: 1 }}>
                <Text style={styles.bankDetailLabel}>{label}</Text>
                <Text style={styles.bankDetailValue}>{value || 'N/A'}</Text>
            </View>
            {copyable && value ? (
                <TouchableOpacity style={styles.copyIconBtn} onPress={handleCopy} activeOpacity={0.7}>
                    <Ionicons name="copy-outline" size={16} color={GREEN_DARK} />
                </TouchableOpacity>
            ) : null}
        </View>
    );
}

function QrModal({ visible, imageUri, onClose }) {
    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
            <TouchableOpacity style={styles.qrModalOverlay} activeOpacity={1} onPress={onClose}>
                <View style={styles.qrModalContent}>
                    <View style={styles.qrModalHeader}>
                        <Text style={styles.qrModalTitle}>Scan QR Code</Text>
                        <TouchableOpacity onPress={onClose}>
                            <Ionicons name="close-circle" size={28} color={TEXT_GRAY} />
                        </TouchableOpacity>
                    </View>
                    <Image source={{ uri: imageUri }} style={styles.qrModalImage} resizeMode="contain" />
                    <Text style={styles.qrModalHint}>Tap anywhere outside to close</Text>
                </View>
            </TouchableOpacity>
        </Modal>
    );
}

// ══════════════════════════════════════════════════════════════════════════════
// ── MAIN SCREEN ───────────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════

export default function PaymentScreen({ navigation, route }) {
    const { loanId, totalPayable } = route.params;
    const insets = useSafeAreaInsets();

    // ── Use context instead of local storage ──────────────────────────────────
    const { user, loadUser } = useUser(); // ← REPLACE local user state

    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [paymentDetails, setPaymentDetails] = useState(null);
    const [receiptImage, setReceiptImage] = useState(null);
    const [qrModalVisible, setQrModalVisible] = useState(false);

    // ── Load user from context on mount ───────────────────────────────────────
    useEffect(() => {
        loadUser(); // ← Ensures context has latest user with updated profile image
    }, []);

    // ── Fetch Payment Details ──────────────────────────────────────────────────
    const fetchPaymentDetails = async () => {
        setLoading(true);
        try {
            const result = await getAdminPaymentDetails(); // ← Removed getUserData()
            if (result.success) {
                setPaymentDetails(result.data);
            } else {
                handleApiError({ message: result.message });
            }
        } catch (err) {
            handleApiError(err);
        } finally {
            setLoading(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            fetchPaymentDetails();
        }, [])
    );

    // ── Image Picker ───────────────────────────────────────────────────────────
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

    const copyUpiId = () => {
        const upiId = paymentDetails?.payment_settings?.upi_id;
        if (upiId) {
            Clipboard.setString(upiId);
            Alert.alert('Copied!', 'UPI ID copied to clipboard.');
        }
    };

    // ── Submit Repayment ───────────────────────────────────────────────────────
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
                Alert.alert(
                    'Submitted Successfully! ✅',
                    result.message || 'Your loan repayment details have been submitted successfully.',
                    [{ text: 'OK', onPress: () => navigation.goBack() }]
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

    // ── Get initials from context user ─────────────────────────────────────────
    const getUserInitials = () => {
        if (!user?.name) return 'U';
        const parts = user.name.trim().split(' ');
        if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
        return parts[0][0].toUpperCase();
    };

    const formattedAmount = totalPayable ? `₹${Number(totalPayable).toLocaleString('en-IN')}` : '₹0';
    const bottomPadding = Platform.OS === 'ios' ? 100 : insets.bottom > 0 ? insets.bottom + 80 : 80;
    const upi = paymentDetails?.payment_settings;
    const bank = paymentDetails?.admin_bank;

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
            >
                <Text style={styles.pageTitle}>Make Payment</Text>
                <Text style={styles.pageSubtitle}>
                    Pay using UPI or bank transfer and upload your receipt.
                </Text>

                {loading ? (
                    <LoadingSkeleton />
                ) : (
                    <>
                        {/* ── Amount Banner ── */}
                        <LinearGradient
                            colors={[GREEN_DARK, '#145C4D']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={styles.amountBanner}
                        >
                            <View style={styles.amountBannerBubble1} />
                            <View style={styles.amountBannerBubble2} />
                            <View style={styles.amountBannerContent}>
                                <View>
                                    <Text style={styles.amountBannerLabel}>Total Amount to Pay</Text>
                                    <Text style={styles.amountBannerValue}>{formattedAmount}</Text>
                                </View>
                                <View style={styles.amountBannerBadge}>
                                    <Ionicons name="shield-checkmark" size={14} color={WHITE} />
                                    <Text style={styles.amountBannerBadgeText}>Secure</Text>
                                </View>
                            </View>
                            <View style={styles.amountBannerLoanRow}>
                                <Ionicons name="document-text-outline" size={13} color="rgba(255,255,255,0.7)" />
                                <Text style={styles.amountBannerLoanText}>{`Loan ID: #${loanId}`}</Text>
                            </View>
                        </LinearGradient>

                        {/* ── Instructions ── */}
                        <View style={styles.instructionCard}>
                            <View style={styles.instructionIconBox}>
                                <Ionicons name="information-circle" size={20} color="#3B82F6" />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.instructionTitle}>How to Pay</Text>
                                <Text style={styles.instructionText}>
                                    {'1. Pay using UPI ID or scan the QR code.\n'}
                                    {'2. Or transfer to the bank account below.\n'}
                                    {'3. Upload your payment receipt at the bottom.'}
                                </Text>
                            </View>
                        </View>

                        {/* ── UPI Payment Section ── */}
                        {upi ? (
                            <SectionCard title="UPI Payment" icon="phone-portrait-outline" iconBg="#EFF6FF" iconColor="#3B82F6">
                                {upi.qr_image ? (
                                    <TouchableOpacity
                                        style={styles.qrContainer}
                                        onPress={() => setQrModalVisible(true)}
                                        activeOpacity={0.85}
                                    >
                                        <Image source={{ uri: upi.qr_image }} style={styles.qrImage} resizeMode="contain" />
                                        <View style={styles.qrOverlay}>
                                            <View style={styles.qrOverlayBadge}>
                                                <Ionicons name="expand-outline" size={14} color={WHITE} />
                                                <Text style={styles.qrOverlayText}>Tap to enlarge</Text>
                                            </View>
                                        </View>
                                    </TouchableOpacity>
                                ) : null}

                                <Text style={styles.qrScanHint}>Scan QR code using any UPI app</Text>

                                <View style={styles.orDivider}>
                                    <View style={styles.orDividerLine} />
                                    <Text style={styles.orDividerText}>OR PAY USING UPI ID</Text>
                                    <View style={styles.orDividerLine} />
                                </View>

                                <View style={styles.upiIdBox}>
                                    <View style={styles.upiIdLeft}>
                                        <View style={styles.upiIdIconBox}>
                                            <Ionicons name="at-outline" size={18} color="#3B82F6" />
                                        </View>
                                        <View>
                                            <Text style={styles.upiIdLabel}>UPI ID</Text>
                                            <Text style={styles.upiIdValue}>{upi.upi_id}</Text>
                                        </View>
                                    </View>
                                    <TouchableOpacity style={styles.upiCopyBtn} onPress={copyUpiId} activeOpacity={0.75}>
                                        <Ionicons name="copy-outline" size={15} color={GREEN_DARK} />
                                        <Text style={styles.upiCopyBtnText}>Copy</Text>
                                    </TouchableOpacity>
                                </View>

                                <View style={styles.supportedAppsRow}>
                                    {['Google Pay', 'PhonePe', 'Paytm', 'BHIM'].map((app) => (
                                        <View key={app} style={styles.supportedAppChip}>
                                            <Text style={styles.supportedAppText}>{app}</Text>
                                        </View>
                                    ))}
                                </View>
                            </SectionCard>
                        ) : null}

                        {/* ── Bank Transfer Section ── */}
                        {bank ? (
                            <SectionCard title="Bank Transfer" icon="business-outline" iconBg="#FFF8E5" iconColor="#F59E0B">
                                <BankDetailRow label="Account Holder Name" value={bank.account_holder_name} copyable />
                                <BankDetailRow label="Bank Name" value={bank.bank_name} />
                                <BankDetailRow label="Account Number" value={bank.account_number} copyable />
                                <BankDetailRow label="IFSC Code" value={bank.ifsc_code} copyable />
                                {bank.account_type ? <BankDetailRow label="Account Type" value={bank.account_type} /> : null}
                                {bank.branch_name ? <BankDetailRow label="Branch Name" value={bank.branch_name} /> : null}
                                <View style={styles.bankNote}>
                                    <Ionicons name="information-circle-outline" size={14} color={TEXT_GRAY} />
                                    <Text style={styles.bankNoteText}>
                                        Use NEFT / RTGS / IMPS for bank transfer. Add Loan ID in remarks.
                                    </Text>
                                </View>
                            </SectionCard>
                        ) : null}

                        {/* ── Upload Receipt Section ── */}
                        <SectionCard
                            title="Upload Payment Receipt"
                            icon="cloud-upload-outline"
                            iconBg="#F0FFF4"
                            iconColor={SUCCESS}
                        >
                            <Text style={styles.uploadHint}>
                                After making payment, upload the screenshot or receipt as proof.
                            </Text>
                            <TouchableOpacity
                                style={[styles.uploadBox, receiptImage ? styles.uploadBoxFilled : null]}
                                onPress={pickReceiptImage}
                                activeOpacity={0.75}
                                disabled={submitting}
                            >
                                {receiptImage ? (
                                    <View style={{ width: '100%', height: '100%' }}>
                                        <Image source={{ uri: receiptImage.uri }} style={styles.receiptPreview} />
                                        <View style={styles.receiptChangeOverlay}>
                                            <Ionicons name="camera-outline" size={22} color={WHITE} />
                                            <Text style={styles.receiptChangeText}>Tap to change</Text>
                                        </View>
                                    </View>
                                ) : (
                                    <View style={styles.uploadPlaceholder}>
                                        <View style={styles.uploadIconBox}>
                                            <Ionicons name="cloud-upload-outline" size={34} color={GREEN_DARK} />
                                        </View>
                                        <Text style={styles.uploadTitle}>Upload Receipt</Text>
                                        <Text style={styles.uploadSubtitle}>
                                            Tap to take photo or choose from gallery
                                        </Text>
                                        <View style={styles.uploadTypeRow}>
                                            <View style={styles.uploadTypeChip}>
                                                <Ionicons name="camera-outline" size={13} color={GREEN_DARK} />
                                                <Text style={styles.uploadTypeText}>Camera</Text>
                                            </View>
                                            <View style={styles.uploadTypeChip}>
                                                <Ionicons name="images-outline" size={13} color={GREEN_DARK} />
                                                <Text style={styles.uploadTypeText}>Gallery</Text>
                                            </View>
                                        </View>
                                    </View>
                                )}
                            </TouchableOpacity>

                            {receiptImage ? (
                                <View style={styles.receiptStatusRow}>
                                    <Ionicons name="checkmark-circle" size={16} color={SUCCESS} />
                                    <Text style={styles.receiptStatusText}>Receipt selected successfully</Text>
                                    <TouchableOpacity
                                        onPress={() => setReceiptImage(null)}
                                        style={styles.receiptRemoveBtn}
                                        activeOpacity={0.7}
                                    >
                                        <Ionicons name="trash-outline" size={15} color={ERROR_RED} />
                                        <Text style={styles.receiptRemoveText}>Remove</Text>
                                    </TouchableOpacity>
                                </View>
                            ) : null}
                        </SectionCard>

                        {/* ── Important Note ── */}
                        <View style={styles.warningCard}>
                            <Ionicons name="warning-outline" size={18} color={WARNING} />
                            <Text style={styles.warningText}>
                                {'Please ensure the payment amount matches exactly '}
                                <Text style={styles.warningAmountText}>{formattedAmount}</Text>
                                {'. Admin will verify within 24 hours after receipt submission.'}
                            </Text>
                        </View>

                        {/* ── Submit Button ── */}
                        <TouchableOpacity
                            style={[styles.submitBtn, (!receiptImage || submitting) ? styles.submitBtnDisabled : null]}
                            onPress={handleSubmit}
                            disabled={!receiptImage || submitting}
                            activeOpacity={0.85}
                        >
                            <LinearGradient
                                colors={!receiptImage || submitting ? ['#9CA3AF', '#6B7280'] : [SUCCESS, '#16A34A']}
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
                                        <Ionicons name="checkmark-circle-outline" size={20} color={WHITE} />
                                        <Text style={styles.submitBtnText}>Submit Payment Receipt</Text>
                                    </>
                                )}
                            </LinearGradient>
                        </TouchableOpacity>

                        {/* ── Cancel / Back ── */}
                        <TouchableOpacity
                            style={styles.cancelBtn}
                            onPress={() => navigation.goBack()}
                            activeOpacity={0.7}
                            disabled={submitting}
                        >
                            <Ionicons name="arrow-back-outline" size={16} color={TEXT_GRAY} />
                            <Text style={styles.cancelBtnText}>Go Back</Text>
                        </TouchableOpacity>
                    </>
                )}
            </ScrollView>

            {/* ── QR Fullscreen Modal ── */}
            {upi?.qr_image ? (
                <QrModal
                    visible={qrModalVisible}
                    imageUri={upi.qr_image}
                    onClose={() => setQrModalVisible(false)}
                />
            ) : null}
        </View>
    );
}

// ── Styles (unchanged) ────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: GRAY_BG },
    pageTitle: { fontFamily: FONTS.bold, fontSize: 22, color: TEXT_DARK, marginTop: 14, marginBottom: 4 },
    pageSubtitle: { fontFamily: FONTS.regular, fontSize: 12, color: TEXT_GRAY, lineHeight: 18, marginBottom: 16 },
    amountBanner: { borderRadius: 16, padding: 20, marginBottom: 16, overflow: 'hidden', elevation: 5, shadowColor: GREEN_DARK, shadowOpacity: 0.3, shadowRadius: 12, shadowOffset: { width: 0, height: 4 } },
    amountBannerBubble1: { position: 'absolute', width: 120, height: 120, borderRadius: 60, backgroundColor: 'rgba(255,255,255,0.07)', top: -30, right: -20 },
    amountBannerBubble2: { position: 'absolute', width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(255,255,255,0.05)', bottom: -15, left: 10 },
    amountBannerContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
    amountBannerLabel: { fontFamily: FONTS.regular, fontSize: 12, color: 'rgba(255,255,255,0.75)', marginBottom: 4 },
    amountBannerValue: { fontFamily: FONTS.bold, fontSize: 32, color: WHITE },
    amountBannerBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
    amountBannerBadgeText: { fontFamily: FONTS.semiBold, fontSize: 12, color: WHITE },
    amountBannerLoanRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
    amountBannerLoanText: { fontFamily: FONTS.regular, fontSize: 12, color: 'rgba(255,255,255,0.7)' },
    instructionCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, backgroundColor: '#EFF6FF', borderRadius: 14, padding: 14, marginBottom: 16, borderWidth: 1, borderColor: '#BFDBFE' },
    instructionIconBox: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#DBEAFE', justifyContent: 'center', alignItems: 'center' },
    instructionTitle: { fontFamily: FONTS.semiBold, fontSize: 13, color: '#1E40AF', marginBottom: 4 },
    instructionText: { fontFamily: FONTS.regular, fontSize: 12, color: '#1D4ED8', lineHeight: 20 },
    sectionCard: { backgroundColor: WHITE, borderRadius: 16, padding: 16, marginBottom: 16, elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, shadowOffset: { width: 0, height: 2 } },
    sectionCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: BORDER_CLR },
    sectionCardIconWrap: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
    sectionCardTitle: { fontFamily: FONTS.semiBold, fontSize: 15, color: TEXT_DARK },
    qrContainer: { alignSelf: 'center', width: 200, height: 200, borderRadius: 16, overflow: 'hidden', marginBottom: 10, borderWidth: 2, borderColor: BORDER_CLR, position: 'relative' },
    qrImage: { width: '100%', height: '100%' },
    qrOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.4)', padding: 6, alignItems: 'center' },
    qrOverlayBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    qrOverlayText: { fontFamily: FONTS.medium, fontSize: 11, color: WHITE },
    qrScanHint: { fontFamily: FONTS.regular, fontSize: 12, color: TEXT_GRAY, textAlign: 'center', marginBottom: 16 },
    orDivider: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
    orDividerLine: { flex: 1, height: 1, backgroundColor: BORDER_CLR },
    orDividerText: { fontFamily: FONTS.semiBold, fontSize: 10, color: TEXT_GRAY, letterSpacing: 0.5 },
    upiIdBox: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#EFF6FF', borderRadius: 12, padding: 14, marginBottom: 14, borderWidth: 1, borderColor: '#BFDBFE' },
    upiIdLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
    upiIdIconBox: { width: 38, height: 38, borderRadius: 10, backgroundColor: '#DBEAFE', justifyContent: 'center', alignItems: 'center' },
    upiIdLabel: { fontFamily: FONTS.regular, fontSize: 11, color: '#1D4ED8', marginBottom: 2 },
    upiIdValue: { fontFamily: FONTS.bold, fontSize: 14, color: '#1E40AF' },
    upiCopyBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: GREEN_LIGHT, borderRadius: 8, paddingVertical: 8, paddingHorizontal: 12, borderWidth: 1, borderColor: GREEN_DARK },
    upiCopyBtnText: { fontFamily: FONTS.semiBold, fontSize: 12, color: GREEN_DARK },
    supportedAppsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    supportedAppChip: { backgroundColor: GRAY_BG, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5, borderWidth: 1, borderColor: BORDER_CLR },
    supportedAppText: { fontFamily: FONTS.medium, fontSize: 11, color: TEXT_GRAY },
    bankDetailRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: BORDER_CLR },
    bankDetailLabel: { fontFamily: FONTS.regular, fontSize: 11, color: TEXT_GRAY, marginBottom: 3 },
    bankDetailValue: { fontFamily: FONTS.semiBold, fontSize: 14, color: TEXT_DARK },
    copyIconBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: GREEN_LIGHT, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: GREEN_DARK },
    bankNote: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, backgroundColor: GRAY_BG, borderRadius: 10, padding: 10, marginTop: 10 },
    bankNoteText: { fontFamily: FONTS.regular, fontSize: 11, color: TEXT_GRAY, flex: 1, lineHeight: 17 },
    uploadHint: { fontFamily: FONTS.regular, fontSize: 12, color: TEXT_GRAY, marginBottom: 12, lineHeight: 18 },
    uploadBox: { height: 180, borderWidth: 2, borderStyle: 'dashed', borderColor: BORDER_CLR, borderRadius: 14, justifyContent: 'center', alignItems: 'center', backgroundColor: GRAY_BG, overflow: 'hidden', marginBottom: 10 },
    uploadBoxFilled: { borderColor: SUCCESS, borderStyle: 'solid' },
    uploadPlaceholder: { alignItems: 'center', gap: 6, paddingHorizontal: 20 },
    uploadIconBox: { width: 60, height: 60, borderRadius: 16, backgroundColor: GREEN_LIGHT, justifyContent: 'center', alignItems: 'center', marginBottom: 4 },
    uploadTitle: { fontFamily: FONTS.semiBold, fontSize: 15, color: TEXT_DARK },
    uploadSubtitle: { fontFamily: FONTS.regular, fontSize: 12, color: TEXT_GRAY, textAlign: 'center' },
    uploadTypeRow: { flexDirection: 'row', gap: 10, marginTop: 8 },
    uploadTypeChip: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: GREEN_LIGHT, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5 },
    uploadTypeText: { fontFamily: FONTS.medium, fontSize: 11, color: GREEN_DARK },
    receiptPreview: { width: '100%', height: '100%' },
    receiptChangeOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.45)', paddingVertical: 8, alignItems: 'center', gap: 2 },
    receiptChangeText: { fontFamily: FONTS.medium, fontSize: 12, color: WHITE },
    receiptStatusRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    receiptStatusText: { fontFamily: FONTS.medium, fontSize: 13, color: SUCCESS, flex: 1 },
    receiptRemoveBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4 },
    receiptRemoveText: { fontFamily: FONTS.medium, fontSize: 12, color: ERROR_RED },
    warningCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, backgroundColor: '#FFFBEB', borderRadius: 12, padding: 14, marginBottom: 16, borderWidth: 1, borderColor: '#FDE68A' },
    warningText: { fontFamily: FONTS.regular, fontSize: 12, color: '#92400E', flex: 1, lineHeight: 18 },
    warningAmountText: { fontFamily: FONTS.bold, color: '#92400E' },
    submitBtn: { borderRadius: 14, overflow: 'hidden', marginBottom: 12, elevation: 4, shadowColor: SUCCESS, shadowOpacity: 0.3, shadowRadius: 8, shadowOffset: { width: 0, height: 4 } },
    submitBtnDisabled: { opacity: 0.6, elevation: 0 },
    submitBtnGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, gap: 10 },
    submitBtnText: { fontFamily: FONTS.bold, fontSize: 15, color: WHITE },
    cancelBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 14, marginBottom: 8 },
    cancelBtnText: { fontFamily: FONTS.medium, fontSize: 14, color: TEXT_GRAY },
    qrModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center', padding: 20 },
    qrModalContent: { backgroundColor: WHITE, borderRadius: 20, padding: 20, width: '100%', alignItems: 'center' },
    qrModalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', alignSelf: 'stretch', marginBottom: 16 },
    qrModalTitle: { fontFamily: FONTS.bold, fontSize: 18, color: TEXT_DARK },
    qrModalImage: { width: 280, height: 280, borderRadius: 12, marginBottom: 14 },
    qrModalHint: { fontFamily: FONTS.regular, fontSize: 12, color: TEXT_GRAY, textAlign: 'center' },
});