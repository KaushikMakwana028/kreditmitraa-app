// screens/DashboardScreen.jsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
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
    Clipboard,
    Alert,
    Image,
    Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import Header from '../components/Header';
import { COLORS } from '../constants/colors';
import { FONTS } from '../constants/fonts';
import { getDashboardData } from '../services/api/dashboardService';
import { handleApiError } from '../services/utils/errorHandler';
import { useUser } from '../context/UserContext';

const { width } = Dimensions.get('window');

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

function HeroCardSkeleton() {
    return (
        <View style={[styles.heroCard, { backgroundColor: '#E2E8F0' }]}>
            <View style={{ flex: 1 }}>
                <SkeletonBox width={100} height={12} borderRadius={6} style={{ marginBottom: 8 }} />
                <SkeletonBox width={160} height={24} borderRadius={8} style={{ marginBottom: 12 }} />
                <SkeletonBox width={80} height={24} borderRadius={12} />
            </View>
            <SkeletonBox width={58} height={58} borderRadius={29} />
        </View>
    );
}

function DashboardSkeleton() {
    return (
        <>
            <HeroCardSkeleton />
            <View style={{ height: 200, backgroundColor: '#E2E8F0', borderRadius: 12, marginBottom: 16 }} />
        </>
    );
}

// ══════════════════════════════════════════════════════════════════════════════
// ── SECTION HEADER & HELPERS ──────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════

function SectionHeader({ title }) {
    return (
        <View style={sectionStyles.row}>
            <Text style={sectionStyles.title}>{title}</Text>
        </View>
    );
}

const getStatusColor = (status) => {
    const map = {
        pending: '#F59E0B',
        approved: '#22C55E',
        active: '#22C55E',
        rejected: '#EF4444',
        completed: '#8B5CF6',
        disbursed: '#06B6D4',
    };
    return map[status?.toLowerCase()] || COLORS.gray;
};

