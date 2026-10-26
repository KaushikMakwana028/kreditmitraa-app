// screens/WithdrawalScreen.jsx
import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
    TextInput,
    Platform,
    Animated,
    RefreshControl,
    ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Header from '../components/Header';
import { COLORS } from '../constants/colors';
import { FONTS } from '../constants/fonts';
import { getWalletTransactions, submitWithdrawal } from '../services/api/referralService';
import { handleApiError } from '../services/utils/errorHandler';
import { useUser } from '../context/UserContext'; // ← ADD

// ─── Design Tokens ────────────────────────────────────────────────────────────
const GREEN_DARK = COLORS.primary || '#1A3C34';
const GREEN_LIGHT = '#E8F5F0';
const SUCCESS = '#22C55E';
const GRAY_BG = COLORS.background || '#F5F7FA';
const WHITE = '#FFFFFF';
const TEXT_DARK = COLORS.black || '#1A1A2E';
const TEXT_GRAY = COLORS.gray || '#6B7280';
const BORDER_CLR = '#E5E7EB';
const ERROR_RED = '#EF4444';
const WARNING = '#F59E0B';

const WITHDRAWAL_STATUS = {
    approved: { bg: '#DCFCE7', text: SUCCESS, label: 'Approved', icon: 'checkmark-circle' },
    pending: { bg: '#FEF3C7', text: WARNING, label: 'Pending', icon: 'time-outline' },
    rejected: { bg: '#FEE2E2', text: ERROR_RED, label: 'Rejected', icon: 'close-circle-outline' },
};

// ══════════════════════════════════════════════════════════════════════════════
// ── CUSTOM TOAST ──────────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════

function CustomToast({ visible, type = 'success', message, onHide }) {
    const insets = useSafeAreaInsets();
    const translateY = useRef(new Animated.Value(-100)).current;
    const opacity = useRef(new Animated.Value(0)).current;

    const config = {
        success: {
            icon: 'checkmark-circle',
            iconColor: SUCCESS,
            gradient: [SUCCESS, '#16A34A'],
            bgColor: '#DCFCE7',
            borderColor: '#BBF7D0',
            textColor: '#166534',
        },
        error: {
            icon: 'close-circle',
            iconColor: ERROR_RED,
            gradient: [ERROR_RED, '#DC2626'],
            bgColor: '#FEE2E2',
            borderColor: '#FECACA',
            textColor: '#991B1B',
        },
    }[type];

    useEffect(() => {
        if (visible) {
            Animated.parallel([
                Animated.spring(translateY, { toValue: 0, useNativeDriver: true, tension: 50, friction: 8 }),
                Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
            ]).start();

            const timer = setTimeout(() => hideToast(), 4000);
            return () => clearTimeout(timer);
        } else {
            hideToast();
        }
    }, [visible]);

    const hideToast = () => {
        Animated.parallel([
            Animated.timing(translateY, { toValue: -100, duration: 250, useNativeDriver: true }),
            Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }),
        ]).start(() => { if (onHide) onHide(); });
    };

    if (!visible && opacity._value === 0) return null;

    return (
        <Animated.View
            style={[toastStyles.container, { top: insets.top + 10, transform: [{ translateY }], opacity }]}
        >
            <View
                style={[toastStyles.toast, { backgroundColor: config.bgColor, borderColor: config.borderColor }]}
            >
                <LinearGradient colors={config.gradient} style={toastStyles.iconGradient}>
                    <Ionicons name={config.icon} size={24} color={WHITE} />
                </LinearGradient>
                <Text style={[toastStyles.message, { color: config.textColor }]}>{message}</Text>
                <TouchableOpacity style={toastStyles.closeButton} onPress={hideToast} activeOpacity={0.7}>
                    <Ionicons name="close" size={18} color={config.textColor} />
                </TouchableOpacity>
            </View>
        </Animated.View>
    );
}

const toastStyles = StyleSheet.create({
    container: { position: 'absolute', left: 16, right: 16, zIndex: 9999, elevation: 9999 },
    toast: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        shadowColor: '#000',
        shadowOpacity: 0.2,
        shadowRadius: 16,
        shadowOffset: { width: 0, height: 8 },
        elevation: 10,
        gap: 12,
    },
    iconGradient: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
    message: { flex: 1, fontFamily: FONTS.medium, fontSize: 14, lineHeight: 20 },
    closeButton: { width: 30, height: 30, borderRadius: 15, justifyContent: 'center', alignItems: 'center' },
});

