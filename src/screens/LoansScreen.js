// screens/LoansScreen.jsx
import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
    Platform,
    RefreshControl,
    Dimensions,
    Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import Header from '../components/Header';
import { COLORS } from '../constants/colors';
import { FONTS } from '../constants/fonts';
import { getLoans } from '../services/api/loansService';
import { handleApiError } from '../services/utils/errorHandler';
import { getUserData } from '../services/utils/storage';

const { width } = Dimensions.get('window');

// ─── Design Tokens ────────────────────────────────────────────────────────────
const GREEN_DARK = COLORS.primary || '#1A3C34';
const TEXT_GRAY = COLORS.gray || '#6B7280';
const TEXT_DARK = COLORS.black || '#1A1A2E';
const SUCCESS = '#22C55E';
const WARNING = '#F59E0B';
const ERROR_RED = '#EF4444';
const GRAY_BG = COLORS.background || '#F5F7FA';
const WHITE = '#FFFFFF';
const BORDER_CLR = '#E5E7EB';

// ── Status Config ─────────────────────────────────────────────────────────────
const STATUS_CONFIG = {
    approved: {
        color: SUCCESS,
        bg: '#F0FFF4',
        icon: 'checkmark-circle',
        label: 'Approved',
    },
    pending: {
        color: WARNING,
        bg: '#FFFBEB',
        icon: 'time',
        label: 'Pending',
    },
    active: {
        color: '#3B82F6',
        bg: '#EFF6FF',
        icon: 'flash',
        label: 'Active',
    },
    paid: {
        color: '#8B5CF6',
        bg: '#F5F3FF',
        icon: 'shield-checkmark',
        label: 'Paid',
    },
    rejected: {
        color: ERROR_RED,
        bg: '#FEF2F2',
        icon: 'close-circle',
        label: 'Rejected',
    },
    disbursed: {
        color: '#06B6D4',
        bg: '#ECFEFF',
        icon: 'arrow-forward-circle',
        label: 'Disbursed',
    },
};

const getStatusConfig = (status) =>
    STATUS_CONFIG[status?.toLowerCase()] || {
        color: COLORS.gray,
        bg: '#F3F4F6',
        icon: 'ellipse-outline',
        label: status || 'Unknown',
    };

const FILTERS = ['All', 'Pending', 'Approved', 'Active', 'Paid', 'Rejected'];

// ══════════════════════════════════════════════════════════════════════════════
// ── SKELETON COMPONENTS ───────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════

function SkeletonBox({ width: w, height: h, borderRadius = 8, style }) {
    const shimmer = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        const animation = Animated.loop(
            Animated.sequence([
                Animated.timing(shimmer, {
                    toValue: 1,
                    duration: 900,
                    useNativeDriver: true,
                }),
                Animated.timing(shimmer, {
                    toValue: 0,
                    duration: 900,
                    useNativeDriver: true,
                }),
            ])
        );
        animation.start();
        return () => animation.stop();
    }, []);

    const opacity = shimmer.interpolate({
        inputRange: [0, 1],
        outputRange: [0.3, 0.8],
    });

    return (
        <Animated.View
            style={[
                {
                    width: w,
                    height: h,
                    borderRadius,
                    backgroundColor: '#CBD5E1',
                    opacity,
                },
                style,
            ]}
        />
    );
}

function HeroBannerSkeleton() {
    return (
        <View style={skeletonStyles.heroBanner}>
            <SkeletonBox
                width={100}
                height={12}
                borderRadius={6}
                style={{ marginBottom: 12 }}
            />
            <SkeletonBox
                width={160}
                height={24}
                borderRadius={8}
                style={{ marginBottom: 8 }}
            />
            <SkeletonBox
                width={width - 84}
                height={12}
                borderRadius={6}
                style={{ marginBottom: 4 }}
            />
            <SkeletonBox
                width={(width - 84) * 0.7}
                height={12}
                borderRadius={6}
                style={{ marginBottom: 20 }}
            />
            <View style={skeletonStyles.summaryRow}>
                {[1, 2, 3, 4].map((i) => (
                    <SkeletonBox
                        key={i}
                        width={(width - 84 - 24) / 4}
                        height={64}
                        borderRadius={12}
                    />
                ))}
            </View>
        </View>
    );
}

