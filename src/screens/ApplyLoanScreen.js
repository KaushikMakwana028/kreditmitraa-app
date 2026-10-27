// screens/ApplyLoanScreen.jsx
import React, { useState, useRef, useEffect } from "react";
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
  KeyboardAvoidingView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Header from "../components/Header";
import { COLORS } from "../constants/colors";
import { FONTS } from "../constants/fonts";
import {
  applyLoan,
  calculateLoan,
  getLoanLimit,
} from "../services/api/loansService";
import { handleApiError } from "../services/utils/errorHandler";
import { useUser } from "../context/UserContext";

// ─── Design Tokens (shared with Dashboard / Loans) ────────────────────────────
const UI = {
  surface: "#FFFFFF",
  border: "#EAEFF3",
  inputBorder: "#DDE3E9",
  text: COLORS.black || "#1A1A2E",
  muted: "#6B7A89",
  success: "#16A34A",
  successSoft: "#E8F8EE",
  warning: "#D97706",
  warningSoft: "#FEF3C7",
  error: "#DC2626",
  errorSoft: "#FEF2F2",
  track: "#E8EDF2",
  soft: "#F6F8FA",
  radius: 20,
};
const PRIMARY = COLORS.primary || "#1A3C34";
const PRIMARY_SOFT = PRIMARY + "14";

const money = (v) => `₹${Number(v || 0).toLocaleString("en-IN")}`;

// ─── Presets ──────────────────────────────────────────────────────────────────
// Amount boundaries and loan schemes are validated by the API.
const TENURE_PRESETS = [
  { label: "15 days", value: 15 },
  { label: "30 days", value: 30 },
];

const PURPOSE_OPTIONS = [
  "Medical Emergency",
  "Education",
  "Business",
  "Home Renovation",
  "Travel",
  "Wedding",
  "Debt Consolidation",
  "Other",
];

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

function FieldError({ message }) {
  if (!message) return null;
  return (
    <View style={styles.errorRow}>
      <Ionicons name="alert-circle" size={13} color={UI.error} />
      <Text style={styles.errorText}>{message}</Text>
    </View>
  );
}

