// screens/DashboardScreen.jsx
import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Platform,
  RefreshControl,
  Animated,
  Clipboard,
  Alert,
  Image,
  Linking,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import Header from "../components/Header";
import { COLORS } from "../constants/colors";
import { FONTS } from "../constants/fonts";
import { getDashboardData } from "../services/api/dashboardService";
import { handleApiError } from "../services/utils/errorHandler";
import { useUser } from "../context/UserContext";

// ── Design tokens ─────────────────────────────────────────────────────────────
const UI = {
  surface: "#FFFFFF",
  border: "#EAEFF3",
  text: COLORS.black,
  muted: "#6B7A89",
  success: "#16A34A",
  successSoft: "#E8F8EE",
  warning: "#D97706",
  warningSoft: "#FEF3C7",
  track: "#E8EDF2",
  radius: 20,
};

const money = (v) => `₹${Number(v || 0).toLocaleString("en-IN")}`;

// ══════════════════════════════════════════════════════════════════════════════
// ── SKELETONS ─────────────────────────────────────────────────────────────────
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
      ]),
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
          backgroundColor: "#CBD5E1",
          opacity,
        },
        style,
      ]}
    />
  );
}

function DashboardSkeleton() {
  return (
    <>
      <View style={[styles.greetingRow, { marginBottom: 20 }]}>
        <View>
          <SkeletonBox width={110} height={12} style={{ marginBottom: 8 }} />
          <SkeletonBox width={170} height={22} />
        </View>
        <SkeletonBox width={90} height={28} borderRadius={14} />
      </View>
      <SkeletonBox
        width="100%"
        height={250}
        borderRadius={UI.radius}
        style={{ marginBottom: 20 }}
      />
      <View style={{ flexDirection: "row", gap: 12 }}>
        <SkeletonBox width="31%" height={110} borderRadius={18} />
        <SkeletonBox width="31%" height={110} borderRadius={18} />
        <SkeletonBox width="31%" height={110} borderRadius={18} />
      </View>
    </>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// ── HELPERS ───────────────────────────────────────────────────────────────────
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
    pending: "#F59E0B",
    approved: "#22C55E",
    active: "#22C55E",
    rejected: "#EF4444",
    completed: "#8B5CF6",
    disbursed: "#06B6D4",
  };
  return map[status?.toLowerCase()] || COLORS.gray;
};

const formatDate = (dateString) => {
  if (!dateString) return null;
  try {
    const d = new Date(dateString.replace(" ", "T"));
    return d.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return dateString;
  }
};

const openPlayStore = (url) => {
  if (url) {
    Linking.openURL(url).catch(() =>
      Alert.alert("Error", "Could not open Play Store link."),
    );
  }
};

// ══════════════════════════════════════════════════════════════════════════════
// ── PARTNER APP CARD ──────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════

