// screens/ReferScreen.jsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
    Share,
    Platform,
    Clipboard,
    Alert,
    Animated,
    RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import Header from '../components/Header';
import { COLORS } from '../constants/colors';
import { FONTS } from '../constants/fonts';
import { getReferralData, getWalletTransactions } from '../services/api/referralService';
import { handleApiError } from '../services/utils/errorHandler';
import { getUserData } from '../services/utils/storage';

// ─── Design Tokens ────────────────────────────────────────────────────────────
const GREEN_DARK = COLORS.primary || '#1A3C34';
const GREEN_LIGHT = '#E8F5F0';
const SUCCESS = '#22C55E';
const GRAY_BG = COLORS.background || '#F5F7FA';
const WHITE = '#FFFFFF';
const TEXT_DARK = COLORS.black || '#1A1A2E';
const TEXT_GRAY = COLORS.gray || '#6B7280';
const BORDER_CLR = '#E5E7EB';

// ─── Referral Status Config ───────────────────────────────────────────────────
const REFERRAL_STATUS = {
    reward_credited: { bg: GREEN_LIGHT, text: SUCCESS, label: 'Reward Credited' },
    pending: { bg: '#FFFBEB', text: '#F59E0B', label: 'Pending' },
    registered: { bg: '#EEF2FF', text: '#6366F1', label: 'Registered' },
    rejected: { bg: '#FEF2F2', text: '#EF4444', label: 'Rejected' },
};

// ══════════════════════════════════════════════════════════════════════════════
// ── SKELETON ──────────────────────────────────────────────────────────────────
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

function LoadingSkeleton() {
    return (
        <>
            {/* Banner Skeleton */}
            <SkeletonBox
                width="100%"
                height={130}
                borderRadius={16}
                style={{ marginBottom: 14 }}
            />
            {/* Code Card Skeleton */}
            <SkeletonBox
                width="100%"
                height={160}
                borderRadius={14}
                style={{ marginBottom: 14 }}
            />
            {/* Section Title */}
            <SkeletonBox
                width={160}
                height={16}
                borderRadius={4}
                style={{ marginBottom: 12 }}
            />
            {/* History Cards */}
            {[1, 2, 3].map((i) => (
                <SkeletonBox
                    key={i}
                    width="100%"
                    height={110}
                    borderRadius={14}
                    style={{ marginBottom: 10 }}
                />
            ))}
        </>
    );
}

// ══════════════════════════════════════════════════════════════════════════════
// ── MAIN SCREEN ───────────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════

