// screens/LoansScreen.jsx
import React, { useState, useCallback, useRef, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Platform,
  RefreshControl,
  Animated,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import Header from "../components/Header";
import { COLORS } from "../constants/colors";
import { FONTS } from "../constants/fonts";
import { getLoans } from "../services/api/loansService";
import { handleApiError } from "../services/utils/errorHandler";
import { getUserData } from "../services/utils/storage";

// ─── Design Tokens (shared with DashboardScreen) ──────────────────────────────
const UI = {
  surface: "#FFFFFF",
  border: "#EAEFF3",
  text: COLORS.black || "#1A1A2E",
  muted: "#6B7A89",
  success: "#16A34A",
  successSoft: "#E8F8EE",
  warning: "#D97706",
  warningSoft: "#FEF3C7",
  track: "#E8EDF2",
  soft: "#F6F8FA",
  radius: 20,
};

const money = (v) => `₹${Number(v || 0).toLocaleString("en-IN")}`;

// ── Status Config ─────────────────────────────────────────────────────────────
const STATUS_CONFIG = {
  approved: {
    color: "#16A34A",
    bg: "#E8F8EE",
    icon: "checkmark-circle",
    label: "Approved",
  },
  pending: { color: "#D97706", bg: "#FEF3C7", icon: "time", label: "Pending" },
  active: { color: "#2563EB", bg: "#E8F0FE", icon: "flash", label: "Active" },
  paid: {
    color: "#7C3AED",
    bg: "#F1EBFE",
    icon: "shield-checkmark",
    label: "Paid",
  },
  rejected: {
    color: "#DC2626",
    bg: "#FEECEC",
    icon: "close-circle",
    label: "Rejected",
  },
  disbursed: {
    color: "#0891B2",
    bg: "#E0F6FA",
    icon: "arrow-forward-circle",
    label: "Disbursed",
  },
};

const getStatusConfig = (status) =>
  STATUS_CONFIG[status?.toLowerCase()] || {
    color: UI.muted,
    bg: "#F1F4F7",
    icon: "ellipse-outline",
    label: status || "Unknown",
  };

const FILTERS = ["All", "Pending", "Approved", "Active", "Paid", "Rejected"];

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

function LoadingSkeleton() {
  return (
    <>
      <SkeletonBox width={150} height={24} style={{ marginBottom: 16 }} />
      <SkeletonBox
        width="100%"
        height={230}
        borderRadius={UI.radius}
        style={{ marginBottom: 16 }}
      />
      <SkeletonBox
        width="100%"
        height={50}
        borderRadius={14}
        style={{ marginBottom: 16 }}
      />
      <View style={{ flexDirection: "row", gap: 8, marginBottom: 16 }}>
        {[70, 84, 90, 68, 60].map((w, i) => (
          <SkeletonBox key={i} width={w} height={36} borderRadius={20} />
        ))}
      </View>
      {[1, 2, 3].map((i) => (
        <SkeletonBox
          key={i}
          width="100%"
          height={120}
          borderRadius={UI.radius}
          style={{ marginBottom: 12 }}
        />
      ))}
    </>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// ── COMPONENTS ────────────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════

function SummaryTile({ label, value, icon, color, bg }) {
  return (
    <View style={styles.summaryTile}>
      <View style={[styles.summaryIcon, { backgroundColor: bg }]}>
        <Ionicons name={icon} size={16} color={color} />
      </View>
      <Text style={styles.summaryValue}>{value}</Text>
      <Text style={styles.summaryLabel} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

function LoanCard({ loan, onPress }) {
  const statusCfg = getStatusConfig(loan.status);
  const daysLeft = loan.days_left;
  const daysColor =
    daysLeft === "Paid"
      ? UI.success
      : daysLeft?.includes?.("Remaining")
        ? UI.warning
        : UI.text;

  return (
    <TouchableOpacity
      style={styles.loanCard}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={styles.loanCardTop}>
        <View style={[styles.loanIconBox, { backgroundColor: statusCfg.bg }]}>
          <Ionicons name={statusCfg.icon} size={22} color={statusCfg.color} />
        </View>

        <View style={styles.loanCardMain}>
          <Text style={styles.loanAmount}>{money(loan.amount)}</Text>
          <Text style={styles.loanPurpose} numberOfLines={1}>
            {loan.purpose === "-" || !loan.purpose
              ? "General purpose"
              : loan.purpose}
          </Text>
        </View>

        <View style={[styles.statusBadge, { backgroundColor: statusCfg.bg }]}>
          <View
            style={[styles.statusDot, { backgroundColor: statusCfg.color }]}
          />
          <Text style={[styles.statusBadgeText, { color: statusCfg.color }]}>
            {statusCfg.label}
          </Text>
        </View>
      </View>

      <View style={styles.loanMetaBox}>
        <View style={styles.loanMetaCol}>
          <Text style={styles.loanMetaLabel}>Applied</Text>
          <Text style={styles.loanMetaValue} numberOfLines={1}>
            {loan.formatted_applied_date || "-"}
          </Text>
        </View>
        <View style={styles.loanMetaDivider} />
        <View style={styles.loanMetaCol}>
          <Text style={styles.loanMetaLabel}>Tenure</Text>
          <Text style={styles.loanMetaValue} numberOfLines={1}>
            {loan.tenure_days ? `${loan.tenure_days} days` : "-"}
          </Text>
        </View>
        <View style={styles.loanMetaDivider} />
        <View style={styles.loanMetaCol}>
          <Text style={styles.loanMetaLabel}>Status</Text>
          <Text
            style={[styles.loanMetaValue, { color: daysColor }]}
            numberOfLines={1}
          >
            {daysLeft || "-"}
          </Text>
        </View>
        <Ionicons
          name="chevron-forward"
          size={16}
          color={UI.muted}
          style={{ marginLeft: 6 }}
        />
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
          size={36}
          color={COLORS.primary}
        />
      </View>
      <Text style={styles.emptyTitle}>No loans found</Text>
      <Text style={styles.emptyText}>
        {filter === "All"
          ? "You haven't applied for any loans yet."
          : `No ${filter.toLowerCase()} loans right now.`}
      </Text>
    </View>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// ── MAIN SCREEN ───────────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════

export default function LoansScreen({ navigation }) {
  const insets = useSafeAreaInsets();

  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loansData, setLoansData] = useState(null);
  const [activeFilter, setActiveFilter] = useState("All");
  const [user, setUser] = useState(null);

  const initialLoadDone = useRef(false);

  useEffect(() => {
    if (!initialLoadDone.current) fetchLoans();
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

  useFocusEffect(
    useCallback(() => {
      if (initialLoadDone.current) fetchLoans(true);
    }, []),
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchLoans(true);
  };

  // ── Helpers ────────────────────────────────────────────────────────────────
  const getUserInitials = () => {
    if (!user?.name) return "U";
    const parts = user.name.trim().split(" ");
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return parts[0][0].toUpperCase();
  };

  const allLoans = loansData?.loans || [];

  const loans =
    activeFilter === "All"
      ? allLoans
      : allLoans.filter(
          (l) => l.status?.toLowerCase() === activeFilter.toLowerCase(),
        );

  const summary = {
    total: allLoans.length,
    active: allLoans.filter((l) =>
      ["active", "approved", "disbursed"].includes(l.status?.toLowerCase()),
    ).length,
    paid: allLoans.filter((l) => l.status?.toLowerCase() === "paid").length,
    pending: allLoans.filter((l) => l.status?.toLowerCase() === "pending")
      .length,
  };

  const creditLimit = Number(loansData?.credit_limit || 0);
  const remaining = Number(loansData?.remaining_limit || 0);
  const borrowed = Number(loansData?.active_loans_total_amount || 0);
  const availablePct = Math.min(
    100,
    Math.max(0, creditLimit > 0 ? (remaining / creditLimit) * 100 : 0),
  );
  const profileActive = loansData?.profile_status === "active";

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
        profileImageUrl={user?.profile_image}
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
        {loading && !loansData ? (
          <LoadingSkeleton />
        ) : (
          <>
            {/* ── Title row ── */}
            <View style={styles.titleRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.pageTitle}>My loans</Text>
                <Text style={styles.pageSubtitle} numberOfLines={2}>
                  {loansData?.profile_message ||
                    "Manage and track all your loans here."}
                </Text>
              </View>
              <View
                style={[
                  styles.profilePill,
                  {
                    backgroundColor: profileActive ? UI.successSoft : "#FEF2F2",
                  },
                ]}
              >
                <View
                  style={[
                    styles.profileDot,
                    { backgroundColor: profileActive ? UI.success : "#EF4444" },
                  ]}
                />
                <Text
                  style={[
                    styles.profilePillText,
                    { color: profileActive ? "#166534" : "#991B1B" },
                  ]}
                >
                  {profileActive ? "Profile active" : "Profile inactive"}
                </Text>
              </View>
            </View>

            {/* ── Credit card ── */}
            {loansData?.credit_limit != null && (
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

                <View style={styles.barWrap}>
                  <View
                    style={[styles.barFill, { width: `${availablePct}%` }]}
                  />
                </View>
                <View style={styles.barCaption}>
                  <Text style={styles.captionText}>
                    {Math.round(availablePct)}% of your limit is free
                  </Text>
                  <Text style={styles.captionText}>
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
                    <Text style={styles.creditStatLabel}>Available</Text>
                    <Text style={[styles.creditStatVal, { color: UI.success }]}>
                      {money(remaining)}
                    </Text>
                  </View>
                </View>
              </View>
            )}

            {/* ── Summary tiles ── */}
            <View style={styles.summaryRow}>
              <SummaryTile
                label="Total"
                value={summary.total}
                icon="layers-outline"
                color={COLORS.primary}
                bg={COLORS.primary + "14"}
              />
              <SummaryTile
                label="Active"
                value={summary.active}
                icon="flash-outline"
                color="#2563EB"
                bg="#E8F0FE"
              />
              <SummaryTile
                label="Paid"
                value={summary.paid}
                icon="shield-checkmark-outline"
                color="#7C3AED"
                bg="#F1EBFE"
              />
              <SummaryTile
                label="Pending"
                value={summary.pending}
                icon="time-outline"
                color={UI.warning}
                bg={UI.warningSoft}
              />
            </View>

            {/* ── Apply / cannot apply (rules come from API) ── */}
            {loansData?.can_apply_loan ? (
              <TouchableOpacity
                style={styles.applyBtn}
                activeOpacity={0.85}
                onPress={() =>
                  navigation.navigate("ApplyLoan", {
                    loanLimit: loansData?.loan_limit || {
                      credit_limit: loansData?.credit_limit,
                      remaining_limit: loansData?.remaining_limit,
                      active_loans_count: loansData?.active_loans_count,
                      active_loans_total_amount:
                        loansData?.active_loans_total_amount,
                      can_apply: loansData?.can_apply_loan,
                      block_reason: loansData?.loan_limit?.block_reason,
                    },
                  })
                }
              >
                <Ionicons
                  name="add-circle-outline"
                  size={20}
                  color={COLORS.white}
                />
                <Text style={styles.applyBtnText}>Apply for a new loan</Text>
                <Ionicons name="arrow-forward" size={18} color={COLORS.white} />
              </TouchableOpacity>
            ) : (
              <View style={styles.cannotApplyCard}>
                <View style={styles.cannotApplyIconBox}>
                  <Ionicons
                    name="information-circle"
                    size={22}
                    color={UI.warning}
                  />
                </View>
                <Text style={styles.cannotApplyText}>
                  {loansData?.loan_limit?.block_reason ||
                    loansData?.profile_message ||
                    (loansData?.remaining_limit <= 0
                      ? `You have reached your total credit limit of ${money(
                          loansData?.credit_limit,
                        )}. Repay active loans to restore your limit.`
                      : "You are not eligible to apply for a loan right now.")}
                </Text>
              </View>
            )}

            {/* ── Filters ── */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.filterScroll}
              contentContainerStyle={styles.filterContainer}
            >
              {FILTERS.map((filter) => {
                const isActive = activeFilter === filter;
                const count =
                  filter === "All"
                    ? allLoans.length
                    : allLoans.filter(
                        (l) => l.status?.toLowerCase() === filter.toLowerCase(),
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
                        isActive && styles.filterTabTextActive,
                      ]}
                    >
                      {filter}
                    </Text>
                    {count > 0 && (
                      <View
                        style={[
                          styles.filterBadge,
                          isActive && styles.filterBadgeActive,
                        ]}
                      >
                        <Text
                          style={[
                            styles.filterBadgeText,
                            isActive && styles.filterBadgeTextActive,
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

            {/* ── Loan list ── */}
            {loans.length === 0 ? (
              <EmptyState filter={activeFilter} />
            ) : (
              <View>
                {loans.map((loan) => (
                  <LoanCard
                    key={loan.id}
                    loan={loan}
                    onPress={() =>
                      navigation.navigate("LoanDetails", { loanId: loan.id })
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

const softShadow = {
  elevation: 3,
  shadowColor: "#0F172A",
  shadowOpacity: 0.06,
  shadowRadius: 12,
  shadowOffset: { width: 0, height: 4 },
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { flex: 1, paddingHorizontal: 20 },

  // Title
  titleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  pageTitle: { fontFamily: FONTS.bold, fontSize: 24, color: UI.text },
  pageSubtitle: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    color: UI.muted,
    lineHeight: 17,
    marginTop: 2,
    paddingRight: 8,
  },
  profilePill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
    marginTop: 4,
  },
  profileDot: { width: 7, height: 7, borderRadius: 4 },
  profilePillText: { fontFamily: FONTS.medium, fontSize: 11 },

  // Credit card
  creditCard: {
    backgroundColor: UI.surface,
    borderRadius: UI.radius,
    padding: 20,
    marginBottom: 16,
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
  barWrap: {
    height: 8,
    backgroundColor: UI.track,
    borderRadius: 4,
    overflow: "hidden",
  },
  barFill: { height: "100%", backgroundColor: UI.success, borderRadius: 4 },
  barCaption: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
    marginBottom: 18,
  },
  captionText: { fontFamily: FONTS.regular, fontSize: 11, color: UI.muted },
  creditStatsRow: {
    flexDirection: "row",
    alignItems: "stretch",
    backgroundColor: UI.soft,
    borderRadius: 14,
    paddingVertical: 14,
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

  // Summary tiles
  summaryRow: { flexDirection: "row", gap: 10, marginBottom: 16 },
  summaryTile: {
    flex: 1,
    backgroundColor: UI.surface,
    borderRadius: 16,
    paddingVertical: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: UI.border,
    ...softShadow,
  },
  summaryIcon: {
    width: 30,
    height: 30,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 6,
  },
  summaryValue: { fontFamily: FONTS.bold, fontSize: 17, color: UI.text },
  summaryLabel: {
    fontFamily: FONTS.regular,
    fontSize: 11,
    color: UI.muted,
    marginTop: 1,
  },

  // Apply
  applyBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: COLORS.primary,
    height: 54,
    borderRadius: 16,
    paddingHorizontal: 18,
    marginBottom: 20,
  },
  applyBtnText: {
    fontFamily: FONTS.semiBold,
    fontSize: 15,
    color: COLORS.white,
  },
  cannotApplyCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#FFFBEB",
    borderRadius: 16,
    padding: 14,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#FDE68A",
  },
  cannotApplyIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#FDE68A",
    justifyContent: "center",
    alignItems: "center",
  },
  cannotApplyText: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    color: "#92400E",
    flex: 1,
    lineHeight: 18,
  },

  // Filters
  filterScroll: { marginBottom: 14, marginHorizontal: -20 },
  filterContainer: { gap: 8, paddingHorizontal: 20, paddingVertical: 4 },
  filterTab: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    height: 38,
    borderRadius: 19,
    backgroundColor: UI.surface,
    borderWidth: 1,
    borderColor: UI.border,
    gap: 6,
  },
  filterTabActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  filterTabText: { fontFamily: FONTS.medium, fontSize: 13, color: UI.muted },
  filterTabTextActive: { color: COLORS.white },
  filterBadge: {
    backgroundColor: "#EEF2F5",
    borderRadius: 10,
    minWidth: 20,
    paddingHorizontal: 6,
    paddingVertical: 1,
    alignItems: "center",
  },
  filterBadgeActive: { backgroundColor: "rgba(255,255,255,0.25)" },
  filterBadgeText: { fontFamily: FONTS.bold, fontSize: 10, color: UI.muted },
  filterBadgeTextActive: { color: COLORS.white },

  // Loan card
  loanCard: {
    backgroundColor: UI.surface,
    borderRadius: UI.radius,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: UI.border,
    ...softShadow,
  },
  loanCardTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 14,
  },
  loanIconBox: {
    width: 46,
    height: 46,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  loanCardMain: { flex: 1 },
  loanAmount: {
    fontFamily: FONTS.bold,
    fontSize: 20,
    color: UI.text,
    marginBottom: 2,
  },
  loanPurpose: { fontFamily: FONTS.regular, fontSize: 12, color: UI.muted },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    gap: 5,
  },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusBadgeText: { fontFamily: FONTS.semiBold, fontSize: 11 },
  loanMetaBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: UI.soft,
    borderRadius: 12,
    paddingVertical: 10,
    paddingLeft: 4,
    paddingRight: 10,
  },
  loanMetaCol: { flex: 1, alignItems: "center", paddingHorizontal: 4 },
  loanMetaLabel: {
    fontFamily: FONTS.regular,
    fontSize: 10,
    color: UI.muted,
    marginBottom: 3,
  },
  loanMetaValue: { fontFamily: FONTS.semiBold, fontSize: 12, color: UI.text },
  loanMetaDivider: { width: 1, height: 24, backgroundColor: "#DDE3E9" },

  // Empty
  emptyState: { alignItems: "center", paddingVertical: 40 },
  emptyIconBox: {
    width: 76,
    height: 76,
    borderRadius: 24,
    backgroundColor: COLORS.primary + "14",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  emptyTitle: {
    fontFamily: FONTS.bold,
    fontSize: 16,
    color: UI.text,
    marginBottom: 6,
  },
  emptyText: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    color: UI.muted,
    textAlign: "center",
    lineHeight: 20,
    maxWidth: 240,
  },
});