function PartnerAppCard({ app }) {
  const tagColors = {
    "tag-green": { bg: "#DCFCE7", text: "#166534" },
    "tag-blue": { bg: "#DBEAFE", text: "#1E40AF" },
    "tag-red": { bg: "#FEE2E2", text: "#991B1B" },
    "tag-amber": { bg: "#FEF3C7", text: "#92400E" },
  };
  const tagStyle = tagColors[app.tag_class] || tagColors["tag-blue"];

  return (
    <TouchableOpacity
      style={styles.partnerCard}
      activeOpacity={0.75}
      onPress={() => openPlayStore(app.play_store_url)}
    >
      <Image
        source={{ uri: app.logo }}
        style={styles.partnerLogo}
        resizeMode="contain"
      />
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

  // Keep a ref of latest user to avoid stale closures / infinite focus loop
  const userRef = useRef(user);
  useEffect(() => {
    userRef.current = user;
  }, [user]);

  // ── Fetch Dashboard ────────────────────────────────────────────────────────
  const fetchDashboard = useCallback(
    async (isRefreshing = false) => {
      if (!isRefreshing && !initialLoadDone.current) setLoading(true);
      try {
        const result = await getDashboardData();
        if (result.success) {
          setDashboardData(result.data);

          // Dashboard API must never overwrite the profile image
          if (result.data?.user) {
            const mergedUser = {
              ...result.data.user,
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
    },
    [updateUser],
  );

  useEffect(() => {
    const initialize = async () => {
      if (!initialLoadDone.current) {
        await loadUser();
        await fetchDashboard();
      }
    };
    initialize();
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (initialLoadDone.current) fetchDashboard(true);
    }, [fetchDashboard]),
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchDashboard(true);
  }, [fetchDashboard]);

  // ── Derived values ─────────────────────────────────────────────────────────
  const getUserInitials = () => {
    if (!user?.name) return "U";
    const parts = user.name.trim().split(" ");
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return parts[0][0].toUpperCase();
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  };

  const copyReferralCode = () => {
    if (user?.referral_code) {
      Clipboard.setString(user.referral_code);
      Alert.alert("Copied!", "Referral code copied to clipboard.");
    }
  };

  const isActiveUser =
    user?.is_active === 1 ||
    user?.is_active === true ||
    user?.is_active === "1";

  const activeLoansCount =
    dashboardData?.active_loans_count != null
      ? dashboardData.active_loans_count
      : dashboardData?.has_active_loan
        ? 1
        : 0;

  const creditLimit = Number(dashboardData?.credit_limit || 0);
  const remaining = Number(dashboardData?.remaining_limit || 0);
  const borrowed = Number(dashboardData?.active_loans_total_amount || 0);
  const availablePct = Math.min(
    100,
    Math.max(0, creditLimit > 0 ? (remaining / creditLimit) * 100 : 0),
  );

  const stats = [
    {
      icon: "wallet-outline",
      label: "Total loans",
      value: dashboardData?.total_loans?.toString() || "0",
      color: COLORS.primary,
      bgColor: COLORS.primary + "14",
    },
    {
      icon: "flash-outline",
      label: "Active loans",
      value: String(activeLoansCount),
      color: dashboardData?.has_active_loan ? UI.success : UI.warning,
      bgColor: dashboardData?.has_active_loan ? UI.successSoft : UI.warningSoft,
    },
    {
      icon: "shield-checkmark-outline",
      label: "Profile",
      value: dashboardData?.profile_status === "active" ? "Active" : "Inactive",
      color:
        dashboardData?.profile_status === "active" ? UI.success : "#EF4444",
      bgColor:
        dashboardData?.profile_status === "active" ? UI.successSoft : "#FEF2F2",
    },
  ];

  const bottomPadding =
    Platform.OS === "ios" ? 100 : insets.bottom > 0 ? insets.bottom + 80 : 90;

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <View style={styles.container}>
      <Header
        showLogo
        showProfile
        showNotification
        avatarText={getUserInitials()}
        profileImageUrl={user?.profile_image || null}
        onProfilePress={() => navigation.navigate("Profile")}
        onNotificationPress={() => {}}
      />

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: 8, paddingBottom: bottomPadding }}
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
            {/* ── Greeting ── */}
            <View style={styles.greetingRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.greetingText}>{getGreeting()} 👋</Text>
                <Text style={styles.userName} numberOfLines={1}>
                  {user?.name || "User"}
                </Text>
              </View>
              <View
                style={[
                  styles.statusPill,
                  {
                    backgroundColor: isActiveUser ? UI.successSoft : "#FEF2F2",
                  },
                ]}
              >
                <View
                  style={[
                    styles.statusDot,
                    { backgroundColor: isActiveUser ? UI.success : "#EF4444" },
                  ]}
                />
                <Text
                  style={[
                    styles.statusText,
                    { color: isActiveUser ? "#166534" : "#991B1B" },
                  ]}
                >
                  {isActiveUser ? "Active member" : "Inactive"}
                </Text>
              </View>
            </View>

            {/* ── Profile status banner ── */}
            {!dashboardData?.profile_completed ? (
              <TouchableOpacity
                style={[styles.banner, styles.bannerWarning]}
                onPress={() => navigation.navigate("Profile")}
                activeOpacity={0.75}
              >
                <View
                  style={[styles.bannerIcon, { backgroundColor: "#FDE68A" }]}
                >
                  <Ionicons name="alert-circle" size={20} color="#B45309" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.bannerTitle, { color: "#92400E" }]}>
                    Complete your profile
                  </Text>
                  <Text style={[styles.bannerText, { color: "#B45309" }]}>
                    {dashboardData?.profile_message ||
                      "Finish setup to unlock loan features"}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#B45309" />
              </TouchableOpacity>
            ) : (
              !!dashboardData?.profile_message && (
                <View style={[styles.banner, styles.bannerSuccess]}>
                  <View
                    style={[styles.bannerIcon, { backgroundColor: "#BBF7D0" }]}
                  >
                    <Ionicons name="checkmark" size={20} color="#166534" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.bannerTitle, { color: "#166534" }]}>
                      Profile approved
                    </Text>
                    <Text style={[styles.bannerText, { color: "#15803D" }]}>
                      {dashboardData.profile_message}
                    </Text>
                  </View>
                </View>
              )
            )}

            {/* ── Credit limit (main focus) ── */}
            {dashboardData?.credit_limit != null && (
              <View style={styles.creditCard}>
                <View style={styles.creditTop}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.creditLabel}>Available to borrow</Text>
                    <Text style={styles.creditAmount}>{money(remaining)}</Text>
                  </View>
                  <View style={styles.creditIconWrap}>
                    <Ionicons name="card" size={22} color={COLORS.primary} />
                  </View>
                </View>

                <View style={styles.creditBarWrap}>
                  <View
                    style={[
                      styles.creditBarFill,
                      { width: `${availablePct}%` },
                    ]}
                  />
                </View>
                <View style={styles.creditBarCaption}>
                  <Text style={styles.creditCaptionText}>
                    {Math.round(availablePct)}% of your limit is free
                  </Text>
                  <Text style={styles.creditCaptionText}>
                    Limit {money(creditLimit)}
                  </Text>
                </View>

                <View style={styles.creditStatsRow}>
                  <View style={styles.creditStatCol}>
                    <Text style={styles.creditStatLabel}>Credit limit</Text>
                    <Text style={styles.creditStatVal}>
                      {money(creditLimit)}
                    </Text>
                  </View>
                  <View style={styles.creditStatDivider} />
                  <View style={styles.creditStatCol}>
                    <Text style={styles.creditStatLabel}>Borrowed</Text>
                    <Text style={[styles.creditStatVal, { color: UI.warning }]}>
                      {money(borrowed)}
                    </Text>
                  </View>
                  <View style={styles.creditStatDivider} />
                  <View style={styles.creditStatCol}>
                    <Text style={styles.creditStatLabel}>Active loans</Text>
                    <Text style={styles.creditStatVal}>{activeLoansCount}</Text>
                  </View>
                </View>

                {dashboardData.can_apply_loan ? (
                  <TouchableOpacity
                    style={styles.applyBtn}
                    onPress={() =>
                      navigation.navigate("ApplyLoan", {
                        loanLimit: dashboardData.loan_limit,
                      })
                    }
                    activeOpacity={0.85}
                  >
                    <Text style={styles.applyBtnText}>Apply for a loan</Text>
                    <Ionicons
                      name="arrow-forward"
                      size={16}
                      color={COLORS.white}
                    />
                  </TouchableOpacity>
                ) : (
                  <View style={styles.applyBtnDisabled}>
                    <Ionicons
                      name={
                        remaining <= 0 ? "lock-closed-outline" : "time-outline"
                      }
                      size={16}
                      color="#92400E"
                    />
                    <Text style={styles.applyBtnDisabledText}>
                      {remaining <= 0
                        ? "Limit fully used"
                        : "Application in review"}
                    </Text>
                  </View>
                )}
              </View>
            )}

            {/* ── Overview ── */}
            <SectionHeader title="Overview" />
            <View style={styles.statsRow}>
              {stats.map((stat, index) => (
                <View key={index} style={styles.statCard}>
                  <View
                    style={[
                      styles.statIconWrapper,
                      { backgroundColor: stat.bgColor },
                    ]}
                  >
                    <Ionicons name={stat.icon} size={18} color={stat.color} />
                  </View>
                  <Text
                    style={[styles.statValue, { color: stat.color }]}
                    numberOfLines={1}
                  >
                    {stat.value}
                  </Text>
                  <Text style={styles.statLabel} numberOfLines={1}>
                    {stat.label}
                  </Text>
                </View>
              ))}
            </View>

            {/* ── Latest loan ── */}
            {dashboardData?.latest_loan && (
              <>
                <SectionHeader title="Latest loan" />
                <View style={styles.loanCard}>
                  <View style={styles.loanTop}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.loanIdText}>
                        Loan #{dashboardData.latest_loan.id}
                      </Text>
                      <Text style={styles.loanAmount}>
                        {money(dashboardData.latest_loan.amount)}
                      </Text>
                      {!!dashboardData.latest_loan.purpose && (
                        <Text style={styles.loanPurpose} numberOfLines={1}>
                          {dashboardData.latest_loan.purpose}
                        </Text>
                      )}
                    </View>
                    <View
                      style={[
                        styles.loanStatusBadge,
                        {
                          backgroundColor:
                            getStatusColor(dashboardData.latest_loan.status) +
                            "1F",
                        },
                      ]}
                    >
                      <View
                        style={[
                          styles.statusDotSmall,
                          {
                            backgroundColor: getStatusColor(
                              dashboardData.latest_loan.status,
                            ),
                          },
                        ]}
                      />
                      <Text
                        style={[
                          styles.loanStatusText,
                          {
                            color: getStatusColor(
                              dashboardData.latest_loan.status,
                            ),
                          },
                        ]}
                      >
                        {dashboardData.latest_loan.status}
                      </Text>
                    </View>
                  </View>

                  {(dashboardData.latest_loan.total_payable ||
                    dashboardData.latest_loan.due_date) && (
                    <View style={styles.loanMetaRow}>
                      {!!dashboardData.latest_loan.total_payable && (
                        <View style={styles.loanMetaItem}>
                          <Text style={styles.loanMetaLabel}>
                            Total payable
                          </Text>
                          <Text style={styles.loanMetaValue}>
                            {money(dashboardData.latest_loan.total_payable)}
                          </Text>
                        </View>
                      )}
                      {!!dashboardData.latest_loan.due_date && (
                        <View style={styles.loanMetaItem}>
                          <Text style={styles.loanMetaLabel}>Due date</Text>
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
                    onPress={() => navigation.navigate("Loans")}
                  >
                    <Text style={styles.loanViewText}>View all loans</Text>
                    <Ionicons
                      name="arrow-forward"
                      size={14}
                      color={COLORS.primary}
                    />
                  </TouchableOpacity>
                </View>
              </>
            )}

            {/* ── Referral ── */}
            {!!user?.referral_code && (
              <>
                <SectionHeader title="Refer & earn" />
                <LinearGradient
                  colors={["#F0FFF4", "#DCFCE7"]}
                  style={styles.referralCard}
                >
                  <View style={styles.referralTop}>
                    <View style={styles.referralIconBox}>
                      <Ionicons name="gift" size={22} color={UI.success} />
                    </View>
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={styles.referralTitle}>Invite friends</Text>
                      <Text style={styles.referralHint}>
                        Share your code and earn rewards
                      </Text>
                    </View>
                  </View>
                  <View style={styles.referralCodeBox}>
                    <Text style={styles.referralCode}>
                      {user.referral_code}
                    </Text>
                    <TouchableOpacity
                      style={styles.copyButton}
                      activeOpacity={0.7}
                      onPress={copyReferralCode}
                    >
                      <Ionicons name="copy-outline" size={16} color="#166534" />
                      <Text style={styles.copyText}>Copy</Text>
                    </TouchableOpacity>
                  </View>
                </LinearGradient>
              </>
            )}

            {/* ── Partner apps ── */}
            {dashboardData?.partner_apps?.length > 0 && (
              <>
                <SectionHeader title="Recommended apps" />
                <View style={{ marginBottom: 8 }}>
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

// ══════════════════════════════════════════════════════════════════════════════
// ── STYLES ────────────────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════

const softShadow = {
  elevation: 3,
  shadowColor: "#0F172A",
  shadowOpacity: 0.06,
  shadowRadius: 12,
  shadowOffset: { width: 0, height: 4 },
};

const sectionStyles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
    marginBottom: 12,
  },
  title: { fontFamily: FONTS.semiBold, fontSize: 17, color: UI.text },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { flex: 1, paddingHorizontal: 20 },

  // Greeting
  greetingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  greetingText: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    color: UI.muted,
    marginBottom: 2,
  },
  userName: { fontFamily: FONTS.bold, fontSize: 22, color: UI.text },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
    marginLeft: 12,
  },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  statusText: { fontFamily: FONTS.medium, fontSize: 11 },

  // Banners
  banner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 16,
    marginBottom: 16,
    borderWidth: 1,
  },
  bannerWarning: { backgroundColor: "#FFFBEB", borderColor: "#FDE68A" },
  bannerSuccess: { backgroundColor: "#F0FDF4", borderColor: "#BBF7D0" },
  bannerIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  bannerTitle: { fontFamily: FONTS.semiBold, fontSize: 14, marginBottom: 2 },
  bannerText: { fontFamily: FONTS.regular, fontSize: 12, lineHeight: 17 },

  // Credit card
  creditCard: {
    backgroundColor: UI.surface,
    borderRadius: UI.radius,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: UI.border,
    ...softShadow,
  },
  creditTop: { flexDirection: "row", alignItems: "center", marginBottom: 18 },
  creditLabel: {
    fontFamily: FONTS.medium,
    fontSize: 13,
    color: UI.muted,
    marginBottom: 4,
  },
  creditAmount: { fontFamily: FONTS.bold, fontSize: 32, color: COLORS.primary },
  creditIconWrap: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: COLORS.primary + "14",
    justifyContent: "center",
    alignItems: "center",
  },
  creditBarWrap: {
    height: 8,
    backgroundColor: UI.track,
    borderRadius: 4,
    overflow: "hidden",
  },
  creditBarFill: {
    height: "100%",
    backgroundColor: UI.success,
    borderRadius: 4,
  },
  creditBarCaption: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
    marginBottom: 18,
  },
  creditCaptionText: {
    fontFamily: FONTS.regular,
    fontSize: 11,
    color: UI.muted,
  },
  creditStatsRow: {
    flexDirection: "row",
    alignItems: "stretch",
    backgroundColor: "#F6F8FA",
    borderRadius: 14,
    paddingVertical: 14,
    marginBottom: 16,
  },
  creditStatCol: { flex: 1, alignItems: "center", paddingHorizontal: 4 },
  creditStatLabel: {
    fontFamily: FONTS.regular,
    fontSize: 11,
    color: UI.muted,
    marginBottom: 4,
  },
  creditStatVal: { fontFamily: FONTS.bold, fontSize: 14, color: UI.text },
  creditStatDivider: {
    width: 1,
    backgroundColor: "#DDE3E9",
    marginVertical: 2,
  },
  applyBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.primary,
    height: 50,
    borderRadius: 14,
    gap: 8,
  },
  applyBtnText: {
    fontFamily: FONTS.semiBold,
    fontSize: 15,
    color: COLORS.white,
  },
  applyBtnDisabled: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: UI.warningSoft,
    height: 50,
    borderRadius: 14,
    gap: 8,
  },
  applyBtnDisabledText: {
    fontFamily: FONTS.semiBold,
    fontSize: 14,
    color: "#92400E",
  },

  // Stats
  statsRow: { flexDirection: "row", gap: 12, marginBottom: 24 },
  statCard: {
    flex: 1,
    backgroundColor: UI.surface,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: UI.border,
    ...softShadow,
  },
  statIconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 11,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  statValue: { fontFamily: FONTS.bold, fontSize: 17, marginBottom: 2 },
  statLabel: { fontFamily: FONTS.regular, fontSize: 11, color: UI.muted },

  // Latest loan
  loanCard: {
    backgroundColor: UI.surface,
    borderRadius: UI.radius,
    padding: 18,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: UI.border,
    ...softShadow,
  },
  loanTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  loanIdText: {
    fontFamily: FONTS.medium,
    fontSize: 12,
    color: UI.muted,
    marginBottom: 4,
  },
  loanAmount: { fontFamily: FONTS.bold, fontSize: 26, color: COLORS.primary },
  loanPurpose: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    color: UI.muted,
    marginTop: 4,
  },
  loanStatusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
    marginLeft: 10,
  },
  statusDotSmall: { width: 6, height: 6, borderRadius: 3 },
  loanStatusText: {
    fontFamily: FONTS.semiBold,
    fontSize: 12,
    textTransform: "capitalize",
  },
  loanMetaRow: {
    flexDirection: "row",
    marginTop: 16,
    backgroundColor: "#F6F8FA",
    borderRadius: 12,
    padding: 12,
    gap: 16,
  },
  loanMetaItem: { flex: 1 },
  loanMetaLabel: {
    fontFamily: FONTS.regular,
    fontSize: 11,
    color: UI.muted,
    marginBottom: 3,
  },
  loanMetaValue: { fontFamily: FONTS.semiBold, fontSize: 14, color: UI.text },
  loanDivider: { height: 1, backgroundColor: UI.border, marginVertical: 14 },
  loanViewBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  loanViewText: {
    fontFamily: FONTS.semiBold,
    fontSize: 14,
    color: COLORS.primary,
  },

  // Referral
  referralCard: { borderRadius: UI.radius, padding: 18, marginBottom: 24 },
  referralTop: { flexDirection: "row", alignItems: "center", marginBottom: 14 },
  referralIconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "#BBF7D0",
    justifyContent: "center",
    alignItems: "center",
  },
  referralTitle: {
    fontFamily: FONTS.semiBold,
    fontSize: 15,
    color: "#166534",
    marginBottom: 2,
  },
  referralHint: { fontFamily: FONTS.regular, fontSize: 12, color: "#15803D" },
  referralCodeBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderWidth: 1.5,
    borderColor: "#4ADE80",
    borderStyle: "dashed",
    borderRadius: 14,
    paddingVertical: 10,
    paddingLeft: 16,
    paddingRight: 10,
  },
  referralCode: {
    flex: 1,
    fontFamily: FONTS.bold,
    fontSize: 18,
    color: "#166534",
    letterSpacing: 3,
    textAlign: "center",
  },
  copyButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  copyText: { fontFamily: FONTS.semiBold, fontSize: 12, color: "#166534" },

  // Partner apps
  partnerCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: UI.surface,
    borderRadius: 16,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: UI.border,
    ...softShadow,
  },
  partnerLogo: {
    width: 46,
    height: 46,
    borderRadius: 12,
    backgroundColor: "#F1F5F9",
  },
  partnerTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  partnerName: {
    fontFamily: FONTS.semiBold,
    fontSize: 14,
    color: UI.text,
    flex: 1,
    marginRight: 6,
  },
  partnerTag: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  partnerTagText: { fontFamily: FONTS.semiBold, fontSize: 10 },
  partnerDescription: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    color: UI.muted,
    marginTop: 4,
    lineHeight: 16,
  },
  partnerMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 6,
    gap: 4,
  },
  partnerMetaText: { fontFamily: FONTS.medium, fontSize: 11, color: UI.muted },
  partnerMetaDot: { fontSize: 11, color: UI.muted, marginHorizontal: 2 },
});