const formatDate = (dateString) => {
    if (!dateString) return null;
    try {
        const d = new Date(dateString.replace(' ', 'T'));
        return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch {
        return dateString;
    }
};

const openPlayStore = (url) => {
    if (url) {
        Linking.openURL(url).catch(() =>
            Alert.alert('Error', 'Could not open Play Store link.')
        );
    }
};

// ══════════════════════════════════════════════════════════════════════════════
// ── PARTNER APP CARD ──────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════

function PartnerAppCard({ app }) {
    const tagColors = {
        'tag-green': { bg: '#DCFCE7', text: '#166534' },
        'tag-blue': { bg: '#DBEAFE', text: '#1E40AF' },
        'tag-red': { bg: '#FEE2E2', text: '#991B1B' },
        'tag-amber': { bg: '#FEF3C7', text: '#92400E' },
    };
    const tagStyle = tagColors[app.tag_class] || tagColors['tag-blue'];

    return (
        <TouchableOpacity
            style={styles.partnerCard}
            activeOpacity={0.75}
            onPress={() => openPlayStore(app.play_store_url)}
        >
            <Image source={{ uri: app.logo }} style={styles.partnerLogo} resizeMode="contain" />
            <View style={{ flex: 1, marginLeft: 12 }}>
                <View style={styles.partnerTopRow}>
                    <Text style={styles.partnerName} numberOfLines={1}>
                        {app.name}
                    </Text>
                    {app.tag && (
                        <View style={[styles.partnerTag, { backgroundColor: tagStyle.bg }]}>
                            <Text style={[styles.partnerTagText, { color: tagStyle.text }]}>
                                {app.tag}
                            </Text>
                        </View>
                    )}
                </View>
                {app.description && (
                    <Text style={styles.partnerDescription} numberOfLines={2}>
                        {app.description}
                    </Text>
                )}
                <View style={styles.partnerMetaRow}>
                    {app.rating != null && (
                        <>
                            <Ionicons name="star" size={12} color="#F59E0B" />
                            <Text style={styles.partnerMetaText}>{app.rating}</Text>
                        </>
                    )}
                    {app.rating != null && app.downloads && (
                        <Text style={styles.partnerMetaDot}>•</Text>
                    )}
                    {app.downloads && (
                        <Text style={styles.partnerMetaText}>{app.downloads}</Text>
                    )}
                </View>
            </View>
            <Ionicons name="chevron-forward" size={16} color={COLORS.gray} />
        </TouchableOpacity>
    );
}

// ══════════════════════════════════════════════════════════════════════════════
// ── MAIN COMPONENT ────────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════

export default function DashboardScreen({ navigation }) {
    const insets = useSafeAreaInsets();
    const { user, updateUser, loadUser } = useUser();

    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [dashboardData, setDashboardData] = useState(null);

    const initialLoadDone = useRef(false);

    // ── KEY FIX: Keep a ref of latest user to avoid stale closures ────────────
    // This lets fetchDashboard always access latest user.profile_image
    // WITHOUT adding user to useFocusEffect dependencies (which causes infinite loop)
    const userRef = useRef(user);
    useEffect(() => {
        userRef.current = user; // ← Always keep ref in sync with latest user
    }, [user]);

    // ── Fetch Dashboard ────────────────────────────────────────────────────────
    const fetchDashboard = useCallback(async (isRefreshing = false) => {
        if (!isRefreshing && !initialLoadDone.current) setLoading(true);
        try {
            const result = await getDashboardData();
            if (result.success) {
                setDashboardData(result.data);

                // ── Always preserve existing profile_image from context ref ──
                // Dashboard API should NEVER overwrite the profile image
                // Profile image is managed by ProfileScreen via updateProfileImage()
                if (result.data?.user) {
                    const apiUser = result.data.user;
                    const mergedUser = {
                        ...apiUser,
                        // ✅ Use ref to get latest image without dependency issues
                        profile_image: userRef.current?.profile_image || null,
                    };
                    await updateUser(mergedUser);
                }

                initialLoadDone.current = true;
            } else {
                handleApiError({ message: result.message });
            }
        } catch (err) {
            handleApiError(err);
        } finally {
            setLoading(false);
            if (isRefreshing) setRefreshing(false);
        }
    }, [updateUser]); // ← Only depends on updateUser (stable reference)

    // ── Initial load ───────────────────────────────────────────────────────────
    useEffect(() => {
        const initialize = async () => {
            if (!initialLoadDone.current) {
                console.log('🚀 Dashboard: Initial load');
                await loadUser(); // Load from storage first (has the latest image)
                await fetchDashboard();
            }
        };
        initialize();
    }, []); // ← Run once on mount only

    // ── Focus refresh ──────────────────────────────────────────────────────────
    // ✅ No [user] dependency - uses userRef.current inside fetchDashboard instead
    // This prevents the infinite loop: updateUser → user changes → useFocusEffect → repeat
    useFocusEffect(
        useCallback(() => {
            if (initialLoadDone.current) {
                console.log('🔄 Dashboard: Screen focused, refreshing');
                fetchDashboard(true);
            }
        }, [fetchDashboard]) // ← fetchDashboard is stable (wrapped in useCallback)
    );

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        fetchDashboard(true);
    }, [fetchDashboard]);

    // ── Helpers ────────────────────────────────────────────────────────────────
    const getUserInitials = () => {
        if (!user?.name) return 'U';
        const parts = user.name.trim().split(' ');
        if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
        return parts[0][0].toUpperCase();
    };

    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return 'Good Morning';
        if (hour < 17) return 'Good Afternoon';
        return 'Good Evening';
    };

    const copyReferralCode = () => {
        if (user?.referral_code) {
            Clipboard.setString(user.referral_code);
            Alert.alert('Copied!', 'Referral code copied to clipboard.');
        }
    };

    // ── Stats ──────────────────────────────────────────────────────────────────
    const stats = [
        {
            icon: 'wallet-outline',
            label: 'Total Loans',
            value: dashboardData?.total_loans?.toString() || '0',
            color: COLORS.primary,
            bgColor: '#E8F4FF',
        },
        {
            icon: 'flash-outline',
            label: 'Active Loan',
            value: dashboardData?.has_active_loan ? 'Yes' : 'No',
            color: dashboardData?.has_active_loan ? '#22C55E' : '#F59E0B',
            bgColor: dashboardData?.has_active_loan ? '#F0FFF4' : '#FFF8E5',
        },
        {
            icon: 'shield-checkmark-outline',
            label: 'Profile',
            value: dashboardData?.profile_status === 'active' ? 'Active' : 'Inactive',
            color: dashboardData?.profile_status === 'active' ? '#22C55E' : '#EF4444',
            bgColor: dashboardData?.profile_status === 'active' ? '#F0FFF4' : '#FEF2F2',
        },
    ];

    const bottomPadding = Platform.OS === 'ios' ? 100 : insets.bottom > 0 ? insets.bottom + 80 : 80;

    // ── Render ─────────────────────────────────────────────────────────────────
    return (
        <View style={styles.container}>
            {/* ── Header with Profile Image from context ── */}
            <Header
                showLogo
                showProfile
                showNotification
                avatarText={getUserInitials()}
                profileImageUrl={user?.profile_image || null}
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
                {loading && !dashboardData ? (
                    <DashboardSkeleton />
                ) : (
                    <>
                        {/* ── Hero Greeting Card ── */}
                        <LinearGradient
                            colors={[COLORS.primary, '#1a6fd4']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={styles.heroCard}
                        >
                            <View style={styles.heroBubble1} />
                            <View style={styles.heroBubble2} />

                            <View style={styles.heroContent}>
                                <View style={styles.heroLeft}>
                                    <Text style={styles.greetingText}>
                                        {getGreeting()} 👋
                                    </Text>
                                    <Text style={styles.userName}>
                                        {user?.name || 'User'}
                                    </Text>
                                    <View style={styles.statusPill}>
                                        <View
                                            style={[
                                                styles.statusDot,
                                                {
                                                    backgroundColor:
                                                        user?.is_active === 1 ||
                                                            user?.is_active === true ||
                                                            user?.is_active === '1'
                                                            ? '#4ADE80'
                                                            : '#F87171',
                                                },
                                            ]}
                                        />
                                        <Text style={styles.statusText}>
                                            {user?.is_active === 1 ||
                                                user?.is_active === true ||
                                                user?.is_active === '1'
                                                ? 'Active Member'
                                                : 'Inactive'}
                                        </Text>
                                    </View>
                                </View>

                                {/* ── Hero Avatar with Profile Image from context ── */}
                                <TouchableOpacity
                                    style={styles.heroAvatar}
                                    onPress={() => navigation.navigate('Profile')}
                                    activeOpacity={0.8}
                                >
                                    {user?.profile_image ? (
                                        <Image
                                            source={{ uri: user.profile_image }}
                                            style={styles.heroAvatarImage}
                                        />
                                    ) : (
                                        <Text style={styles.heroAvatarText}>
                                            {getUserInitials()}
                                        </Text>
                                    )}
                                </TouchableOpacity>
                            </View>

                            {user?.mobile && (
                                <View style={styles.mobilePill}>
                                    <Ionicons name="call-outline" size={12} color="rgba(255,255,255,0.8)" />
                                    <Text style={styles.mobilePillText}>+91 {user.mobile}</Text>
                                </View>
                            )}
                        </LinearGradient>

                        {/* ── Profile Incomplete Warning ── */}
                        {!dashboardData?.profile_completed && (
                            <TouchableOpacity
                                style={styles.warningCard}
                                onPress={() => navigation.navigate('Profile')}
                                activeOpacity={0.75}
                            >
                                <View style={styles.warningIconBox}>
                                    <Ionicons name="alert-circle" size={22} color="#F59E0B" />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.warningTitle}>Complete Your Profile</Text>
                                    <Text style={styles.warningText}>
                                        {dashboardData?.profile_message || 'Finish setup to unlock loan features'}
                                    </Text>
                                </View>
                                <Ionicons name="chevron-forward" size={18} color="#F59E0B" />
                            </TouchableOpacity>
                        )}

                        {/* ── Profile Active Info ── */}
                        {dashboardData?.profile_completed && dashboardData?.profile_message && (
                            <View style={styles.successCard}>
                                <View style={styles.successIconBox}>
                                    <Ionicons name="checkmark-circle" size={22} color="#22C55E" />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.successTitle}>Profile Approved</Text>
                                    <Text style={styles.successText}>{dashboardData.profile_message}</Text>
                                </View>
                            </View>
                        )}

                        {/* ── Stats ── */}
                        <SectionHeader title="Overview" />
                        <View style={styles.statsRow}>
                            {stats.map((stat, index) => (
                                <View
                                    key={index}
                                    style={[styles.statCard, index === 1 && { marginHorizontal: 8 }]}
                                >
                                    <View style={[styles.statIconWrapper, { backgroundColor: stat.bgColor }]}>
                                        <Ionicons name={stat.icon} size={18} color={stat.color} />
                                    </View>
                                    <Text style={[styles.statValue, { color: stat.color }]}>{stat.value}</Text>
                                    <Text style={styles.statLabel}>{stat.label}</Text>
                                </View>
                            ))}
                        </View>

                        {/* ── Latest Loan ── */}
                        {dashboardData?.latest_loan && (
                            <>
                                <SectionHeader title="Latest Loan" />
                                <View style={styles.loanCard}>
                                    <View style={styles.loanTop}>
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.loanIdText}>
                                                Loan #{dashboardData.latest_loan.id}
                                            </Text>
                                            <Text style={styles.loanAmount}>
                                                ₹{Number(dashboardData.latest_loan.amount).toLocaleString('en-IN')}
                                            </Text>
                                            {dashboardData.latest_loan.purpose && (
                                                <Text style={styles.loanPurpose}>
                                                    {dashboardData.latest_loan.purpose}
                                                </Text>
                                            )}
                                        </View>
                                        <View
                                            style={[
                                                styles.loanStatusBadge,
                                                {
                                                    backgroundColor:
                                                        getStatusColor(dashboardData.latest_loan.status) + '20',
                                                },
                                            ]}
                                        >
                                            <View
                                                style={[
                                                    styles.statusDotSmall,
                                                    {
                                                        backgroundColor: getStatusColor(
                                                            dashboardData.latest_loan.status
                                                        ),
                                                    },
                                                ]}
                                            />
                                            <Text
                                                style={[
                                                    styles.loanStatusText,
                                                    {
                                                        color: getStatusColor(
                                                            dashboardData.latest_loan.status
                                                        ),
                                                    },
                                                ]}
                                            >
                                                {dashboardData.latest_loan.status}
                                            </Text>
                                        </View>
                                    </View>

                                    {/* ── Extra Loan Meta (total payable / due date) ── */}
                                    {(dashboardData.latest_loan.total_payable ||
                                        dashboardData.latest_loan.due_date) && (
                                            <View style={styles.loanMetaRow}>
                                                {dashboardData.latest_loan.total_payable && (
                                                    <View style={styles.loanMetaItem}>
                                                        <Text style={styles.loanMetaLabel}>Total Payable</Text>
                                                        <Text style={styles.loanMetaValue}>
                                                            ₹
                                                            {Number(
                                                                dashboardData.latest_loan.total_payable
                                                            ).toLocaleString('en-IN')}
                                                        </Text>
                                                    </View>
                                                )}
                                                {dashboardData.latest_loan.due_date && (
                                                    <View style={styles.loanMetaItem}>
                                                        <Text style={styles.loanMetaLabel}>Due Date</Text>
                                                        <Text style={styles.loanMetaValue}>
                                                            {formatDate(dashboardData.latest_loan.due_date)}
                                                        </Text>
                                                    </View>
                                                )}
                                            </View>
                                        )}

                                    <View style={styles.loanDivider} />

                                    <TouchableOpacity
                                        style={styles.loanViewBtn}
                                        activeOpacity={0.7}
                                        onPress={() => navigation.navigate('Loans')}
                                    >
                                        <Text style={styles.loanViewText}>View All Loans</Text>
                                        <Ionicons name="arrow-forward" size={14} color={COLORS.primary} />
                                    </TouchableOpacity>
                                </View>
                            </>
                        )}

                        {/* ── Referral Card ── */}
                        {user?.referral_code && (
                            <>
                                <SectionHeader title="Refer & Earn" />
                                <LinearGradient colors={['#F0FFF4', '#DCFCE7']} style={styles.referralCard}>
                                    <View style={styles.referralTop}>
                                        <View style={styles.referralIconBox}>
                                            <Ionicons name="gift" size={22} color="#22C55E" />
                                        </View>
                                        <View style={{ flex: 1, marginLeft: 12 }}>
                                            <Text style={styles.referralTitle}>Invite Friends</Text>
                                            <Text style={styles.referralHint}>
                                                Share your code and earn rewards
                                            </Text>
                                        </View>
                                    </View>
                                    <View style={styles.referralCodeBox}>
                                        <Text style={styles.referralCode}>{user.referral_code}</Text>
                                        <TouchableOpacity
                                            style={styles.copyButton}
                                            activeOpacity={0.7}
                                            onPress={copyReferralCode}
                                        >
                                            <Ionicons name="copy-outline" size={16} color="#22C55E" />
                                            <Text style={styles.copyText}>Copy</Text>
                                        </TouchableOpacity>
                                    </View>
                                </LinearGradient>
                            </>
                        )}

                        {/* ── Partner Apps ── */}
                        {dashboardData?.partner_apps?.length > 0 && (
                            <>
                                <SectionHeader title="Recommended Apps" />
                                <View style={{ marginBottom: 16 }}>
                                    {dashboardData.partner_apps.map((app, index) => (
                                        <PartnerAppCard key={app.name || index} app={app} />
                                    ))}
                                </View>
                            </>
                        )}
                    </>
                )}
            </ScrollView>
        </View>
    );
}