function InfoCardSkeleton() {
    return (
        <View style={skeletonStyles.infoCard}>
            <SkeletonBox width={36} height={36} borderRadius={10} />
            <SkeletonBox width={width - 120} height={12} borderRadius={6} />
        </View>
    );
}

function FilterTabsSkeleton() {
    return (
        <View style={skeletonStyles.filterRow}>
            {[80, 72, 90, 68, 60, 76].map((w, i) => (
                <SkeletonBox key={i} width={w} height={36} borderRadius={20} />
            ))}
        </View>
    );
}

function LoanCardSkeleton() {
    return (
        <View style={skeletonStyles.card}>
            <SkeletonBox width={4} height={110} borderRadius={0} />
            <View style={skeletonStyles.headerRow}>
                <SkeletonBox width={48} height={48} borderRadius={14} />
                <View style={skeletonStyles.metaBlock}>
                    <View style={skeletonStyles.titleRow}>
                        <SkeletonBox width={80} height={12} borderRadius={6} />
                        <SkeletonBox width={64} height={22} borderRadius={8} />
                    </View>
                    <SkeletonBox
                        width={120}
                        height={22}
                        borderRadius={6}
                        style={{ marginVertical: 8 }}
                    />
                    <View style={skeletonStyles.chipsRow}>
                        <SkeletonBox width={110} height={12} borderRadius={6} />
                        <SkeletonBox width={80} height={12} borderRadius={6} />
                    </View>
                </View>
                <SkeletonBox width={18} height={18} borderRadius={4} />
            </View>
        </View>
    );
}

function LoadingSkeleton() {
    return (
        <>
            <HeroBannerSkeleton />
            <InfoCardSkeleton />
            <FilterTabsSkeleton />
            {[1, 2, 3].map((i) => (
                <LoanCardSkeleton key={i} />
            ))}
        </>
    );
}

// ══════════════════════════════════════════════════════════════════════════════
// ── COMPONENTS ────────────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════

function SummaryChip({ label, value, icon }) {
    return (
        <View style={styles.summaryChip}>
            <Ionicons name={icon} size={14} color="rgba(255,255,255,0.85)" />
            <Text style={styles.summaryChipValue}>{value}</Text>
            <Text style={styles.summaryChipLabel}>{label}</Text>
        </View>
    );
}

function LoanCard({ loan, index, onPress }) {
    const statusCfg = getStatusConfig(loan.status);

    return (
        <TouchableOpacity
            style={[styles.loanCard, index !== 0 && { marginTop: 12 }]}
            onPress={onPress}
            activeOpacity={0.75}
        >
            {/* Left accent bar */}
            <View
                style={[
                    styles.loanAccentBar,
                    { backgroundColor: statusCfg.color },
                ]}
            />

            <View style={styles.loanCardContent}>
                {/* Top row: icon + amount + status */}
                <View style={styles.loanCardTop}>
                    <View
                        style={[
                            styles.loanIconBox,
                            { backgroundColor: statusCfg.bg },
                        ]}
                    >
                        <Ionicons
                            name={statusCfg.icon}
                            size={22}
                            color={statusCfg.color}
                        />
                    </View>

                    <View style={styles.loanCardMain}>
                        <Text style={styles.loanAmount}>
                            ₹{Number(loan.amount).toLocaleString('en-IN')}
                        </Text>
                        <Text style={styles.loanPurpose}>
                            {loan.purpose === '-' || !loan.purpose
                                ? 'General Purpose'
                                : loan.purpose}
                        </Text>
                    </View>

                    <View
                        style={[
                            styles.statusBadge,
                            { backgroundColor: statusCfg.bg },
                        ]}
                    >
                        <View
                            style={[
                                styles.statusDot,
                                { backgroundColor: statusCfg.color },
                            ]}
                        />
                        <Text
                            style={[
                                styles.statusBadgeText,
                                { color: statusCfg.color },
                            ]}
                        >
                            {statusCfg.label}
                        </Text>
                    </View>
                </View>

                {/* Bottom row: date + days left + tenure + chevron */}
                <View style={styles.loanCardBottom}>
                    <View style={styles.loanMetaItem}>
                        <Ionicons
                            name="calendar-outline"
                            size={12}
                            color={TEXT_GRAY}
                        />
                        <Text style={styles.loanMetaText}>
                            {loan.formatted_applied_date}
                        </Text>
                    </View>

                    <View style={styles.loanMetaItem}>
                        <Ionicons
                            name="time-outline"
                            size={12}
                            color={
                                loan.days_left === 'Paid'
                                    ? SUCCESS
                                    : loan.days_left?.includes('Remaining')
                                        ? WARNING
                                        : TEXT_GRAY
                            }
                        />
                        <Text
                            style={[
                                styles.loanMetaText,
                                loan.days_left === 'Paid' && { color: SUCCESS },
                                loan.days_left?.includes('Remaining') && {
                                    color: WARNING,
                                },
                            ]}
                        >
                            {loan.days_left}
                        </Text>
                    </View>

                    <View style={styles.loanMetaItem}>
                        <Ionicons
                            name="calendar-number-outline"
                            size={12}
                            color={TEXT_GRAY}
                        />
                        <Text style={styles.loanMetaText}>
                            {loan.tenure_days} days
                        </Text>
                    </View>

                    <Ionicons
                        name="chevron-forward"
                        size={16}
                        color={TEXT_GRAY}
                        style={{ marginLeft: 'auto' }}
                    />
                </View>
            </View>
        </TouchableOpacity>
    );
}

