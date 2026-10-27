// screens/ReferScreen.jsx
import React, { useState, useEffect, useRef, useCallback } from "react";
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
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import Header from "../components/Header";
import { COLORS } from "../constants/colors";
import { FONTS } from "../constants/fonts";
import {
  getReferralData,
  getWalletTransactions,
} from "../services/api/referralService";
import { handleApiError } from "../services/utils/errorHandler";
import { getUserData } from "../services/utils/storage";

// ─── Design Tokens (shared with other screens) ────────────────────────────────
const UI = {
  surface: "#FFFFFF",
  border: "#EAEFF3",
  text: COLORS.black || "#1A1A2E",
  muted: "#6B7A89",
  success: "#16A34A",
  successSoft: "#E8F8EE",
  warning: "#D97706",
  warningSoft: "#FEF3C7",
  soft: "#F6F8FA",
  radius: 20,
};
const PRIMARY = COLORS.primary || "#1A3C34";
const PRIMARY_SOFT = PRIMARY + "14";

const money = (v) => `₹${Number(v || 0).toLocaleString("en-IN")}`;

// ─── Referral Status Config ───────────────────────────────────────────────────
const REFERRAL_STATUS = {
  reward_credited: {
    bg: UI.successSoft,
    text: "#166534",
    label: "Reward credited",
  },
  pending: { bg: UI.warningSoft, text: "#92400E", label: "Pending" },
  registered: { bg: "#E8F0FE", text: "#1D4ED8", label: "Registered" },
  rejected: { bg: "#FEECEC", text: "#991B1B", label: "Rejected" },
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
      <SkeletonBox
        width="100%"
        height={150}
        borderRadius={UI.radius}
        style={{ marginBottom: 16 }}
      />
      <SkeletonBox
        width="100%"
        height={250}
        borderRadius={UI.radius}
        style={{ marginBottom: 20 }}
      />
      <SkeletonBox
        width={160}
        height={18}
        borderRadius={6}
        style={{ marginBottom: 12 }}
      />
      {[1, 2].map((i) => (
        <SkeletonBox
          key={i}
          width="100%"
          height={110}
          borderRadius={UI.radius}
          style={{ marginBottom: 12 }}
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

  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [user, setUser] = useState(null);

  const initialLoadDone = useRef(false);

  // Referral state
  const [referralCode, setReferralCode] = useState("");
  const [referralLink, setReferralLink] = useState("");
  const [referrals, setReferrals] = useState([]);

  // Wallet state
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
        setReferralCode(d.referral_code || "");
        setReferralLink(d.referral_link || "");
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

  useEffect(() => {
    if (!initialLoadDone.current) fetchData();
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (initialLoadDone.current) fetchData(true);
    }, []),
  );

  // ── Helpers ────────────────────────────────────────────────────────────────
  const getUserInitials = () => {
    if (!user?.name) return "U";
    const parts = user.name.trim().split(" ");
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return parts[0][0].toUpperCase();
  };

  const copyToClipboard = (text, what = "Text") => {
    Clipboard.setString(text);
    Alert.alert("Copied!", `${what} copied to clipboard.`);
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Join Kreditmitraa using my referral code: ${referralCode}\n${referralLink}`,
        url: referralLink,
        title: "Join Kreditmitraa",
      });
    } catch (e) {
      console.log(e);
    }
  };

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
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingBottom: bottomPadding,
          paddingHorizontal: 20,
          paddingTop: 8,
        }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => fetchData(true)}
            colors={[PRIMARY]}
            tintColor={PRIMARY}
          />
        }
      >
        <Text style={styles.pageTitle}>Refer & earn</Text>
        <Text style={styles.pageSubtitle}>
          Invite friends with your code and earn a reward when they join.
        </Text>

        {loading && !initialLoadDone.current ? (
          <LoadingSkeleton />
        ) : (
          <>
            {/* ── Wallet card ── */}
            <View style={styles.walletCard}>
              <View style={styles.walletBubble} />
              <View style={styles.walletTop}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.walletLabel}>Available balance</Text>
                  <Text style={styles.walletAmount}>
                    {money(walletBalance)}
                  </Text>
                </View>
                <View style={styles.walletIcon}>
                  <Ionicons name="wallet" size={22} color="#fff" />
                </View>
              </View>

              <View style={styles.walletBottom}>
                <View style={styles.earnedPill}>
                  <Ionicons name="trending-up" size={14} color="#fff" />
                  <Text style={styles.earnedText}>
                    Total earned {money(totalEarned)}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.withdrawBtn}
                  onPress={() => navigation.navigate("Withdrawal")}
                  activeOpacity={0.85}
                >
                  <Text style={styles.withdrawBtnText}>Withdraw</Text>
                  <Ionicons name="arrow-forward" size={14} color={PRIMARY} />
                </TouchableOpacity>
              </View>
            </View>

            {/* ── Referral code card ── */}
            <View style={styles.card}>
              <Text style={styles.cardLabel}>Your referral code</Text>
              <View style={styles.codeBox}>
                <Text style={styles.codeText} numberOfLines={1}>
                  {referralCode || "—"}
                </Text>
                <TouchableOpacity
                  style={styles.codeCopyBtn}
                  onPress={() =>
                    referralCode &&
                    copyToClipboard(referralCode, "Referral code")
                  }
                  activeOpacity={0.7}
                >
                  <Ionicons name="copy-outline" size={16} color={PRIMARY} />
                  <Text style={styles.codeCopyText}>Copy</Text>
                </TouchableOpacity>
              </View>

              <Text style={[styles.cardLabel, { marginTop: 16 }]}>
                Your referral link
              </Text>
              <View style={styles.linkRow}>
                <Ionicons name="link-outline" size={16} color={UI.muted} />
                <Text style={styles.linkText} numberOfLines={1}>
                  {referralLink || "—"}
                </Text>
                <TouchableOpacity
                  style={styles.linkCopyBtn}
                  onPress={() =>
                    referralLink &&
                    copyToClipboard(referralLink, "Referral link")
                  }
                  activeOpacity={0.7}
                >
                  <Text style={styles.linkCopyText}>Copy</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={styles.shareBtn}
                onPress={handleShare}
                activeOpacity={0.85}
              >
                <Ionicons name="share-social-outline" size={18} color="#fff" />
                <Text style={styles.shareBtnText}>Share with friends</Text>
              </TouchableOpacity>
            </View>

            {/* ── Referral history ── */}
            <View style={styles.sectionRow}>
              <Text style={styles.sectionTitle}>Referral history</Text>
              {referrals.length > 0 && (
                <View style={styles.countPill}>
                  <Text style={styles.countPillText}>{referrals.length}</Text>
                </View>
              )}
            </View>

            {referrals.length === 0 ? (
              <View style={styles.emptyCard}>
                <View style={styles.emptyIconBox}>
                  <Ionicons name="people-outline" size={32} color={PRIMARY} />
                </View>
                <Text style={styles.emptyTitle}>No referrals yet</Text>
                <Text style={styles.emptySub}>
                  Share your code with friends and your rewards will show up
                  here.
                </Text>
              </View>
            ) : (
              referrals.map((item) => {
                const badge =
                  REFERRAL_STATUS[item.status] || REFERRAL_STATUS.pending;
                const reward = Number(item.reward_earned || 0);
                return (
                  <View key={item.id} style={styles.historyCard}>
                    <View style={styles.historyHeader}>
                      <View style={styles.avatarCircle}>
                        <Text style={styles.avatarText}>
                          {item.referred_name?.charAt(0)?.toUpperCase() || "?"}
                        </Text>
                      </View>
                      <View style={styles.historyNameBlock}>
                        <Text style={styles.historyName} numberOfLines={1}>
                          {item.referred_name}
                        </Text>
                        <Text style={styles.historyPhone}>
                          {item.referred_mobile}
                        </Text>
                      </View>
                      <View
                        style={[
                          styles.statusBadge,
                          { backgroundColor: badge.bg },
                        ]}
                      >
                        <Text
                          style={[styles.statusText, { color: badge.text }]}
                        >
                          {item.status_label || badge.label}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.detailsGrid}>
                      <View style={styles.detailCell}>
                        <Text style={styles.detailLabel}>Registered</Text>
                        <Text style={styles.detailValue}>
                          {item.formatted_registration_date || "-"}
                        </Text>
                      </View>
                      <View style={styles.detailDivider} />
                      <View style={styles.detailCell}>
                        <Text style={styles.detailLabel}>Reward</Text>
                        <Text
                          style={[
                            styles.detailValue,
                            reward > 0 && { color: UI.success },
                          ]}
                        >
                          {reward > 0 ? `+${money(reward)}` : "—"}
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

const softShadow = {
  elevation: 3,
  shadowColor: "#0F172A",
  shadowOpacity: 0.06,
  shadowRadius: 12,
  shadowOffset: { width: 0, height: 4 },
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background || "#F5F7FA" },
  scroll: { flex: 1 },

  pageTitle: {
    fontFamily: FONTS.bold,
    fontSize: 24,
    color: UI.text,
    marginTop: 6,
  },
  pageSubtitle: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    color: UI.muted,
    lineHeight: 18,
    marginTop: 2,
    marginBottom: 16,
  },

  // Wallet
  walletCard: {
    backgroundColor: PRIMARY,
    borderRadius: 24,
    padding: 20,
    marginBottom: 16,
    overflow: "hidden",
    elevation: 6,
    shadowColor: PRIMARY,
    shadowOpacity: 0.3,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
  },
  walletBubble: {
    position: "absolute",
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: "rgba(255,255,255,0.07)",
    top: -50,
    right: -40,
  },
  walletTop: { flexDirection: "row", alignItems: "center", marginBottom: 18 },
  walletLabel: {
    fontFamily: FONTS.medium,
    fontSize: 13,
    color: "rgba(255,255,255,0.75)",
    marginBottom: 4,
  },
  walletAmount: { fontFamily: FONTS.bold, fontSize: 36, color: "#fff" },
  walletIcon: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.16)",
    justifyContent: "center",
    alignItems: "center",
  },
  walletBottom: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  earnedPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255,255,255,0.14)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  earnedText: { fontFamily: FONTS.medium, fontSize: 12, color: "#fff" },
  withdrawBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#fff",
    paddingHorizontal: 16,
    height: 38,
    borderRadius: 19,
  },
  withdrawBtnText: { fontFamily: FONTS.semiBold, fontSize: 13, color: PRIMARY },

  // Code card
  card: {
    backgroundColor: UI.surface,
    borderRadius: UI.radius,
    padding: 18,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: UI.border,
    ...softShadow,
  },
  cardLabel: {
    fontFamily: FONTS.medium,
    fontSize: 13,
    color: UI.muted,
    marginBottom: 8,
  },
  codeBox: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: PRIMARY + "55",
    borderStyle: "dashed",
    backgroundColor: PRIMARY_SOFT,
    borderRadius: 14,
    paddingVertical: 10,
    paddingLeft: 16,
    paddingRight: 10,
  },
  codeText: {
    flex: 1,
    fontFamily: FONTS.bold,
    fontSize: 22,
    color: PRIMARY,
    letterSpacing: 3,
  },
  codeCopyBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#fff",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  codeCopyText: { fontFamily: FONTS.semiBold, fontSize: 12, color: PRIMARY },

  linkRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: UI.soft,
    borderRadius: 14,
    paddingLeft: 12,
    paddingRight: 6,
    height: 52,
    marginBottom: 16,
  },
  linkText: {
    flex: 1,
    fontFamily: FONTS.regular,
    fontSize: 12,
    color: UI.muted,
  },
  linkCopyBtn: {
    backgroundColor: PRIMARY,
    borderRadius: 10,
    paddingHorizontal: 16,
    height: 38,
    justifyContent: "center",
  },
  linkCopyText: { fontFamily: FONTS.semiBold, fontSize: 13, color: "#fff" },

  shareBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: PRIMARY,
    height: 52,
    borderRadius: 16,
  },
  shareBtnText: { fontFamily: FONTS.bold, fontSize: 15, color: "#fff" },

  // Section
  sectionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: { fontFamily: FONTS.semiBold, fontSize: 17, color: UI.text },
  countPill: {
    backgroundColor: PRIMARY_SOFT,
    borderRadius: 10,
    minWidth: 22,
    paddingHorizontal: 7,
    paddingVertical: 2,
    alignItems: "center",
  },
  countPillText: { fontFamily: FONTS.bold, fontSize: 11, color: PRIMARY },

  // History
  historyCard: {
    backgroundColor: UI.surface,
    borderRadius: UI.radius,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: UI.border,
    ...softShadow,
  },
  historyHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    gap: 12,
  },
  avatarCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: PRIMARY_SOFT,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: { fontFamily: FONTS.bold, fontSize: 16, color: PRIMARY },
  historyNameBlock: { flex: 1 },
  historyName: {
    fontFamily: FONTS.semiBold,
    fontSize: 14,
    color: UI.text,
    marginBottom: 2,
  },
  historyPhone: { fontFamily: FONTS.regular, fontSize: 12, color: UI.muted },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  statusText: { fontFamily: FONTS.semiBold, fontSize: 11 },

  detailsGrid: {
    flexDirection: "row",
    alignItems: "stretch",
    backgroundColor: UI.soft,
    borderRadius: 12,
    paddingVertical: 10,
  },
  detailCell: { flex: 1, alignItems: "center", paddingHorizontal: 8 },
  detailDivider: { width: 1, backgroundColor: "#DDE3E9", marginVertical: 2 },
  detailLabel: {
    fontFamily: FONTS.regular,
    fontSize: 11,
    color: UI.muted,
    marginBottom: 3,
  },
  detailValue: { fontFamily: FONTS.semiBold, fontSize: 13, color: UI.text },

  // Empty
  emptyCard: {
    backgroundColor: UI.surface,
    borderRadius: UI.radius,
    paddingVertical: 32,
    paddingHorizontal: 24,
    alignItems: "center",
    borderWidth: 1,
    borderColor: UI.border,
    ...softShadow,
  },
  emptyIconBox: {
    width: 68,
    height: 68,
    borderRadius: 22,
    backgroundColor: PRIMARY_SOFT,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 14,
  },
  emptyTitle: {
    fontFamily: FONTS.bold,
    fontSize: 16,
    color: UI.text,
    marginBottom: 6,
  },
  emptySub: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    color: UI.muted,
    textAlign: "center",
    lineHeight: 19,
    maxWidth: 240,
  },
});