// ── Styles ─────────────────────────────────────────────────────────────────────
const sectionStyles = StyleSheet.create({
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
        marginTop: 4,
    },
    title: { fontFamily: FONTS.semiBold, fontSize: 16, color: COLORS.black },
});

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    content: { flex: 1, paddingHorizontal: 20 },
    heroCard: {
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
        width: 140,
        height: 140,
        borderRadius: 70,
        backgroundColor: 'rgba(255,255,255,0.08)',
        top: -40,
        right: -30,
    },
    heroBubble2: {
        position: 'absolute',
        width: 90,
        height: 90,
        borderRadius: 45,
        backgroundColor: 'rgba(255,255,255,0.06)',
        bottom: -20,
        left: 20,
    },
    heroContent: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    heroLeft: { flex: 1 },
    greetingText: {
        fontFamily: FONTS.regular,
        fontSize: 13,
        color: 'rgba(255,255,255,0.85)',
        marginBottom: 4,
    },
    userName: { fontFamily: FONTS.bold, fontSize: 22, color: '#fff', marginBottom: 10 },
    statusPill: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.15)',
        alignSelf: 'flex-start',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 20,
        gap: 5,
    },
    statusDot: { width: 7, height: 7, borderRadius: 4 },
    statusText: { fontFamily: FONTS.medium, fontSize: 11, color: '#fff' },
    heroAvatar: {
        width: 58,
        height: 58,
        borderRadius: 29,
        backgroundColor: 'rgba(255,255,255,0.2)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: 'rgba(255,255,255,0.4)',
        marginLeft: 12,
        overflow: 'hidden',
    },
    heroAvatarImage: { width: '100%', height: '100%' },
    heroAvatarText: { fontFamily: FONTS.bold, fontSize: 20, color: '#fff' },
    mobilePill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        backgroundColor: 'rgba(255,255,255,0.12)',
        alignSelf: 'flex-start',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 20,
    },
    mobilePillText: {
        fontFamily: FONTS.regular,
        fontSize: 12,
        color: 'rgba(255,255,255,0.85)',
    },
    warningCard: {
        backgroundColor: '#FFFBEB',
        borderRadius: 14,
        padding: 14,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#FDE68A',
    },
    warningIconBox: {
        width: 38,
        height: 38,
        borderRadius: 10,
        backgroundColor: '#FEF3C7',
        justifyContent: 'center',
        alignItems: 'center',
    },
    warningTitle: { fontFamily: FONTS.semiBold, fontSize: 13, color: '#92400E', marginBottom: 2 },
    warningText: { fontFamily: FONTS.regular, fontSize: 11, color: '#B45309', lineHeight: 15 },
    successCard: {
        backgroundColor: '#F0FFF4',
        borderRadius: 14,
        padding: 14,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#BBF7D0',
    },
    successIconBox: {
        width: 38,
        height: 38,
        borderRadius: 10,
        backgroundColor: '#DCFCE7',
        justifyContent: 'center',
        alignItems: 'center',
    },
    successTitle: { fontFamily: FONTS.semiBold, fontSize: 13, color: '#166534', marginBottom: 2 },
    successText: { fontFamily: FONTS.regular, fontSize: 11, color: '#15803D', lineHeight: 15 },
    statsRow: { flexDirection: 'row', marginBottom: 24 },
    statCard: {
        flex: 1,
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 14,
        alignItems: 'flex-start',
        elevation: 2,
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 2 },
    },
    statIconWrapper: {
        width: 38,
        height: 38,
        borderRadius: 11,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 10,
    },
    statValue: { fontFamily: FONTS.bold, fontSize: 15, marginBottom: 3 },
    statLabel: { fontFamily: FONTS.regular, fontSize: 10, color: COLORS.gray },
    loanCard: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 18,
        marginBottom: 24,
        elevation: 2,
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 2 },
    },
    loanTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
    loanIdText: { fontFamily: FONTS.medium, fontSize: 12, color: COLORS.gray, marginBottom: 4 },
    loanAmount: { fontFamily: FONTS.bold, fontSize: 22, color: COLORS.primary, marginBottom: 2 },
    loanPurpose: { fontFamily: FONTS.regular, fontSize: 12, color: COLORS.gray, marginTop: 2 },
    loanStatusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 10,
        gap: 5,
    },
    statusDotSmall: { width: 6, height: 6, borderRadius: 3 },
    loanStatusText: { fontFamily: FONTS.semiBold, fontSize: 11, textTransform: 'capitalize' },
    loanMetaRow: {
        flexDirection: 'row',
        marginTop: 14,
        gap: 24,
    },
    loanMetaItem: { flex: 1 },
    loanMetaLabel: { fontFamily: FONTS.regular, fontSize: 11, color: COLORS.gray, marginBottom: 2 },
    loanMetaValue: { fontFamily: FONTS.semiBold, fontSize: 13, color: COLORS.black },
    loanDivider: {
        height: 1,
        backgroundColor: COLORS.border || '#F1F5F9',
        marginVertical: 14,
    },
    loanViewBtn: { flexDirection: 'row', alignItems: 'center', gap: 5 },
    loanViewText: { fontFamily: FONTS.semiBold, fontSize: 13, color: COLORS.primary },
    referralCard: { borderRadius: 16, padding: 18, marginBottom: 16 },
    referralTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
    referralIconBox: {
        width: 44,
        height: 44,
        borderRadius: 12,
        backgroundColor: '#DCFCE7',
        justifyContent: 'center',
        alignItems: 'center',
    },
    referralTitle: { fontFamily: FONTS.semiBold, fontSize: 14, color: '#166534', marginBottom: 2 },
    referralHint: { fontFamily: FONTS.regular, fontSize: 11, color: '#15803D' },
    referralCodeBox: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        borderWidth: 1.5,
        borderColor: '#22C55E',
        borderStyle: 'dashed',
        borderRadius: 12,
        paddingVertical: 12,
        paddingHorizontal: 16,
    },
    referralCode: {
        flex: 1,
        fontFamily: FONTS.bold,
        fontSize: 18,
        color: '#166534',
        letterSpacing: 3,
        textAlign: 'center',
    },
    copyButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: '#DCFCE7',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 8,
    },
    copyText: { fontFamily: FONTS.semiBold, fontSize: 12, color: '#22C55E' },
    partnerCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        borderRadius: 14,
        padding: 12,
        marginBottom: 10,
        elevation: 2,
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 2 },
    },
    partnerLogo: { width: 44, height: 44, borderRadius: 10, backgroundColor: '#F1F5F9' },
    partnerTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    partnerName: { fontFamily: FONTS.semiBold, fontSize: 13, color: COLORS.black, flex: 1, marginRight: 6 },
    partnerTag: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
    partnerTagText: { fontFamily: FONTS.semiBold, fontSize: 9 },
    partnerDescription: { fontFamily: FONTS.regular, fontSize: 11, color: COLORS.gray, marginTop: 4, lineHeight: 15 },
    partnerMetaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6, gap: 4 },
    partnerMetaText: { fontFamily: FONTS.medium, fontSize: 11, color: COLORS.gray },
    partnerMetaDot: { fontSize: 11, color: COLORS.gray, marginHorizontal: 2 },
});