function EmptyState({ filter }) {
    return (
        <View style={styles.emptyState}>
            <View style={styles.emptyIconBox}>
                <Ionicons
                    name="document-text-outline"
                    size={40}
                    color={COLORS.primary}
                />
            </View>
            <Text style={styles.emptyTitle}>No Loans Found</Text>
            <Text style={styles.emptyText}>
                {filter === 'All'
                    ? "You haven't applied for any loans yet."
                    : `No ${filter.toLowerCase()} loans found.`}
            </Text>
        </View>
    );
}

// ══════════════════════════════════════════════════════════════════════════════
// ── MAIN SCREEN ───────────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════

export default function LoansScreen({ navigation }) {
    const insets = useSafeAreaInsets();

    const [loading, setLoading] = useState(false); // Changed from true
    const [refreshing, setRefreshing] = useState(false);
    const [loansData, setLoansData] = useState(null);
    const [activeFilter, setActiveFilter] = useState('All');
    const [user, setUser] = useState(null);

    // Track if initial load is done
    const initialLoadDone = useRef(false);

    // Initial load only
    useEffect(() => {
        if (!initialLoadDone.current) {
            fetchLoans();
        }
    }, []);

    // ── Fetch ──────────────────────────────────────────────────────────────────
    const fetchLoans = async (isRefreshing = false) => {
        if (!isRefreshing && !initialLoadDone.current) setLoading(true);
        try {
            const [loansResult, userData] = await Promise.all([
                getLoans(),
                getUserData(),
            ]);
            if (userData) setUser(userData);
            if (loansResult.success) {
                setLoansData(loansResult.data);
                initialLoadDone.current = true;
            } else {
                handleApiError({ message: loansResult.message });
            }
        } catch (err) {
            handleApiError(err);
        } finally {
            setLoading(false);
            if (isRefreshing) setRefreshing(false);
        }
    };

    // Refresh only when screen is focused (not on initial mount)
    useFocusEffect(
        useCallback(() => {
            if (initialLoadDone.current) {
                // Silent refresh in background
                fetchLoans(true);
            }
        }, [])
    );

    const onRefresh = () => {
        setRefreshing(true);
        fetchLoans(true);
    };

    // ── Helpers ────────────────────────────────────────────────────────────────
    const getUserInitials = () => {
        if (!user?.name) return 'U';
        const parts = user.name.trim().split(' ');
        if (parts.length >= 2)
            return (parts[0][0] + parts[1][0]).toUpperCase();
        return parts[0][0].toUpperCase();
    };

    const filteredLoans = () => {
        const loans = loansData?.loans || [];
        if (activeFilter === 'All') return loans;
        return loans.filter(
            (l) => l.status?.toLowerCase() === activeFilter.toLowerCase()
        );
    };

    const getSummary = () => {
        const loans = loansData?.loans || [];
        return {
            total: loans.length,
            active: loans.filter((l) =>
                ['active', 'approved', 'disbursed'].includes(
                    l.status?.toLowerCase()
                )
            ).length,
            paid: loans.filter((l) => l.status?.toLowerCase() === 'paid')
                .length,
            pending: loans.filter(
                (l) => l.status?.toLowerCase() === 'pending'
            ).length,
        };
    };

    const bottomPadding =
        Platform.OS === 'ios'
            ? 100
            : insets.bottom > 0
                ? insets.bottom + 80
                : 80;

    const loans = filteredLoans();
    const summary = getSummary();

    // ── Render ─────────────────────────────────────────────────────────────────
    return (
        <View style={styles.container}>
            <Header
                showLogo
                showProfile
                showNotification
                avatarText={getUserInitials()}
                profileImageUrl={user?.profile_image}
                onProfilePress={() => navigation.navigate('Profile')}
                onNotificationPress={() => { }}
            />

            <ScrollView
                style={styles.content}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: bottomPadding }}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        colors={[COLORS.primary]}
                        tintColor={COLORS.primary}
                    />
                }
            >
                {loading && !loansData ? (
                    <LoadingSkeleton />
                ) : (
                    <>
                        {/* Hero Banner */}
                        <LinearGradient
                            colors={[COLORS.primary, '#1a6fd4']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={styles.heroBanner}
                        >
                            <View style={styles.heroBubble1} />
                            <View style={styles.heroBubble2} />

                            <View style={styles.profileStatusRow}>
                                <View
                                    style={[
                                        styles.profileStatusDot,
                                        {
                                            backgroundColor:
                                                loansData?.profile_status ===
                                                    'active'
                                                    ? '#4ADE80'
                                                    : '#F87171',
                                        },
                                    ]}
                                />
                                <Text style={styles.profileStatusText}>
                                    {loansData?.profile_status === 'active'
                                        ? 'Profile Active'
                                        : 'Profile Inactive'}
                                </Text>
                            </View>

                            <Text style={styles.heroTitle}>Loan Overview</Text>
                            <Text style={styles.heroSubtitle}>
                                {loansData?.profile_message ||
                                    'Manage and track all your loans here.'}
                            </Text>

                            <View style={styles.summaryRow}>
                                <SummaryChip
                                    label="Total"
                                    value={summary.total}
                                    icon="layers-outline"
                                />
                                <SummaryChip
                                    label="Active"
                                    value={summary.active}
                                    icon="flash-outline"
                                />
                                <SummaryChip
                                    label="Paid"
                                    value={summary.paid}
                                    icon="shield-checkmark-outline"
                                />
                                <SummaryChip
                                    label="Pending"
                                    value={summary.pending}
                                    icon="time-outline"
                                />
                            </View>
                        </LinearGradient>

                        {/* Apply / Cannot Apply */}
                        {loansData?.can_apply_loan ? (
                            <TouchableOpacity
                                style={styles.applyBtn}
                                activeOpacity={0.8}
                                onPress={() => navigation.navigate('ApplyLoan')}
                            >
                                <LinearGradient
                                    colors={[COLORS.primary, '#1a6fd4']}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 0 }}
                                    style={styles.applyBtnGradient}
                                >
                                    <Ionicons
                                        name="add-circle-outline"
                                        size={20}
                                        color={COLORS.white}
                                    />
                                    <Text style={styles.applyBtnText}>
                                        Apply for New Loan
                                    </Text>
                                    <Ionicons
                                        name="arrow-forward"
                                        size={18}
                                        color={COLORS.white}
                                    />
                                </LinearGradient>
                            </TouchableOpacity>
                        ) : (
                            <View style={styles.cannotApplyCard}>
                                <View style={styles.cannotApplyIconBox}>
                                    <Ionicons
                                        name="information-circle"
                                        size={22}
                                        color="#3B82F6"
                                    />
                                </View>
                                <Text style={styles.cannotApplyText}>
                                    {loansData?.has_active_loan
                                        ? 'You have an active loan. Repay it to apply for a new one.'
                                        : 'You are not eligible to apply for a loan right now.'}
                                </Text>
                            </View>
                        )}

                        {/* Filter Tabs */}
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            style={styles.filterScroll}
                            contentContainerStyle={styles.filterContainer}
                        >
                            {FILTERS.map((filter) => {
                                const isActive = activeFilter === filter;
                                const count =
                                    filter === 'All'
                                        ? (loansData?.loans || []).length
                                        : (loansData?.loans || []).filter(
                                            (l) =>
                                                l.status?.toLowerCase() ===
                                                filter.toLowerCase()
                                        ).length;

                                return (
                                    <TouchableOpacity
                                        key={filter}
                                        style={[
                                            styles.filterTab,
                                            isActive && styles.filterTabActive,
                                        ]}
                                        onPress={() => setActiveFilter(filter)}
                                        activeOpacity={0.75}
                                    >
                                        <Text
                                            style={[
                                                styles.filterTabText,
                                                isActive &&
                                                styles.filterTabTextActive,
                                            ]}
                                        >
                                            {filter}
                                        </Text>
                                        {count > 0 && (
                                            <View
                                                style={[
                                                    styles.filterBadge,
                                                    isActive &&
                                                    styles.filterBadgeActive,
                                                ]}
                                            >
                                                <Text
                                                    style={[
                                                        styles.filterBadgeText,
                                                        isActive &&
                                                        styles.filterBadgeTextActive,
                                                    ]}
                                                >
                                                    {count}
                                                </Text>
                                            </View>
                                        )}
                                    </TouchableOpacity>
                                );
                            })}
                        </ScrollView>

                        {/* Loan Cards */}
                        {loans.length === 0 ? (
                            <EmptyState filter={activeFilter} />
                        ) : (
                            <View style={styles.loanList}>
                                {loans.map((loan, index) => (
                                    <LoanCard
                                        key={loan.id}
                                        loan={loan}
                                        index={index}
                                        onPress={() =>
                                            navigation.navigate('LoanDetails', {
                                                loanId: loan.id,
                                            })
                                        }
                                    />
                                ))}
                            </View>
                        )}
                    </>
                )}
            </ScrollView>
        </View>
    );
}