export default function ReferScreen({ navigation }) {
    const insets = useSafeAreaInsets();

    const [loading, setLoading] = useState(false); // Changed from true
    const [refreshing, setRefreshing] = useState(false);
    const [user, setUser] = useState(null);

    // Track if initial load is done
    const initialLoadDone = useRef(false);

    // ── Referral State ─────────────────────────────────────────────────────────
    const [referralCode, setReferralCode] = useState('');
    const [referralLink, setReferralLink] = useState('');
    const [referrals, setReferrals] = useState([]);

    // ── Wallet State ───────────────────────────────────────────────────────────
    const [totalEarned, setTotalEarned] = useState(0);
    const [walletBalance, setWalletBalance] = useState(0);

    // ── Fetch Data ─────────────────────────────────────────────────────────────
    const fetchData = async (isRefresh = false) => {
        if (!isRefresh && !initialLoadDone.current) setLoading(true);
        if (isRefresh) setRefreshing(true);

        try {
            const [userData, referralResult, walletResult] = await Promise.all([
                getUserData(),
                getReferralData(),
                getWalletTransactions(),
            ]);

            if (userData) setUser(userData);

            if (referralResult.success) {
                const d = referralResult.data;
                setReferralCode(d.referral_code || '');
                setReferralLink(d.referral_link || '');
                setReferrals(d.referrals || []);
            } else {
                handleApiError({ message: referralResult.message });
            }

            if (walletResult.success) {
                const d = walletResult.data;
                setTotalEarned(d.total_earned || 0);
                setWalletBalance(d.wallet_balance || 0);
            } else {
                handleApiError({ message: walletResult.message });
            }

            initialLoadDone.current = true;
        } catch (err) {
            handleApiError(err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    // Initial load only
    useEffect(() => {
        if (!initialLoadDone.current) {
            fetchData();
        }
    }, []);

    // Silent refresh on focus after initial load
    useFocusEffect(
        useCallback(() => {
            if (initialLoadDone.current) {
                fetchData(true);
            }
        }, [])
    );

    // ── Helpers ────────────────────────────────────────────────────────────────
    const getUserInitials = () => {
        if (!user?.name) return 'U';
        const parts = user.name.trim().split(' ');
        if (parts.length >= 2)
            return (parts[0][0] + parts[1][0]).toUpperCase();
        return parts[0][0].toUpperCase();
    };

    const copyToClipboard = (text) => {
        Clipboard.setString(text);
        Alert.alert('Copied!', 'Copied to clipboard.');
    };

    const handleShare = async () => {
        try {
            await Share.share({
                message: `Join Kreditmitraa using my referral code: ${referralCode}\n${referralLink}`,
                url: referralLink,
                title: 'Join Kreditmitraa',
            });
        } catch (e) {
            console.log(e);
        }
    };

    const bottomPadding =
        Platform.OS === 'ios'
            ? 100
            : insets.bottom > 0
                ? insets.bottom + 80
                : 80;

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
                style={styles.scroll}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{
                    paddingBottom: bottomPadding,
                    paddingHorizontal: 16,
                }}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={() => fetchData(true)}
                        colors={[GREEN_DARK]}
                        tintColor={GREEN_DARK}
                    />
                }
            >
                <Text style={styles.pageTitle}>My Referrals</Text>

                {loading && !initialLoadDone.current ? (
                    <LoadingSkeleton />
                ) : (
                    <>
                        {/* ── Wallet Balance Banner ── */}
                        <View style={styles.rewardsBanner}>
                            <View style={styles.bannerLeft}>
                                <Text style={styles.rewardsEyebrow}>
                                    AVAILABLE BALANCE
                                </Text>
                                <Text style={styles.rewardsAmount}>
                                    ₹{walletBalance.toLocaleString('en-IN')}
                                </Text>
                                <Text style={styles.rewardsTotalText}>
                                    Total Earned: ₹
                                    {totalEarned.toLocaleString('en-IN')}
                                </Text>
                            </View>

                            {/* Withdrawal Navigate Button */}
                            <TouchableOpacity
                                style={styles.withdrawNavBtn}
                                onPress={() => navigation.navigate('Withdrawal')}
                                activeOpacity={0.85}
                            >
                                <Ionicons
                                    name="cash-outline"
                                    size={18}
                                    color={GREEN_DARK}
                                />
                                <Text style={styles.withdrawNavBtnText}>
                                    Withdraw
                                </Text>
                            </TouchableOpacity>
                        </View>

                        {/* ── Referral Code Card ── */}
                        <View style={styles.card}>
                            {/* Code row */}
                            <View style={styles.codeRow}>
                                <Text style={styles.codeLabel}>
                                    Your Referral{'\n'}Code:
                                </Text>
                                <View style={styles.codeBox}>
                                    <Text style={styles.codeText}>
                                        {referralCode}
                                    </Text>
                                </View>
                                <TouchableOpacity
                                    style={styles.copyCodeBtn}
                                    onPress={() => copyToClipboard(referralCode)}
                                >
                                    <Ionicons
                                        name="copy-outline"
                                        size={13}
                                        color={TEXT_DARK}
                                    />
                                    <Text style={styles.copyCodeText}>
                                        Copy{'\n'}Code
                                    </Text>
                                </TouchableOpacity>
                            </View>

                            {/* Link row */}
                            <View style={styles.linkRow}>
                                <Text
                                    style={styles.linkText}
                                    numberOfLines={1}
                                >
                                    {referralLink}
                                </Text>
                                <TouchableOpacity
                                    style={styles.copyLinkBtn}
                                    onPress={() =>
                                        copyToClipboard(referralLink)
                                    }
                                >
                                    <Text style={styles.copyLinkText}>
                                        Copy
                                    </Text>
                                </TouchableOpacity>
                            </View>

                            {/* Share button */}
                            <TouchableOpacity
                                style={styles.shareBtn}
                                onPress={handleShare}
                                activeOpacity={0.85}
                            >
                                <Ionicons
                                    name="share-social-outline"
                                    size={16}
                                    color={WHITE}
                                />
                                <Text style={styles.shareBtnText}>
                                    Share Referral Link
                                </Text>
                            </TouchableOpacity>
                        </View>

                        {/* ── Referral History ── */}
                        <Text style={styles.sectionTitle}>
                            Referral History
                        </Text>

                        {referrals.length === 0 ? (
                            <View style={styles.emptyCard}>
                                <Ionicons
                                    name="people-outline"
                                    size={32}
                                    color={TEXT_GRAY}
                                />
                                <Text style={styles.emptyTitle}>
                                    No Referrals Yet
                                </Text>
                                <Text style={styles.emptySub}>
                                    Share your referral code and start earning!
                                </Text>
                            </View>
                        ) : (
                            referrals.map((item) => {
                                const badge =
                                    REFERRAL_STATUS[item.status] ||
                                    REFERRAL_STATUS.pending;
                                return (
                                    <View
                                        key={item.id}
                                        style={styles.historyCard}
                                    >
                                        {/* Avatar + name + status */}
                                        <View style={styles.historyHeader}>
                                            <View style={styles.avatarCircle}>
                                                <Text style={styles.avatarText}>
                                                    {item.referred_name
                                                        ?.charAt(0)
                                                        ?.toUpperCase() || '?'}
                                                </Text>
                                            </View>
                                            <View
                                                style={styles.historyNameBlock}
                                            >
                                                <Text style={styles.historyName}>
                                                    {item.referred_name}
                                                </Text>
                                                <Text
                                                    style={styles.historyPhone}
                                                >
                                                    {item.referred_mobile}
                                                </Text>
                                            </View>
                                            <View
                                                style={[
                                                    styles.statusBadge,
                                                    {
                                                        backgroundColor:
                                                            badge.bg,
                                                    },
                                                ]}
                                            >
                                                <Text
                                                    style={[
                                                        styles.statusText,
                                                        { color: badge.text },
                                                    ]}
                                                >
                                                    {item.status_label ||
                                                        badge.label}
                                                </Text>
                                            </View>
                                        </View>

                                        {/* Details grid */}
                                        <View style={styles.detailsGrid}>
                                            <View style={styles.detailCell}>
                                                <Text
                                                    style={styles.detailLabel}
                                                >
                                                    REGISTERED
                                                </Text>
                                                <Text
                                                    style={styles.detailValue}
                                                >
                                                    {
                                                        item.formatted_registration_date
                                                    }
                                                </Text>
                                            </View>
                                            <View style={styles.detailCell}>
                                                <Text
                                                    style={styles.detailLabel}
                                                >
                                                    REWARD
                                                </Text>
                                                <Text
                                                    style={[
                                                        styles.detailValue,
                                                        item.reward_earned >
                                                        0 && {
                                                            color: SUCCESS,
                                                        },
                                                    ]}
                                                >
                                                    {item.reward_earned > 0
                                                        ? `+₹${item.reward_earned.toLocaleString(
                                                            'en-IN'
                                                        )}`
                                                        : '—'}
                                                </Text>
                                            </View>
                                        </View>
                                    </View>
                                );
                            })
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
    container: { flex: 1, backgroundColor: GRAY_BG },
    scroll: { flex: 1 },

    pageTitle: {
        fontFamily: FONTS.bold,
        fontSize: 22,
        color: TEXT_DARK,
        marginTop: 14,
        marginBottom: 12,
    },

    // ── Rewards Banner ────────────────────────────────────────────────────────
    rewardsBanner: {
        backgroundColor: GREEN_DARK,
        borderRadius: 16,
        padding: 20,
        marginBottom: 14,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    bannerLeft: {
        flex: 1,
    },
    rewardsEyebrow: {
        fontFamily: FONTS.semiBold,
        fontSize: 10,
        color: '#A0B4AE',
        letterSpacing: 0.8,
        marginBottom: 4,
    },
    rewardsAmount: {
        fontFamily: FONTS.bold,
        fontSize: 30,
        color: WHITE,
        marginBottom: 4,
    },
    rewardsTotalText: {
        fontFamily: FONTS.regular,
        fontSize: 11,
        color: 'rgba(255,255,255,0.55)',
    },

    // ── Withdraw Navigate Button ───────────────────────────────────────────────
    withdrawNavBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: WHITE,
        borderRadius: 10,
        paddingVertical: 10,
        paddingHorizontal: 14,
        marginLeft: 12,
    },
    withdrawNavBtnText: {
        fontFamily: FONTS.semiBold,
        fontSize: 13,
        color: GREEN_DARK,
    },

    // ── Shared Card ───────────────────────────────────────────────────────────
    card: {
        backgroundColor: WHITE,
        borderRadius: 14,
        padding: 16,
        marginBottom: 14,
        elevation: 2,
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 2 },
    },

    // ── Referral Code ─────────────────────────────────────────────────────────
    codeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginBottom: 10,
    },
    codeLabel: {
        fontFamily: FONTS.regular,
        fontSize: 12,
        color: TEXT_GRAY,
        lineHeight: 18,
    },
    codeBox: {
        flex: 1,
        borderWidth: 1,
        borderColor: BORDER_CLR,
        borderRadius: 8,
        paddingVertical: 10,
        paddingHorizontal: 12,
    },
    codeText: {
        fontFamily: FONTS.bold,
        fontSize: 14,
        color: TEXT_DARK,
        letterSpacing: 1,
        textAlign: 'center',
    },
    copyCodeBtn: {
        alignItems: 'center',
        gap: 3,
        paddingHorizontal: 6,
    },
    copyCodeText: {
        fontFamily: FONTS.semiBold,
        fontSize: 11,
        color: TEXT_DARK,
        textAlign: 'center',
        lineHeight: 15,
    },

    // ── Link Row ──────────────────────────────────────────────────────────────
    linkRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: GRAY_BG,
        borderRadius: 8,
        paddingLeft: 12,
        paddingRight: 4,
        paddingVertical: 4,
        gap: 8,
        marginBottom: 12,
    },
    linkText: {
        flex: 1,
        fontFamily: FONTS.regular,
        fontSize: 11,
        color: TEXT_GRAY,
    },
    copyLinkBtn: {
        backgroundColor: GREEN_DARK,
        borderRadius: 7,
        paddingVertical: 9,
        paddingHorizontal: 18,
    },
    copyLinkText: {
        fontFamily: FONTS.semiBold,
        fontSize: 13,
        color: WHITE,
    },

    // ── Share Button ──────────────────────────────────────────────────────────
    shareBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: GREEN_DARK,
        borderRadius: 10,
        paddingVertical: 13,
    },
    shareBtnText: {
        fontFamily: FONTS.semiBold,
        fontSize: 14,
        color: WHITE,
    },

    // ── Section Title ─────────────────────────────────────────────────────────
    sectionTitle: {
        fontFamily: FONTS.semiBold,
        fontSize: 15,
        color: TEXT_DARK,
        marginBottom: 12,
    },

    // ── History Cards ─────────────────────────────────────────────────────────
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
    historyHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
        gap: 10,
    },
    avatarCircle: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: GRAY_BG,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: BORDER_CLR,
    },
    avatarText: {
        fontFamily: FONTS.bold,
        fontSize: 16,
        color: TEXT_DARK,
    },
    historyNameBlock: { flex: 1 },
    historyName: {
        fontFamily: FONTS.semiBold,
        fontSize: 13,
        color: TEXT_DARK,
        marginBottom: 2,
    },
    historyPhone: {
        fontFamily: FONTS.regular,
        fontSize: 11,
        color: TEXT_GRAY,
    },
    statusBadge: {
        paddingHorizontal: 12,
        paddingVertical: 5,
        borderRadius: 20,
    },
    statusText: {
        fontFamily: FONTS.semiBold,
        fontSize: 11,
    },

    // ── Details Grid ──────────────────────────────────────────────────────────
    detailsGrid: {
        flexDirection: 'row',
        borderWidth: 1,
        borderColor: BORDER_CLR,
        borderRadius: 10,
        overflow: 'hidden',
    },
    detailCell: {
        flex: 1,
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderRightWidth: 1,
        borderColor: BORDER_CLR,
    },
    detailLabel: {
        fontFamily: FONTS.regular,
        fontSize: 9,
        color: TEXT_GRAY,
        letterSpacing: 0.5,
        textTransform: 'uppercase',
        marginBottom: 4,
    },
    detailValue: {
        fontFamily: FONTS.semiBold,
        fontSize: 13,
        color: TEXT_DARK,
    },

    // ── Empty State ───────────────────────────────────────────────────────────
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
    emptyTitle: {
        fontFamily: FONTS.semiBold,
        fontSize: 15,
        color: TEXT_DARK,
        marginTop: 10,
        marginBottom: 4,
    },
    emptySub: {
        fontFamily: FONTS.regular,
        fontSize: 12,
        color: TEXT_GRAY,
        textAlign: 'center',
        lineHeight: 18,
    },
});