// ══════════════════════════════════════════════════════════════════════════════
// ── SKELETON ──────────────────────────────────────────────────────────────────
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
            <SkeletonBox width="100%" height={160} borderRadius={16} style={{ marginBottom: 16 }} />
            <SkeletonBox width="100%" height={130} borderRadius={14} style={{ marginBottom: 16 }} />
            <SkeletonBox width={160} height={16} borderRadius={4} style={{ marginBottom: 12 }} />
            {[1, 2, 3].map((i) => (
                <SkeletonBox key={i} width="100%" height={100} borderRadius={14} style={{ marginBottom: 10 }} />
            ))}
        </>
    );
}

// ══════════════════════════════════════════════════════════════════════════════
// ── COMPONENTS ────────────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════

function WithdrawalItem({ item }) {
    const badge = WITHDRAWAL_STATUS[item.status] || WITHDRAWAL_STATUS.pending;
    return (
        <View style={styles.historyCard}>
            <View style={styles.historyHeader}>
                <View style={[styles.historyIconWrap, { backgroundColor: badge.bg }]}>
                    <Ionicons name={badge.icon} size={22} color={badge.text} />
                </View>
                <View style={styles.historyNameBlock}>
                    <Text style={styles.historyName}>Withdrawal Request</Text>
                    <Text style={styles.historyPhone}>{item.formatted_date_submitted}</Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: badge.bg }]}>
                    <Text style={[styles.statusText, { color: badge.text }]}>{badge.label}</Text>
                </View>
            </View>
            <View style={styles.detailsGrid}>
                <View style={styles.detailCell}>
                    <Text style={styles.detailLabel}>AMOUNT REQUESTED</Text>
                    <Text style={styles.detailValue}>₹{item.amount.toLocaleString('en-IN')}</Text>
                </View>
                <View style={styles.detailCell}>
                    <Text style={styles.detailLabel}>ADMIN NOTE</Text>
                    <Text style={styles.detailValue}>
                        {item.admin_note && item.admin_note !== '-' ? item.admin_note : '—'}
                    </Text>
                </View>
            </View>
        </View>
    );
}

function EmptyState() {
    return (
        <View style={styles.emptyCard}>
            <Ionicons name="cash-outline" size={36} color={TEXT_GRAY} />
            <Text style={styles.emptyTitle}>No Withdrawals Yet</Text>
            <Text style={styles.emptySub}>
                Your withdrawal history will appear here once you make a request.
            </Text>
        </View>
    );
}

// ══════════════════════════════════════════════════════════════════════════════
// ── MAIN SCREEN ───────────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════