// ══════════════════════════════════════════════════════════════════════════════
// ── STYLES ────────────────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    content: {
        flex: 1,
        paddingHorizontal: 20,
    },

    // ── Hero ──
    heroBanner: {
        borderRadius: 24,
        padding: 22,
        marginTop: 8,
        marginBottom: 16,
        overflow: 'hidden',
        elevation: 6,
        shadowColor: COLORS.primary,
        shadowOpacity: 0.3,
        shadowRadius: 16,
        shadowOffset: { width: 0, height: 6 },
    },
    heroBubble1: {
        position: 'absolute',
        width: 160,
        height: 160,
        borderRadius: 80,
        backgroundColor: 'rgba(255,255,255,0.07)',
        top: -50,
        right: -40,
    },
    heroBubble2: {
        position: 'absolute',
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: 'rgba(255,255,255,0.05)',
        bottom: -20,
        left: 10,
    },
    profileStatusRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 10,
    },
    profileStatusDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    profileStatusText: {
        fontFamily: FONTS.medium,
        fontSize: 12,
        color: 'rgba(255,255,255,0.85)',
    },
    heroTitle: {
        fontFamily: FONTS.bold,
        fontSize: 22,
        color: COLORS.white,
        marginBottom: 6,
    },
    heroSubtitle: {
        fontFamily: FONTS.regular,
        fontSize: 12,
        color: 'rgba(255,255,255,0.75)',
        lineHeight: 18,
        marginBottom: 18,
    },
    summaryRow: {
        flexDirection: 'row',
        gap: 8,
    },
    summaryChip: {
        flex: 1,
        backgroundColor: 'rgba(255,255,255,0.15)',
        borderRadius: 12,
        padding: 10,
        alignItems: 'center',
        gap: 4,
    },
    summaryChipValue: {
        fontFamily: FONTS.bold,
        fontSize: 16,
        color: COLORS.white,
    },
    summaryChipLabel: {
        fontFamily: FONTS.regular,
        fontSize: 10,
        color: 'rgba(255,255,255,0.75)',
    },

    // ── Apply ──
    applyBtn: {
        borderRadius: 14,
        marginBottom: 16,
        overflow: 'hidden',
        elevation: 4,
        shadowColor: COLORS.primary,
        shadowOpacity: 0.3,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 4 },
    },
    applyBtnGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        paddingHorizontal: 20,
        gap: 10,
    },
    applyBtnText: {
        fontFamily: FONTS.semiBold,
        fontSize: 15,
        color: COLORS.white,
        flex: 1,
        textAlign: 'center',
    },
    cannotApplyCard: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        backgroundColor: '#EFF6FF',
        borderRadius: 14,
        padding: 14,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#BFDBFE',
    },
    cannotApplyIconBox: {
        width: 36,
        height: 36,
        borderRadius: 10,
        backgroundColor: '#DBEAFE',
        justifyContent: 'center',
        alignItems: 'center',
    },
    cannotApplyText: {
        fontFamily: FONTS.regular,
        fontSize: 12,
        color: '#1D4ED8',
        flex: 1,
        lineHeight: 18,
    },

    // ── Filter ──
    filterScroll: {
        marginBottom: 16,
    },
    filterContainer: {
        gap: 8,
        paddingVertical: 4,
    },
    filterTab: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: COLORS.white,
        borderWidth: 1.5,
        borderColor: BORDER_CLR,
        gap: 5,
    },
    filterTabActive: {
        backgroundColor: COLORS.primary,
        borderColor: COLORS.primary,
    },
    filterTabText: {
        fontFamily: FONTS.medium,
        fontSize: 13,
        color: COLORS.gray,
    },
    filterTabTextActive: {
        color: COLORS.white,
    },
    filterBadge: {
        backgroundColor: '#F3F4F6',
        borderRadius: 10,
        paddingHorizontal: 6,
        paddingVertical: 1,
    },
    filterBadgeActive: {
        backgroundColor: 'rgba(255,255,255,0.25)',
    },
    filterBadgeText: {
        fontFamily: FONTS.bold,
        fontSize: 10,
        color: COLORS.gray,
    },
    filterBadgeTextActive: {
        color: COLORS.white,
    },

    // ── Loan List ──
    loanList: {
        marginBottom: 8,
    },

    // ── Loan Card ──
    loanCard: {
        backgroundColor: COLORS.white,
        borderRadius: 18,
        overflow: 'hidden',
        elevation: 3,
        shadowColor: '#000',
        shadowOpacity: 0.06,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 3 },
        flexDirection: 'row',
    },
    loanAccentBar: {
        width: 4,
    },
    loanCardContent: {
        flex: 1,
    },
    loanCardTop: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        gap: 12,
    },
    loanIconBox: {
        width: 48,
        height: 48,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
        flexShrink: 0,
    },
    loanCardMain: {
        flex: 1,
    },
    loanAmount: {
        fontFamily: FONTS.bold,
        fontSize: 20,
        color: COLORS.black,
        marginBottom: 2,
    },
    loanPurpose: {
        fontFamily: FONTS.regular,
        fontSize: 12,
        color: TEXT_GRAY,
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 8,
        gap: 4,
    },
    statusDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
    },
    statusBadgeText: {
        fontFamily: FONTS.semiBold,
        fontSize: 10,
        textTransform: 'capitalize',
    },
    loanCardBottom: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingHorizontal: 16,
        paddingBottom: 14,
        paddingTop: 0,
        flexWrap: 'wrap',
    },
    loanMetaItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    loanMetaText: {
        fontFamily: FONTS.regular,
        fontSize: 11,
        color: TEXT_GRAY,
    },

    // ── Empty ──
    emptyState: {
        alignItems: 'center',
        paddingVertical: 48,
    },
    emptyIconBox: {
        width: 80,
        height: 80,
        borderRadius: 24,
        backgroundColor: '#EFF6FF',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    emptyTitle: {
        fontFamily: FONTS.bold,
        fontSize: 16,
        color: COLORS.black,
        marginBottom: 8,
    },
    emptyText: {
        fontFamily: FONTS.regular,
        fontSize: 13,
        color: COLORS.gray,
        textAlign: 'center',
        lineHeight: 20,
        maxWidth: 220,
    },
});

// ── Skeleton Styles ───────────────────────────────────────────────────────────
const skeletonStyles = StyleSheet.create({
    card: {
        backgroundColor: '#FFFFFF',
        borderRadius: 18,
        marginBottom: 12,
        elevation: 2,
        shadowColor: '#000',
        shadowOpacity: 0.04,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 2 },
        flexDirection: 'row',
        overflow: 'hidden',
    },
    headerRow: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        gap: 12,
    },
    metaBlock: {
        flex: 1,
    },
    titleRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    chipsRow: {
        flexDirection: 'row',
        gap: 12,
    },
    heroBanner: {
        backgroundColor: '#CBD5E1',
        borderRadius: 24,
        padding: 22,
        marginTop: 8,
        marginBottom: 16,
        opacity: 0.4,
    },
    summaryRow: {
        flexDirection: 'row',
        gap: 8,
    },
    filterRow: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: 16,
        paddingVertical: 4,
    },
    infoCard: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        backgroundColor: '#F1F5F9',
        borderRadius: 14,
        padding: 14,
        marginBottom: 16,
    },
});