function SelectField({ label, value, options, onSelect, icon, error }) {
  const [modalVisible, setModalVisible] = useState(false);
  const displayValue =
    typeof options[0] === "object"
      ? options.find((o) => o.value === value)?.label
      : value;

  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TouchableOpacity
        style={[styles.selectInput, !!error && styles.inputError]}
        onPress={() => setModalVisible(true)}
        activeOpacity={0.7}
      >
        <Ionicons
          name={icon}
          size={18}
          color={displayValue ? PRIMARY : UI.muted}
          style={styles.fieldIcon}
        />
        <Text
          style={[styles.selectText, !displayValue && styles.selectPlaceholder]}
        >
          {displayValue || `Select ${label.toLowerCase()}`}
        </Text>
        <Ionicons name="chevron-down" size={18} color={UI.muted} />
      </TouchableOpacity>
      <FieldError message={error} />

      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setModalVisible(false)}
        >
          <TouchableOpacity activeOpacity={1} style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                Select {label.toLowerCase()}
              </Text>
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                style={styles.modalClose}
              >
                <Ionicons name="close" size={20} color={UI.text} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.optionsList} nestedScrollEnabled>
              {options.map((option) => {
                const optLabel =
                  typeof option === "object" ? option.label : option;
                const optValue =
                  typeof option === "object" ? option.value : option;
                const isSelected = value === optValue;
                return (
                  <TouchableOpacity
                    key={String(optValue)}
                    style={[
                      styles.optionItem,
                      isSelected && styles.optionItemSelected,
                    ]}
                    onPress={() => {
                      onSelect(optValue);
                      setModalVisible(false);
                    }}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.optionText,
                        isSelected && styles.optionTextSelected,
                      ]}
                    >
                      {optLabel}
                    </Text>
                    {isSelected && (
                      <Ionicons
                        name="checkmark-circle"
                        size={20}
                        color={PRIMARY}
                      />
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

function TenureSelector({ value, onSelect, error }) {
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.fieldLabel}>Loan tenure</Text>
      <View style={styles.tenureChipsRow}>
        {TENURE_PRESETS.map((preset) => {
          const isSelected = value === preset.value;
          return (
            <TouchableOpacity
              key={preset.value}
              style={[styles.tenureChip, isSelected && styles.tenureChipActive]}
              onPress={() => onSelect(preset.value)}
              activeOpacity={0.75}
            >
              <Ionicons
                name={isSelected ? "checkmark-circle" : "calendar-outline"}
                size={16}
                color={isSelected ? "#fff" : PRIMARY}
              />
              <Text
                style={[
                  styles.tenureChipText,
                  isSelected && styles.tenureChipTextActive,
                ]}
              >
                {preset.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
      <FieldError message={error} />
    </View>
  );
}

function AmountChips({ onSelect, remainingLimit, selected }) {
  const baseOptions = [5000, 10000, 25000, 50000];
  const limitNum = Number(remainingLimit) || 0;
  let chips = baseOptions;

  if (limitNum > 0) {
    chips = baseOptions.filter((amt) => amt <= limitNum);
    if (!chips.includes(limitNum) && limitNum <= 200000) {
      chips.push(limitNum);
      chips.sort((a, b) => a - b);
    }
  }
  if (chips.length === 0 && limitNum > 0) chips = [limitNum];

  const short = (amt) =>
    amt >= 100000
      ? `₹${amt / 100000}L`
      : amt >= 1000
        ? `₹${amt / 1000}K`
        : `₹${amt}`;

  return (
    <View style={styles.amountChipsRow}>
      {chips.map((amt) => {
        const isSel = String(amt) === String(selected);
        return (
          <TouchableOpacity
            key={amt}
            style={[styles.amountChip, isSel && styles.amountChipActive]}
            onPress={() => onSelect(String(amt))}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.amountChipText,
                isSel && styles.amountChipTextActive,
              ]}
            >
              {short(amt)}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

function SummaryRow({ label, value, valueColor }) {
  return (
    <View style={styles.summaryRow}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text
        style={[styles.summaryValue, valueColor ? { color: valueColor } : null]}
      >
        {value}
      </Text>
    </View>
  );
}

function SuccessModal({ visible, onDone }) {
  const scaleAnim = useRef(new Animated.Value(0.85)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          useNativeDriver: true,
          tension: 60,
          friction: 8,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      scaleAnim.setValue(0.85);
      opacityAnim.setValue(0);
    }
  }, [visible]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onDone}
    >
      <View style={styles.successOverlay}>
        <Animated.View
          style={[
            styles.successCard,
            { transform: [{ scale: scaleAnim }], opacity: opacityAnim },
          ]}
        >
          <View style={styles.successIconOuter}>
            <View style={styles.successIconInner}>
              <Ionicons name="checkmark" size={34} color="#fff" />
            </View>
          </View>
          <Text style={styles.successTitle}>Application submitted</Text>
          <Text style={styles.successSubtitle}>
            Your loan application has been submitted successfully. Our team will
            review it and get back to you shortly.
          </Text>
          <TouchableOpacity
            style={styles.successBtn}
            onPress={onDone}
            activeOpacity={0.85}
          >
            <Text style={styles.successBtnText}>View my loans</Text>
            <Ionicons name="arrow-forward" size={18} color="#fff" />
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// ── MAIN SCREEN ───────────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════

export default function ApplyLoanScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const routeLimit = route?.params?.loanLimit || null;

  const { user, loadUser } = useUser();

  const [submitting, setSubmitting] = useState(false);
  const [successModal, setSuccessModal] = useState(false);

  // Limit (fetched from API, view only)
  const [loanLimit, setLoanLimit] = useState(routeLimit);
  const [loadingLimit, setLoadingLimit] = useState(!routeLimit);

  // Form
  const [amount, setAmount] = useState("");
  const [tenure, setTenure] = useState(null);
  const [purpose, setPurpose] = useState("");
  const [customPurpose, setCustomPurpose] = useState("");

  // Calculation
  const [calculation, setCalculation] = useState(null);
  const [calculating, setCalculating] = useState(false);
  const [calcError, setCalcError] = useState(null);

  const [errors, setErrors] = useState({});
  const [amountFocused, setAmountFocused] = useState(false);

  const debouncedAmount = useDebounce(amount, 600);

  const fetchLimit = async () => {
    try {
      const res = await getLoanLimit();
      if (res.success && res.data) setLoanLimit(res.data);
    } catch (e) {
      // retain existing limit
    } finally {
      setLoadingLimit(false);
    }
  };

  useEffect(() => {
    loadUser();
    fetchLimit();
  }, []);

  // Calculation is evaluated by the backend
  useEffect(() => {
    const numAmt = Number(debouncedAmount);
    const hasAmount = debouncedAmount && !isNaN(numAmt) && numAmt > 0;
    if (hasAmount && tenure) {
      fetchCalculation(numAmt, tenure);
    } else {
      setCalculation(null);
      setCalcError(null);
    }
  }, [debouncedAmount, tenure]);

  const fetchCalculation = async (amt, tenureDays) => {
    setCalculating(true);
    setCalcError(null);
    try {
      const result = await calculateLoan({
        amount: amt,
        tenure_days: tenureDays,
      });
      if (result.success) {
        setCalculation(result.data);
        if (result.data?.loan_limit) {
          setLoanLimit((prev) => ({ ...prev, ...result.data.loan_limit }));
        }
      } else {
        setCalcError(result.message);
        setCalculation(null);
        if (result.data) setLoanLimit((prev) => ({ ...prev, ...result.data }));
      }
    } catch (err) {
      setCalcError(err?.message || "Unable to fetch calculation from API.");
      setCalculation(null);
    } finally {
      setCalculating(false);
    }
  };

  const validate = () => {
    const newErrors = {};
    const numAmt = Number(amount);
    if (!amount.trim()) newErrors.amount = "Loan amount is required.";
    else if (isNaN(numAmt) || numAmt <= 0)
      newErrors.amount = "Please enter a valid amount.";
    if (!tenure) newErrors.tenure = "Please select a loan tenure.";
    if (!purpose) newErrors.purpose = "Please select a loan purpose.";
    if (purpose === "Other" && !customPurpose.trim()) {
      newErrors.customPurpose = "Please specify your purpose.";
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
        purpose: purpose === "Other" ? customPurpose.trim() : purpose,
      };
      const result = await applyLoan(payload);
      if (result.success) {
        setSuccessModal(true);
      } else {
        handleApiError({ message: result.message });
        if (result.data) setLoanLimit((prev) => ({ ...prev, ...result.data }));
      }
    } catch (err) {
      handleApiError(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSuccessDone = () => {
    setSuccessModal(false);
    navigation.replace("MainTabs", { screen: "Loans" });
  };

  const getUserInitials = () => {
    if (!user?.name) return "U";
    const parts = user.name.trim().split(" ");
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return parts[0][0].toUpperCase();
  };

  const numAmount = Number(amount) || 0;
  const hasValidInputs = numAmount > 0 && tenure !== null;
  const blocked = !!loanLimit && loanLimit.can_apply === false;
  const limitActive =
    Number(loanLimit?.remaining_limit) > 0 && loanLimit?.can_apply !== false;

  const creditLimit = Number(loanLimit?.credit_limit || 0);
  const remaining = Number(loanLimit?.remaining_limit || 0);
  const availablePct = Math.min(
    100,
    Math.max(0, creditLimit > 0 ? (remaining / creditLimit) * 100 : 0),
  );

  const bottomPadding = insets.bottom + 32;

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <Header
        showLogo
        showProfile
        avatarText={getUserInitials()}
        profileImageUrl={user?.profile_image || null}
        onProfilePress={() => navigation.navigate("Profile")}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingBottom: bottomPadding,
          paddingHorizontal: 20,
          paddingTop: 8,
        }}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.pageTitle}>Apply for a loan</Text>
        <Text style={styles.pageSubtitle}>
          Choose an amount and tenure. You will see the full cost before you
          submit.
        </Text>

        {/* ── Credit limit ── */}
        {loanLimit ? (
          <View style={styles.limitCard}>
            <View style={styles.limitTop}>
              <View style={{ flex: 1 }}>
                <Text style={styles.limitLabel}>Available to borrow</Text>
                <Text style={styles.limitAmount}>{money(remaining)}</Text>
              </View>
              <View
                style={[
                  styles.limitBadge,
                  {
                    backgroundColor: limitActive
                      ? UI.successSoft
                      : UI.errorSoft,
                  },
                ]}
              >
                <View
                  style={[
                    styles.limitBadgeDot,
                    { backgroundColor: limitActive ? UI.success : UI.error },
                  ]}
                />
                <Text
                  style={[
                    styles.limitBadgeText,
                    { color: limitActive ? "#166534" : "#991B1B" },
                  ]}
                >
                  {limitActive ? "Limit active" : "Limit reached"}
                </Text>
              </View>
            </View>

            <View style={styles.barWrap}>
              <View style={[styles.barFill, { width: `${availablePct}%` }]} />
            </View>

            <View style={styles.limitStatsRow}>
              <View style={styles.limitStatCol}>
                <Text style={styles.limitStatLabel}>Credit limit</Text>
                <Text style={styles.limitStatValue}>{money(creditLimit)}</Text>
              </View>
              <View style={styles.limitStatDivider} />
              <View style={styles.limitStatCol}>
                <Text style={styles.limitStatLabel}>Borrowed</Text>
                <Text style={[styles.limitStatValue, { color: UI.warning }]}>
                  {money(loanLimit.active_loans_total_amount)}
                </Text>
              </View>
            </View>

            {blocked && loanLimit.block_reason ? (
              <View style={styles.limitAlertBox}>
                <Ionicons name="alert-circle" size={16} color={UI.error} />
                <Text style={styles.limitAlertText}>
                  {loanLimit.block_reason}
                </Text>
              </View>
            ) : null}
          </View>
        ) : loadingLimit ? (
          <View
            style={[
              styles.limitCard,
              { alignItems: "center", paddingVertical: 28 },
            ]}
          >
            <ActivityIndicator color={PRIMARY} />
          </View>
        ) : null}

        {/* ── Form ── */}
        <View style={styles.formCard}>
          {/* Amount */}
          <View style={styles.fieldWrap}>
            <Text style={styles.fieldLabel}>Loan amount</Text>
            <View
              style={[
                styles.amountInputWrapper,
                amountFocused && styles.inputFocused,
                !!errors.amount && styles.inputError,
              ]}
            >
              <Text style={styles.rupeeSymbol}>₹</Text>
              <TextInput
                style={styles.amountInput}
                placeholder="0"
                placeholderTextColor="#B6C0CA"
                keyboardType="numeric"
                value={amount}
                onFocus={() => setAmountFocused(true)}
                onBlur={() => setAmountFocused(false)}
                onChangeText={(text) => {
                  setAmount(text.replace(/[^0-9]/g, ""));
                  if (errors.amount) setErrors({ ...errors, amount: "" });
                }}
              />
              {amount.length > 0 && (
                <TouchableOpacity
                  onPress={() => {
                    setAmount("");
                    setCalculation(null);
                  }}
                  style={{ padding: 4 }}
                >
                  <Ionicons name="close-circle" size={20} color="#B6C0CA" />
                </TouchableOpacity>
              )}
            </View>
            {loanLimit?.remaining_limit != null && !errors.amount && (
              <Text style={styles.helperText}>
                You can borrow up to {money(loanLimit.remaining_limit)}
              </Text>
            )}
            <FieldError message={errors.amount} />
            <AmountChips
              remainingLimit={loanLimit?.remaining_limit}
              selected={amount}
              onSelect={(val) => {
                setAmount(val);
                if (errors.amount) setErrors({ ...errors, amount: "" });
              }}
            />
          </View>

          {/* Tenure */}
          <TenureSelector
            value={tenure}
            onSelect={(val) => {
              setTenure(val);
              if (errors.tenure) setErrors({ ...errors, tenure: "" });
            }}
            error={errors.tenure}
          />

          {/* Purpose */}
          <SelectField
            label="Loan purpose"
            value={purpose}
            options={PURPOSE_OPTIONS}
            onSelect={(val) => {
              setPurpose(val);
              if (errors.purpose) setErrors({ ...errors, purpose: "" });
            }}
            icon="bookmark-outline"
            error={errors.purpose}
          />

          {purpose === "Other" && (
            <View style={[styles.fieldWrap, { marginBottom: 0 }]}>
              <Text style={styles.fieldLabel}>Specify purpose</Text>
              <View
                style={[
                  styles.textAreaWrapper,
                  !!errors.customPurpose && styles.inputError,
                ]}
              >
                <TextInput
                  style={styles.textArea}
                  placeholder="Describe your loan purpose"
                  placeholderTextColor="#B6C0CA"
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                  value={customPurpose}
                  onChangeText={(text) => {
                    setCustomPurpose(text);
                    if (errors.customPurpose)
                      setErrors({ ...errors, customPurpose: "" });
                  }}
                />
              </View>
              <FieldError message={errors.customPurpose} />
            </View>
          )}
        </View>

        {/* ── Breakdown ── */}
        {hasValidInputs && (
          <View style={styles.previewCard}>
            <View style={styles.previewHeader}>
              <View style={styles.previewHeaderLeft}>
                <View style={styles.previewHeaderIcon}>
                  <Ionicons
                    name="calculator-outline"
                    size={18}
                    color={PRIMARY}
                  />
                </View>
                <Text style={styles.previewTitle}>Loan breakdown</Text>
              </View>
              {calculating && (
                <View style={styles.calcLoadingRow}>
                  <ActivityIndicator size="small" color={PRIMARY} />
                  <Text style={styles.calcLoadingText}>Calculating</Text>
                </View>
              )}
            </View>

            {calcError ? (
              <View style={styles.calcErrorBox}>
                <Ionicons name="alert-circle" size={16} color={UI.error} />
                <Text style={styles.calcErrorText}>{calcError}</Text>
              </View>
            ) : null}

            {calculating && (
              <View style={styles.calcSkeletonWrap}>
                {[1, 2, 3, 4].map((i) => (
                  <View key={i} style={styles.calcSkeletonRow}>
                    <View style={[styles.calcSkeletonBox, { width: "40%" }]} />
                    <View style={[styles.calcSkeletonBox, { width: "22%" }]} />
                  </View>
                ))}
              </View>
            )}

            {calculation && !calculating && (
              <>
                <SummaryRow
                  label="Loan amount"
                  value={money(calculation.amount)}
                />
                <SummaryRow
                  label="Tenure"
                  value={`${calculation.tenure_days} days`}
                />
                <SummaryRow
                  label="Purpose"
                  value={
                    purpose === "Other" ? customPurpose || "Other" : purpose
                  }
                />
                <SummaryRow
                  label={`Interest (${calculation.interest_rate}%)`}
                  value={money(calculation.interest_amount)}
                  valueColor={UI.warning}
                />
                {Number(calculation.processing_fee) > 0 && (
                  <SummaryRow
                    label="Processing fee"
                    value={money(calculation.processing_fee)}
                  />
                )}
                {Number(calculation.platform_charge) > 0 && (
                  <SummaryRow
                    label="Platform charge"
                    value={money(calculation.platform_charge)}
                  />
                )}
                {Number(calculation.gst_amount) > 0 && (
                  <SummaryRow
                    label="GST"
                    value={money(calculation.gst_amount)}
                  />
                )}
                {Number(calculation.due_charges) > 0 && (
                  <SummaryRow
                    label="Due charges"
                    value={money(calculation.due_charges)}
                    valueColor={UI.error}
                  />
                )}

                <View style={styles.totalBox}>
                  <Text style={styles.totalLabel}>Total payable</Text>
                  <Text style={styles.totalValue}>
                    {money(calculation.total_payable)}
                  </Text>
                </View>
                <Text style={styles.previewDisclaimer}>
                  Actual charges may vary based on admin approval.
                </Text>
              </>
            )}
          </View>
        )}

        {/* ── Terms ── */}
        <View style={styles.termsNotice}>
          <Ionicons
            name="shield-checkmark-outline"
            size={16}
            color={UI.muted}
          />
          <Text style={styles.termsNoticeText}>
            {"By submitting, you agree to our "}
            <Text style={styles.termsLink}>Terms & Conditions</Text>
            {" and "}
            <Text style={styles.termsLink}>Privacy Policy</Text>
            {"."}
          </Text>
        </View>

        {/* ── Submit ── */}
        <TouchableOpacity
          style={[
            styles.submitBtn,
            (submitting || blocked) && styles.submitBtnDisabled,
          ]}
          onPress={handleSubmit}
          activeOpacity={0.85}
          disabled={submitting || blocked}
        >
          {submitting ? (
            <>
              <ActivityIndicator size="small" color="#fff" />
              <Text style={styles.submitBtnText}>Submitting...</Text>
            </>
          ) : blocked ? (
            <>
              <Ionicons name="lock-closed-outline" size={18} color="#fff" />
              <Text style={styles.submitBtnText}>Credit limit reached</Text>
            </>
          ) : (
            <>
              <Text style={styles.submitBtnText}>Submit application</Text>
              <Ionicons name="arrow-forward" size={18} color="#fff" />
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.cancelBtn}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Text style={styles.cancelBtnText}>Cancel</Text>
        </TouchableOpacity>
      </ScrollView>

      <SuccessModal visible={successModal} onDone={handleSuccessDone} />
    </KeyboardAvoidingView>
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

  // Limit card
  limitCard: {
    backgroundColor: UI.surface,
    borderRadius: UI.radius,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: UI.border,
    ...softShadow,
  },
  limitTop: { flexDirection: "row", alignItems: "center", marginBottom: 14 },
  limitLabel: {
    fontFamily: FONTS.medium,
    fontSize: 13,
    color: UI.muted,
    marginBottom: 2,
  },
  limitAmount: { fontFamily: FONTS.bold, fontSize: 28, color: PRIMARY },
  limitBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
  },
  limitBadgeDot: { width: 6, height: 6, borderRadius: 3 },
  limitBadgeText: { fontFamily: FONTS.semiBold, fontSize: 11 },
  barWrap: {
    height: 8,
    backgroundColor: UI.track,
    borderRadius: 4,
    overflow: "hidden",
    marginBottom: 14,
  },
  barFill: { height: "100%", backgroundColor: UI.success, borderRadius: 4 },
  limitStatsRow: {
    flexDirection: "row",
    alignItems: "stretch",
    backgroundColor: UI.soft,
    borderRadius: 14,
    paddingVertical: 12,
  },
  limitStatCol: { flex: 1, alignItems: "center" },
  limitStatLabel: {
    fontFamily: FONTS.regular,
    fontSize: 11,
    color: UI.muted,
    marginBottom: 3,
  },
  limitStatValue: { fontFamily: FONTS.bold, fontSize: 14, color: UI.text },
  limitStatDivider: { width: 1, backgroundColor: "#DDE3E9", marginVertical: 2 },
  limitAlertBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: UI.errorSoft,
    borderRadius: 12,
    padding: 12,
    marginTop: 12,
    borderWidth: 1,
    borderColor: "#FECACA",
  },
  limitAlertText: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    color: "#991B1B",
    flex: 1,
    lineHeight: 17,
  },

  // Form
  formCard: {
    backgroundColor: UI.surface,
    borderRadius: UI.radius,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: UI.border,
    ...softShadow,
  },
  fieldWrap: { marginBottom: 20 },
  fieldLabel: {
    fontFamily: FONTS.semiBold,
    fontSize: 13,
    color: UI.text,
    marginBottom: 8,
  },
  fieldIcon: { marginRight: 10 },
  helperText: {
    fontFamily: FONTS.regular,
    fontSize: 11,
    color: UI.muted,
    marginTop: 6,
  },

  amountInputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: UI.inputBorder,
    borderRadius: 14,
    paddingHorizontal: 16,
    backgroundColor: UI.soft,
    height: 62,
  },
  rupeeSymbol: {
    fontFamily: FONTS.bold,
    fontSize: 24,
    color: PRIMARY,
    marginRight: 8,
  },
  amountInput: {
    flex: 1,
    fontFamily: FONTS.bold,
    fontSize: 24,
    color: UI.text,
    paddingVertical: 0,
  },
  inputFocused: { borderColor: PRIMARY, backgroundColor: "#fff" },
  inputError: { borderColor: UI.error, backgroundColor: UI.errorSoft },

  amountChipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 12,
  },
  amountChip: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: PRIMARY_SOFT,
    borderWidth: 1.5,
    borderColor: "transparent",
  },
  amountChipActive: { backgroundColor: PRIMARY, borderColor: PRIMARY },
  amountChipText: { fontFamily: FONTS.semiBold, fontSize: 13, color: PRIMARY },
  amountChipTextActive: { color: "#fff" },

  tenureChipsRow: { flexDirection: "row", gap: 12 },
  tenureChip: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 50,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: UI.inputBorder,
    backgroundColor: UI.surface,
  },
  tenureChipActive: { backgroundColor: PRIMARY, borderColor: PRIMARY },
  tenureChipText: { fontFamily: FONTS.semiBold, fontSize: 14, color: PRIMARY },
  tenureChipTextActive: { color: "#fff" },

  selectInput: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: UI.inputBorder,
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 52,
    backgroundColor: UI.soft,
  },
  selectText: {
    flex: 1,
    fontFamily: FONTS.medium,
    fontSize: 14,
    color: UI.text,
  },
  selectPlaceholder: { color: UI.muted, fontFamily: FONTS.regular },
  textAreaWrapper: {
    borderWidth: 1.5,
    borderColor: UI.inputBorder,
    borderRadius: 14,
    backgroundColor: UI.soft,
    padding: 14,
  },
  textArea: {
    fontFamily: FONTS.regular,
    fontSize: 14,
    color: UI.text,
    minHeight: 80,
  },

  errorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 6,
  },
  errorText: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    color: UI.error,
    flex: 1,
  },

  // Select sheet
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15,23,42,0.5)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    backgroundColor: UI.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 24,
    maxHeight: "75%",
  },
  modalHandle: {
    alignSelf: "center",
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#D5DCE3",
    marginTop: 10,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  modalTitle: { fontFamily: FONTS.bold, fontSize: 17, color: UI.text },
  modalClose: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: UI.soft,
    justifyContent: "center",
    alignItems: "center",
  },
  optionsList: { paddingHorizontal: 12 },
  optionItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 2,
  },
  optionItemSelected: { backgroundColor: PRIMARY_SOFT },
  optionText: { fontFamily: FONTS.regular, fontSize: 15, color: UI.text },
  optionTextSelected: { fontFamily: FONTS.semiBold, color: PRIMARY },

  // Breakdown
  previewCard: {
    backgroundColor: UI.surface,
    borderRadius: UI.radius,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: UI.border,
    ...softShadow,
  },
  previewHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  previewHeaderLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  previewHeaderIcon: {
    width: 36,
    height: 36,
    borderRadius: 11,
    backgroundColor: PRIMARY_SOFT,
    justifyContent: "center",
    alignItems: "center",
  },
  previewTitle: { fontFamily: FONTS.bold, fontSize: 15, color: UI.text },
  calcLoadingRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  calcLoadingText: { fontFamily: FONTS.regular, fontSize: 12, color: PRIMARY },
  calcErrorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: UI.errorSoft,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "#FECACA",
  },
  calcErrorText: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    color: "#991B1B",
    flex: 1,
  },
  calcSkeletonWrap: { gap: 6 },
  calcSkeletonRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
  },
  calcSkeletonBox: { height: 12, backgroundColor: "#E2E8F0", borderRadius: 6 },

  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: UI.border,
  },
  summaryLabel: { fontFamily: FONTS.regular, fontSize: 13, color: UI.muted },
  summaryValue: {
    fontFamily: FONTS.semiBold,
    fontSize: 13,
    color: UI.text,
    maxWidth: "60%",
    textAlign: "right",
  },
  totalBox: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: PRIMARY_SOFT,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginTop: 14,
  },
  totalLabel: { fontFamily: FONTS.semiBold, fontSize: 14, color: PRIMARY },
  totalValue: { fontFamily: FONTS.bold, fontSize: 20, color: PRIMARY },
  previewDisclaimer: {
    fontFamily: FONTS.regular,
    fontSize: 11,
    color: UI.muted,
    marginTop: 10,
  },

  // Terms & actions
  termsNotice: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  termsNoticeText: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    color: UI.muted,
    flex: 1,
    lineHeight: 18,
  },
  termsLink: { fontFamily: FONTS.semiBold, color: PRIMARY },
  submitBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    height: 54,
    borderRadius: 16,
    backgroundColor: PRIMARY,
  },
  submitBtnDisabled: { backgroundColor: "#9AA6B2" },
  submitBtnText: { fontFamily: FONTS.bold, fontSize: 15, color: "#fff" },
  cancelBtn: { alignItems: "center", paddingVertical: 14 },
  cancelBtnText: { fontFamily: FONTS.medium, fontSize: 14, color: UI.muted },

  // Success modal
  successOverlay: {
    flex: 1,
    backgroundColor: "rgba(15,23,42,0.55)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  successCard: {
    backgroundColor: UI.surface,
    borderRadius: 28,
    padding: 28,
    alignItems: "center",
    width: "100%",
    elevation: 10,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
  },
  successIconOuter: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: UI.successSoft,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  successIconInner: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: UI.success,
    justifyContent: "center",
    alignItems: "center",
  },
  successTitle: {
    fontFamily: FONTS.bold,
    fontSize: 21,
    color: UI.text,
    marginBottom: 8,
    textAlign: "center",
  },
  successSubtitle: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    color: UI.muted,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 24,
  },
  successBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    width: "100%",
    height: 52,
    borderRadius: 16,
    backgroundColor: PRIMARY,
  },
  successBtnText: { fontFamily: FONTS.bold, fontSize: 15, color: "#fff" },
});