export default function WithdrawalScreen({ navigation }) {
    const insets = useSafeAreaInsets();

    // ── Use context instead of local storage ──────────────────────────────────
    const { user, loadUser } = useUser(); // ← REPLACE local user state

    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    const [totalEarned, setTotalEarned] = useState(0);
    const [walletBalance, setWalletBalance] = useState(0);
    const [minWithdrawal, setMinWithdrawal] = useState(0);
    const [withdrawalRequests, setWithdrawalRequests] = useState([]);

    const [withdrawAmount, setWithdrawAmount] = useState('');

    const [toast, setToast] = useState({ visible: false, type: 'success', message: '' });

    // ── Load user from context on mount ───────────────────────────────────────
    useEffect(() => {
        loadUser(); // ← Ensures context has latest user with updated profile image
        fetchData();
    }, []);

    // ── Fetch Wallet Data ──────────────────────────────────────────────────────
    const fetchData = async (isRefresh = false) => {
        if (isRefresh) {
            setRefreshing(true);
        } else {
            setLoading(true);
        }

        try {
            const walletResult = await getWalletTransactions(); // ← Removed getUserData()

            if (walletResult.success) {
                const d = walletResult.data;
                setTotalEarned(d.total_earned || 0);
                setWalletBalance(d.wallet_balance || 0);
                setMinWithdrawal(d.min_withdrawal || 0);
                setWithdrawalRequests(d.withdrawal_requests || []);
            } else {
                showToast('error', walletResult.message);
            }
        } catch (err) {
            showToast('error', err.message || 'Failed to load data');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const showToast = (type, message) => setToast({ visible: true, type, message });
    const hideToast = () => setToast({ visible: false, type: toast.type, message: '' });

    // ── Withdraw Handler ───────────────────────────────────────────────────────
    const handleWithdraw = async () => {
        const amount = Number(withdrawAmount);

        if (!withdrawAmount.trim()) {
            showToast('error', 'Please enter an amount.');
            return;
        }
        if (isNaN(amount) || amount <= 0) {
            showToast('error', 'Please enter a valid amount.');
            return;
        }
        if (amount < minWithdrawal) {
            showToast('error', `Minimum withdrawal amount is ₹${minWithdrawal.toLocaleString('en-IN')}.`);
            return;
        }
        if (amount > walletBalance) {
            showToast('error', `Amount exceeds your wallet balance of ₹${walletBalance.toLocaleString('en-IN')}.`);
            return;
        }

        setSubmitting(true);
        try {
            const result = await submitWithdrawal(amount);
            if (result.success) {
                showToast('success', result.message);
                if (result.data) {
                    setTotalEarned(result.data.total_earned || 0);
                    setWalletBalance(result.data.wallet_balance || 0);
                    setMinWithdrawal(result.data.min_withdrawal || 0);
                    setWithdrawalRequests(result.data.withdrawal_requests || []);
                }
                setWithdrawAmount('');
            } else {
                showToast('error', result.message || 'Failed to submit withdrawal request.');
            }
        } catch (err) {
            showToast('error', 'An error occurred. Please try again.');
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

    const bottomPadding =
        Platform.OS === 'ios' ? 100 : insets.bottom > 0 ? insets.bottom + 80 : 80;

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

            {/* Custom Toast */}
            <CustomToast
                visible={toast.visible}
                type={toast.type}
                message={toast.message}
                onHide={hideToast}
            />

            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: bottomPadding, paddingHorizontal: 16 }}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={() => fetchData(true)}
                        colors={[GREEN_DARK]}
                        tintColor={GREEN_DARK}
                    />
                }
            >
                <Text style={styles.pageTitle}>Withdrawal</Text>
                <Text style={styles.pageSubtitle}>
                    Manage your wallet balance and withdrawal requests.
                </Text>

                {loading ? (
                    <LoadingSkeleton />
                ) : (
                    <>
                        {/* ── Wallet Balance Card ── */}
                        <View style={styles.walletCard}>
                            <View style={styles.walletCircle1} />
                            <View style={styles.walletCircle2} />
                            <View style={styles.walletIconRow}>
                                <View style={styles.walletIconWrap}>
                                    <Ionicons name="wallet" size={22} color={WHITE} />
                                </View>
                                <Text style={styles.walletCardLabel}>Wallet</Text>
                            </View>
                            <Text style={styles.walletBalanceLabel}>Available Balance</Text>
                            <Text style={styles.walletBalanceAmount}>
                                ₹{walletBalance.toLocaleString('en-IN')}
                            </Text>
                            <Text style={styles.walletTotalText}>
                                Total Earned: ₹{totalEarned.toLocaleString('en-IN')}
                            </Text>
                            <View style={styles.walletDivider} />
                            <View style={styles.walletInfoRow}>
                                <Ionicons name="information-circle-outline" size={14} color="rgba(255,255,255,0.7)" />
                                <Text style={styles.walletInfoText}>
                                    Minimum withdrawal: ₹{minWithdrawal.toLocaleString('en-IN')}
                                </Text>
                            </View>
                        </View>

                        {/* ── Eligibility Banner ── */}
                        {walletBalance >= minWithdrawal ? (
                            <View style={styles.eligibleCard}>
                                <Ionicons name="checkmark-circle" size={18} color={SUCCESS} />
                                <Text style={styles.eligibleText}>
                                    You are eligible to withdraw your balance!
                                </Text>
                            </View>
                        ) : (
                            <View style={styles.notEligibleCard}>
                                <Ionicons name="time-outline" size={18} color={WARNING} />
                                <Text style={styles.notEligibleText}>
                                    Earn ₹{(minWithdrawal - walletBalance).toLocaleString('en-IN')} more
                                    to reach the minimum withdrawal amount.
                                </Text>
                            </View>
                        )}

                        {/* ── Request Withdrawal ── */}
                        <View style={styles.card}>
                            <Text style={styles.sectionTitle}>Request Withdrawal</Text>
                            <View style={styles.inputWrapper}>
                                <Text style={styles.inputPrefix}>₹</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder={`Min ₹${minWithdrawal.toLocaleString('en-IN')}`}
                                    placeholderTextColor={TEXT_GRAY}
                                    keyboardType="numeric"
                                    value={withdrawAmount}
                                    onChangeText={(text) => setWithdrawAmount(text.replace(/[^0-9]/g, ''))}
                                    editable={!submitting}
                                />
                                {withdrawAmount.length > 0 && (
                                    <TouchableOpacity onPress={() => setWithdrawAmount('')} disabled={submitting}>
                                        <Ionicons name="close-circle" size={18} color={TEXT_GRAY} />
                                    </TouchableOpacity>
                                )}
                            </View>
                            <Text style={styles.withdrawHint}>
                                Balance: ₹{walletBalance.toLocaleString('en-IN')} • Min: ₹{minWithdrawal.toLocaleString('en-IN')}
                            </Text>
                            <TouchableOpacity
                                style={[
                                    styles.withdrawBtn,
                                    (walletBalance < minWithdrawal || submitting) && styles.withdrawBtnDisabled,
                                ]}
                                onPress={handleWithdraw}
                                activeOpacity={0.85}
                                disabled={walletBalance < minWithdrawal || submitting}
                            >
                                <LinearGradient
                                    colors={[GREEN_DARK, '#145C4D']}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 0 }}
                                    style={styles.withdrawBtnGradient}
                                >
                                    {submitting ? (
                                        <>
                                            <ActivityIndicator size="small" color={WHITE} />
                                            <Text style={styles.withdrawBtnText}>Submitting...</Text>
                                        </>
                                    ) : (
                                        <>
                                            <Ionicons name="cash-outline" size={18} color={WHITE} />
                                            <Text style={styles.withdrawBtnText}>Submit Withdrawal Request</Text>
                                        </>
                                    )}
                                </LinearGradient>
                            </TouchableOpacity>
                        </View>

                        {/* ── Withdrawal History ── */}
                        <Text style={styles.sectionTitle}>Withdrawal History</Text>
                        {withdrawalRequests.length === 0 ? (
                            <EmptyState />
                        ) : (
                            withdrawalRequests.map((item) => (
                                <WithdrawalItem key={item.id} item={item} />
                            ))
                        )}
                    </>
                )}
            </ScrollView>
        </View>
    );
}

// ── Styles (unchanged) ────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: GRAY_BG },
    pageTitle: { fontFamily: FONTS.bold, fontSize: 22, color: TEXT_DARK, marginTop: 14, marginBottom: 4 },
    pageSubtitle: { fontFamily: FONTS.regular, fontSize: 12, color: TEXT_GRAY, lineHeight: 18, marginBottom: 16 },
    walletCard: {
        backgroundColor: GREEN_DARK,
        borderRadius: 16,
        padding: 20,
        marginBottom: 12,
        overflow: 'hidden',
        position: 'relative',
        elevation: 4,
        shadowColor: GREEN_DARK,
        shadowOpacity: 0.25,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 4 },
    },
    walletCircle1: {
        position: 'absolute',
        width: 180,
        height: 180,
        borderRadius: 90,
        backgroundColor: 'rgba(255,255,255,0.05)',
        top: -70,
        right: -50,
    },
    walletCircle2: {
        position: 'absolute',
        width: 110,
        height: 110,
        borderRadius: 55,
        backgroundColor: 'rgba(255,255,255,0.05)',
        bottom: -30,
        left: 10,
    },
    walletIconRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
    walletIconWrap: {
        width: 36,
        height: 36,
        borderRadius: 10,
        backgroundColor: 'rgba(255,255,255,0.15)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    walletCardLabel: { fontFamily: FONTS.semiBold, fontSize: 14, color: 'rgba(255,255,255,0.8)' },
    walletBalanceLabel: { fontFamily: FONTS.regular, fontSize: 12, color: 'rgba(255,255,255,0.65)', marginBottom: 4 },
    walletBalanceAmount: { fontFamily: FONTS.bold, fontSize: 36, color: WHITE, marginBottom: 4 },
    walletTotalText: { fontFamily: FONTS.regular, fontSize: 11, color: 'rgba(255,255,255,0.55)', marginBottom: 14 },
    walletDivider: { height: 1, backgroundColor: 'rgba(255,255,255,0.15)', marginBottom: 12 },
    walletInfoRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    walletInfoText: { fontFamily: FONTS.regular, fontSize: 11, color: 'rgba(255,255,255,0.65)' },
    eligibleCard: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: '#DCFCE7',
        borderRadius: 10,
        padding: 12,
        marginBottom: 14,
        borderWidth: 1,
        borderColor: '#BBF7D0',
    },
    eligibleText: { fontFamily: FONTS.medium, fontSize: 12, color: '#166534', flex: 1 },
    notEligibleCard: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: '#FFFBEB',
        borderRadius: 10,
        padding: 12,
        marginBottom: 14,
        borderWidth: 1,
        borderColor: '#FDE68A',
    },
    notEligibleText: { fontFamily: FONTS.medium, fontSize: 12, color: '#92400E', flex: 1 },
    card: {
        backgroundColor: WHITE,
        borderRadius: 14,
        padding: 16,
        marginBottom: 16,
        elevation: 2,
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 2 },
    },
    sectionTitle: { fontFamily: FONTS.semiBold, fontSize: 15, color: TEXT_DARK, marginBottom: 12 },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1.5,
        borderColor: BORDER_CLR,
        borderRadius: 10,
        paddingHorizontal: 14,
        paddingVertical: 4,
        backgroundColor: GRAY_BG,
        marginBottom: 6,
    },
    inputPrefix: { fontFamily: FONTS.semiBold, fontSize: 16, color: TEXT_DARK, marginRight: 6 },
    input: { flex: 1, fontFamily: FONTS.regular, fontSize: 15, color: TEXT_DARK, paddingVertical: 11 },
    withdrawHint: { fontFamily: FONTS.regular, fontSize: 11, color: TEXT_GRAY, marginBottom: 14 },
    withdrawBtn: {
        borderRadius: 12,
        overflow: 'hidden',
        elevation: 4,
        shadowColor: GREEN_DARK,
        shadowOpacity: 0.3,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 4 },
    },
    withdrawBtnDisabled: { opacity: 0.5 },
    withdrawBtnGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 14,
    },
    withdrawBtnText: { fontFamily: FONTS.semiBold, fontSize: 14, color: WHITE },
    historyCard: {
        backgroundColor: WHITE,
        borderRadius: 14,
        padding: 14,
        marginBottom: 12,
        elevation: 1,
        shadowColor: '#000',
        shadowOpacity: 0.04,
        shadowRadius: 4,
        shadowOffset: { width: 0, height: 2 },
    },
    historyHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 10 },
    historyIconWrap: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
    historyNameBlock: { flex: 1 },
    historyName: { fontFamily: FONTS.semiBold, fontSize: 13, color: TEXT_DARK, marginBottom: 2 },
    historyPhone: { fontFamily: FONTS.regular, fontSize: 11, color: TEXT_GRAY },
    statusBadge: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20 },
    statusText: { fontFamily: FONTS.semiBold, fontSize: 11 },
    detailsGrid: { flexDirection: 'row', borderWidth: 1, borderColor: BORDER_CLR, borderRadius: 10, overflow: 'hidden' },
    detailCell: { flex: 1, paddingVertical: 10, paddingHorizontal: 12, borderRightWidth: 1, borderColor: BORDER_CLR },
    detailLabel: {
        fontFamily: FONTS.regular,
        fontSize: 9,
        color: TEXT_GRAY,
        letterSpacing: 0.5,
        textTransform: 'uppercase',
        marginBottom: 4,
    },
    detailValue: { fontFamily: FONTS.semiBold, fontSize: 13, color: TEXT_DARK },
    emptyCard: {
        backgroundColor: WHITE,
        borderRadius: 14,
        padding: 28,
        marginBottom: 12,
        alignItems: 'center',
        elevation: 1,
        shadowColor: '#000',
        shadowOpacity: 0.04,
        shadowRadius: 4,
        shadowOffset: { width: 0, height: 2 },
    },
    emptyTitle: { fontFamily: FONTS.semiBold, fontSize: 15, color: TEXT_DARK, marginTop: 10, marginBottom: 4 },
    emptySub: { fontFamily: FONTS.regular, fontSize: 12, color: TEXT_GRAY, textAlign: 'center', lineHeight: 18 },
});