// screens/ProfileScreen.jsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
    TextInput,
    Platform,
    Alert,
    Image,
    Animated,
    Modal,
    ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import * as Contacts from 'expo-contacts';
import DateTimePicker from '@react-native-community/datetimepicker';
import ImageView from 'react-native-image-viewing';
import Header from '../components/Header';
import { COLORS } from '../constants/colors';
import { FONTS } from '../constants/fonts';
import {
    getUserProfile,
    updateUserProfile,
    uploadProfileImages,
} from '../services/api/dashboardService';
import { handleApiError, showSuccess } from '../services/utils/errorHandler';
import { clearAllData } from '../services/utils/storage';
import { useUser } from '../context/UserContext'; // ← ADD
import { CommonActions } from '@react-navigation/native';

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
const BASE_URL = 'https://moneymitraa.com/';

// ─── Options ──────────────────────────────────────────────────────────────────
const MARITAL_STATUS_OPTIONS = ['Single', 'Married', 'Divorced', 'Widowed'];
const EMPLOYMENT_OPTIONS = ['Salaried', 'Self Employed', 'Professional'];
const ACCOUNT_TYPE_OPTIONS = ['Savings', 'Current', 'Salary', 'Other'];

// ══════════════════════════════════════════════════════════════════════════════
// ── SKELETON LOADERS ──────────────────────────────────────────────────────────
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

    const opacity = shimmer.interpolate({
        inputRange: [0, 1],
        outputRange: [0.3, 0.8],
    });

    return (
        <Animated.View
            style={[{ width: w, height: h, borderRadius, backgroundColor: '#CBD5E1', opacity }, style]}
        />
    );
}

function ProgressCardSkeleton() {
    return (
        <View style={styles.progressCard}>
            <View style={styles.progressHeader}>
                <SkeletonBox width={90} height={90} borderRadius={45} />
                <View style={{ flex: 1, marginLeft: 16 }}>
                    <SkeletonBox width={140} height={16} borderRadius={4} style={{ marginBottom: 8 }} />
                    <SkeletonBox width={100} height={12} borderRadius={4} style={{ marginBottom: 8 }} />
                    <SkeletonBox width={80} height={12} borderRadius={4} />
                </View>
            </View>
            <View style={styles.progressDivider} />
            <View style={styles.progressTabs}>
                {[1, 2, 3, 4].map((i) => (
                    <SkeletonBox key={i} width="48%" height={100} borderRadius={12} />
                ))}
            </View>
        </View>
    );
}

function IdentityCardSkeleton() {
    return (
        <View style={styles.identityCard}>
            <SkeletonBox width={64} height={64} borderRadius={32} />
            <View style={{ flex: 1, marginLeft: 12 }}>
                <SkeletonBox width={120} height={16} borderRadius={4} style={{ marginBottom: 6 }} />
                <SkeletonBox width={160} height={12} borderRadius={4} style={{ marginBottom: 4 }} />
                <SkeletonBox width={100} height={12} borderRadius={4} />
            </View>
            <SkeletonBox width={36} height={36} borderRadius={18} />
        </View>
    );
}

function SectionSkeleton() {
    return (
        <View style={styles.section}>
            <View style={styles.sectionHeader}>
                <View style={styles.sectionLeft}>
                    <SkeletonBox width={40} height={40} borderRadius={10} />
                    <SkeletonBox width={120} height={14} borderRadius={4} />
                </View>
                <View style={styles.sectionRight}>
                    <SkeletonBox width={40} height={24} borderRadius={12} />
                    <SkeletonBox width={18} height={18} borderRadius={4} />
                </View>
            </View>
        </View>
    );
}

function LoadingSkeleton() {
    return (
        <>
            <SkeletonBox width={180} height={22} borderRadius={6} style={{ marginTop: 14, marginBottom: 4 }} />
            <SkeletonBox width="90%" height={12} borderRadius={4} style={{ marginBottom: 16 }} />
            <ProgressCardSkeleton />
            <IdentityCardSkeleton />
            {[1, 2, 3, 4].map((i) => (
                <SectionSkeleton key={i} />
            ))}
        </>
    );
}

// ══════════════════════════════════════════════════════════════════════════════
// ── SUB COMPONENTS ────────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════

function CircularProgress({ percentage, size = 80 }) {
    return (
        <View style={[styles.progressCircle, { width: size, height: size }]}>
            <View style={styles.progressInner}>
                <Text style={styles.progressPct}>{percentage}%</Text>
                <Text style={styles.progressLabel}>Complete</Text>
            </View>
            <View
                style={[
                    styles.progressRing,
                    {
                        width: size,
                        height: size,
                        borderRadius: size / 2,
                        borderColor: percentage === 100 ? SUCCESS : GREEN_DARK,
                    },
                ]}
            />
        </View>
    );
}

function ProgressTab({ icon, label, filled, total, index }) {
    const isComplete = filled === total;
    const colors = [COLORS.primary, COLORS.accent, '#8B5CF6', '#F59E0B'];
    const bgColor = colors[index % 4] + '15';
    const iconColor = colors[index % 4];

    return (
        <View style={[styles.progressTab, { backgroundColor: bgColor }]}>
            <View style={styles.progressTabHeader}>
                <View style={[styles.progressTabIcon, { backgroundColor: WHITE }]}>
                    <Ionicons name={icon} size={18} color={iconColor} />
                </View>
                {isComplete && <Ionicons name="checkmark-circle" size={18} color={SUCCESS} />}
            </View>
            <Text style={styles.progressTabLabel}>{label}</Text>
            <View style={styles.progressTabFooter}>
                <Text style={styles.progressTabCount}>{filled}/{total}</Text>
                {!isComplete && (
                    <View style={styles.progressTabBar}>
                        <View
                            style={[
                                styles.progressTabBarFill,
                                { width: `${(filled / total) * 100}%`, backgroundColor: iconColor },
                            ]}
                        />
                    </View>
                )}
            </View>
        </View>
    );
}

function Field({ label, value, onChangeText, keyboardType = 'default', editable = true, multiline = false }) {
    return (
        <View style={styles.field}>
            <Text style={styles.fieldLabel}>{label}</Text>
            <TextInput
                style={[
                    styles.fieldInput,
                    !editable && styles.fieldInputDisabled,
                    multiline && { minHeight: 80, textAlignVertical: 'top' },
                ]}
                value={value}
                onChangeText={onChangeText}
                keyboardType={keyboardType}
                editable={editable}
                placeholderTextColor={TEXT_GRAY}
                placeholder={`Enter ${label.toLowerCase()}`}
                multiline={multiline}
            />
        </View>
    );
}

function SelectField({ label, value, options, onSelect }) {
    const [modalVisible, setModalVisible] = useState(false);
    return (
        <View style={styles.field}>
            <Text style={styles.fieldLabel}>{label}</Text>
            <TouchableOpacity
                style={styles.selectInput}
                onPress={() => setModalVisible(true)}
                activeOpacity={0.7}
            >
                <Text style={[styles.selectText, !value && styles.selectPlaceholder]}>
                    {value || `Select ${label.toLowerCase()}`}
                </Text>
                <Ionicons name="chevron-down" size={18} color={TEXT_GRAY} />
            </TouchableOpacity>

            <Modal
                visible={modalVisible}
                transparent
                animationType="fade"
                onRequestClose={() => setModalVisible(false)}
            >
                <TouchableOpacity
                    style={styles.modalOverlay}
                    activeOpacity={1}
                    onPress={() => setModalVisible(false)}
                >
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Select {label}</Text>
                            <TouchableOpacity onPress={() => setModalVisible(false)}>
                                <Ionicons name="close" size={24} color={TEXT_DARK} />
                            </TouchableOpacity>
                        </View>
                        <ScrollView style={styles.optionsList}>
                            {options.map((option) => (
                                <TouchableOpacity
                                    key={option}
                                    style={[styles.optionItem, value === option && styles.optionItemSelected]}
                                    onPress={() => { onSelect(option); setModalVisible(false); }}
                                    activeOpacity={0.7}
                                >
                                    <Text style={[styles.optionText, value === option && styles.optionTextSelected]}>
                                        {option}
                                    </Text>
                                    {value === option && <Ionicons name="checkmark" size={20} color={GREEN_DARK} />}
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>
                </TouchableOpacity>
            </Modal>
        </View>
    );
}

function DateField({ label, value, onChange }) {
    const [show, setShow] = useState(false);
    const [date, setDate] = useState(value ? new Date(value) : new Date());

    const handleChange = (event, selectedDate) => {
        setShow(Platform.OS === 'ios');
        if (selectedDate) {
            setDate(selectedDate);
            onChange(selectedDate.toISOString().split('T')[0]);
        }
    };

    const formatDisplayDate = (dateString) => {
        if (!dateString) return '';
        const d = new Date(dateString);
        return `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`;
    };

    return (
        <View style={styles.field}>
            <Text style={styles.fieldLabel}>{label}</Text>
            <TouchableOpacity style={styles.selectInput} onPress={() => setShow(true)} activeOpacity={0.7}>
                <Text style={[styles.selectText, !value && styles.selectPlaceholder]}>
                    {value ? formatDisplayDate(value) : `Select ${label.toLowerCase()}`}
                </Text>
                <Ionicons name="calendar-outline" size={18} color={TEXT_GRAY} />
            </TouchableOpacity>
            {show && (
                <DateTimePicker
                    value={date}
                    mode="date"
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    onChange={handleChange}
                    maximumDate={new Date()}
                />
            )}
        </View>
    );
}

function Section({ icon, title, badge, badgeMax, children, defaultOpen = false }) {
    const [open, setOpen] = useState(defaultOpen);
    const isComplete = badge === badgeMax;

    return (
        <View style={styles.section}>
            <TouchableOpacity
                style={styles.sectionHeader}
                onPress={() => setOpen(!open)}
                activeOpacity={0.75}
            >
                <View style={styles.sectionLeft}>
                    <View style={[styles.sectionIconWrap, isComplete && styles.sectionIconWrapComplete]}>
                        <Ionicons name={icon} size={18} color={isComplete ? SUCCESS : GREEN_DARK} />
                    </View>
                    <View>
                        <Text style={styles.sectionTitle}>{title}</Text>
                        {isComplete && <Text style={styles.sectionComplete}>✓ Completed</Text>}
                    </View>
                </View>
                <View style={styles.sectionRight}>
                    <View style={[styles.sectionBadge, isComplete && styles.sectionBadgeComplete]}>
                        <Text style={styles.sectionBadgeText}>{badge}/{badgeMax}</Text>
                    </View>
                    <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={18} color={TEXT_GRAY} />
                </View>
            </TouchableOpacity>
            {open && <View style={styles.sectionBody}>{children}</View>}
        </View>
    );
}

function PhotoRow({ label, uploaded, imageUri, onPress, onView }) {
    return (
        <View style={styles.field}>
            <Text style={styles.fieldLabel}>{label}</Text>
            <View style={styles.photoRow}>
                <TouchableOpacity
                    style={[styles.photoThumb, uploaded && styles.photoThumbUploaded]}
                    onPress={onView}
                    activeOpacity={imageUri ? 0.7 : 1}
                    disabled={!imageUri}
                >
                    {imageUri ? (
                        <Image source={{ uri: imageUri }} style={styles.photoImage} />
                    ) : (
                        <>
                            <Ionicons name={uploaded ? 'checkmark-circle' : 'image'} size={28} color={uploaded ? SUCCESS : TEXT_GRAY} />
                            {uploaded && <Text style={styles.uploadedTag}>✓ Uploaded</Text>}
                        </>
                    )}
                </TouchableOpacity>
                <TouchableOpacity style={styles.changeBtn} onPress={onPress} activeOpacity={0.7}>
                    <Ionicons name="cloud-upload-outline" size={16} color={GREEN_DARK} />
                    <Text style={styles.changeBtnText}>{uploaded ? 'Change' : 'Upload'}</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

function ContactsField({ uploaded, count, loading, onVerify }) {
    return (
        <View style={styles.field}>
            <Text style={styles.fieldLabel}>Contacts List</Text>
            <View style={styles.contactsCard}>
                <View style={styles.contactsStatusRow}>
                    <View style={[styles.contactsIconWrap, uploaded ? styles.contactsIconWrapSuccess : styles.contactsIconWrapDefault]}>
                        <Ionicons name={uploaded ? 'people' : 'people-outline'} size={22} color={uploaded ? SUCCESS : TEXT_GRAY} />
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.contactsTitle}>
                            {uploaded ? `${count} Contacts Verified` : 'Contacts Not Verified'}
                        </Text>
                        <Text style={styles.contactsSubtitle}>
                            {uploaded ? 'contacts_list.csv ready to upload' : 'Tap verify to fetch contacts from your device'}
                        </Text>
                    </View>
                    {uploaded && (
                        <View style={styles.contactsCheckBadge}>
                            <Ionicons name="checkmark-circle" size={22} color={SUCCESS} />
                        </View>
                    )}
                </View>
                <TouchableOpacity
                    style={[styles.contactsVerifyBtn, uploaded && styles.contactsVerifyBtnAlt, loading && styles.contactsVerifyBtnDisabled]}
                    onPress={onVerify}
                    activeOpacity={0.75}
                    disabled={loading}
                >
                    {loading ? (
                        <ActivityIndicator size="small" color={uploaded ? GREEN_DARK : WHITE} />
                    ) : (
                        <>
                            <Ionicons name={uploaded ? 'refresh-outline' : 'shield-checkmark-outline'} size={16} color={uploaded ? GREEN_DARK : WHITE} />
                            <Text style={[styles.contactsVerifyBtnText, uploaded && styles.contactsVerifyBtnTextAlt]}>
                                {uploaded ? 'Re-verify Contacts' : 'Verify Contacts'}
                            </Text>
                        </>
                    )}
                </TouchableOpacity>
            </View>
        </View>
    );
}

// ══════════════════════════════════════════════════════════════════════════════
// ── MAIN SCREEN ───────────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════

export default function ProfileScreen({ navigation }) {
    const insets = useSafeAreaInsets();

    // ── Context ────────────────────────────────────────────────────────────────
    const { user, updateUser, updateProfileImage, clearUser } = useUser(); // ← ADD

    const [loading, setLoading] = useState(false);
    const [updating, setUpdating] = useState(false);
    const [profileData, setProfileData] = useState(null);

    const initialLoadDone = useRef(false);

    // ── Form State ─────────────────────────────────────────────────────────────
    const [name, setName] = useState('');
    const [mobile, setMobile] = useState('');
    const [email, setEmail] = useState('');
    const [maritalStatus, setMaritalStatus] = useState('');
    const [dob, setDob] = useState('');
    const [education, setEducation] = useState('');
    const [employment, setEmployment] = useState('');
    const [address, setAddress] = useState('');
    const [aadhaar, setAadhaar] = useState('');
    const [pan, setPan] = useState('');
    const [accountName, setAccountName] = useState('');
    const [bankName, setBankName] = useState('');
    const [accountNo, setAccountNo] = useState('');
    const [ifsc, setIfsc] = useState('');
    const [accountType, setAccountType] = useState('');
    const [branch, setBranch] = useState('');
    const [ref1Name, setRef1Name] = useState('');
    const [ref1Phone, setRef1Phone] = useState('');
    const [ref2Name, setRef2Name] = useState('');
    const [ref2Phone, setRef2Phone] = useState('');

    // ── Image State ────────────────────────────────────────────────────────────
    const [profileImage, setProfileImage] = useState(null);
    const [aadhaarImage, setAadhaarImage] = useState(null);
    const [panImage, setPanImage] = useState(null);
    const [newProfileImage, setNewProfileImage] = useState(null);
    const [newAadhaarImage, setNewAadhaarImage] = useState(null);
    const [newPanImage, setNewPanImage] = useState(null);

    // ── Contacts State ─────────────────────────────────────────────────────────
    const [contactsUploaded, setContactsUploaded] = useState(false);
    const [contactsLoading, setContactsLoading] = useState(false);
    const [contactsCount, setContactsCount] = useState(0);
    const [newContactsFile, setNewContactsFile] = useState(null);

    // ── Image Viewer ───────────────────────────────────────────────────────────
    const [imageViewerVisible, setImageViewerVisible] = useState(false);
    const [currentViewImage, setCurrentViewImage] = useState('');

    // ── Fetch Profile ──────────────────────────────────────────────────────────
    const fetchProfile = async (isRefreshing = false) => {
        if (!isRefreshing && !initialLoadDone.current) setLoading(true);
        try {
            const profileResult = await getUserProfile();

            if (profileResult.success) {
                const data = profileResult.data;
                setProfileData(data);

                setName(data.name || '');
                setMobile(data.mobile || '');
                setEmail(data.email || '');
                setMaritalStatus(data.marriage_status || '');
                setDob(data.dob || '');
                setEducation(data.education || '');
                setEmployment(data.employment || '');
                setAddress(data.address || '');
                setAadhaar(data.aadhaar_number || '');
                setPan(data.pan_number || '');
                setAccountName(data.account_holder_name || '');
                setBankName(data.bank_name || '');
                setAccountNo(data.account_number || '');
                setIfsc(data.ifsc_code || '');
                setAccountType(data.account_type || '');
                setBranch(data.branch_name || '');
                setRef1Name(data.reference_name_1 || '');
                setRef1Phone(data.reference_mobile_1 || '');
                setRef2Name(data.reference_name_2 || '');
                setRef2Phone(data.reference_mobile_2 || '');

                if (data.profile_image) setProfileImage(BASE_URL + data.profile_image);
                if (data.aadhaar_photo) setAadhaarImage(BASE_URL + data.aadhaar_photo);
                if (data.pan_photo) setPanImage(BASE_URL + data.pan_photo);
                if (data.contacts_file) setContactsUploaded(true);

                // ── Sync user to context from profile API ──
                // Build a user object from profile data and update context
                const updatedUser = {
                    ...(user || {}),
                    name: data.name || user?.name || '',
                    mobile: data.mobile || user?.mobile || '',
                    email: data.email || user?.email || '',
                    profile_image: data.profile_image
                        ? BASE_URL + data.profile_image
                        : user?.profile_image || null,
                    referral_code: data.referral_code || user?.referral_code || null,
                };
                await updateUser(updatedUser); // ← ADD: sync to context

                initialLoadDone.current = true;
            } else {
                handleApiError({ message: profileResult.message });
            }
        } catch (err) {
            handleApiError(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!initialLoadDone.current) fetchProfile();
    }, []);

    useFocusEffect(
        useCallback(() => {
            if (initialLoadDone.current) fetchProfile(true);
        }, [])
    );

    // ── Progress Calculation ───────────────────────────────────────────────────
    const calculateProgress = () => {
        const personalFilled = [name, mobile, email, maritalStatus, dob, education, employment, address]
            .filter(f => f && f.trim()).length;
        const kycFilled = [aadhaar, pan, profileImage, aadhaarImage, contactsUploaded ? 'filled' : '']
            .filter(f => f && String(f).trim()).length;
        const bankFilled = [accountName, bankName, accountNo, ifsc, accountType, branch]
            .filter(f => f && f.trim()).length;
        const refFilled = [ref1Name, ref1Phone, ref2Name, ref2Phone]
            .filter(f => f && f.trim()).length;

        const totalFilled = personalFilled + kycFilled + bankFilled + refFilled;
        const totalMax = 8 + 5 + 6 + 4;
        const overallPct = Math.round((totalFilled / totalMax) * 100);

        return {
            personal: { filled: personalFilled, total: 8 },
            kyc: { filled: kycFilled, total: 5 },
            bank: { filled: bankFilled, total: 6 },
            ref: { filled: refFilled, total: 4 },
            overall: overallPct,
        };
    };

    const progress = calculateProgress();

    const tabs = [
        { icon: 'person-outline', label: 'Personal', filled: progress.personal.filled, total: 8 },
        { icon: 'shield-checkmark-outline', label: 'KYC', filled: progress.kyc.filled, total: 5 },
        { icon: 'card-outline', label: 'Bank', filled: progress.bank.filled, total: 6 },
        { icon: 'people-outline', label: 'References', filled: progress.ref.filled, total: 4 },
    ];

    // ── Image Picker ───────────────────────────────────────────────────────────
    const pickImage = async (type) => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission Required', 'Please allow access to photos.');
            return;
        }
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.8,
        });
        if (!result.canceled) {
            const uri = result.assets[0].uri;
            if (type === 'aadhaar') {
                setAadhaarImage(uri);
                setNewAadhaarImage(result.assets[0]);
            } else if (type === 'pan') {
                setPanImage(uri);
                setNewPanImage(result.assets[0]);
            }
        }
    };

    // ── Camera for Profile Photo ───────────────────────────────────────────────
    const takeProfilePhoto = async () => {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission Required', 'Please allow camera access to take selfie.');
            return;
        }
        const result = await ImagePicker.launchCameraAsync({
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.8,
            cameraType: ImagePicker.CameraType.front,
        });
        if (!result.canceled) {
            const uri = result.assets[0].uri;
            setProfileImage(uri);
            setNewProfileImage(result.assets[0]);

            // ── Immediately update header with new photo ──
            console.log('📸 Profile: Updating image immediately:', uri);
            await updateProfileImage(uri);
        }
    };


    // ── Contacts ───────────────────────────────────────────────────────────────
    const fetchAndSaveContacts = async () => {
        setContactsLoading(true);
        try {
            const { status } = await Contacts.requestPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Permission Required', 'Please allow access to contacts to continue.');
                return;
            }
            const { data } = await Contacts.getContactsAsync({
                fields: [Contacts.Fields.Name, Contacts.Fields.PhoneNumbers, Contacts.Fields.Emails],
            });
            if (!data || data.length === 0) {
                Alert.alert('No Contacts', 'No contacts found on this device.');
                return;
            }
            const csvHeader = 'Name,Phone,Email\n';
            const csvRows = data.map((contact) => {
                const contactName = (contact.name || '').replace(/,/g, ' ');
                const phone = contact.phoneNumbers?.length > 0 ? contact.phoneNumbers[0].number?.replace(/,/g, '') || '' : '';
                const emailVal = contact.emails?.length > 0 ? contact.emails[0].email?.replace(/,/g, '') || '' : '';
                return `${contactName},${phone},${emailVal}`;
            }).join('\n');
            const csvContent = csvHeader + csvRows;
            const base64Content = btoa(unescape(encodeURIComponent(csvContent)));
            const fileUri = `data:text/csv;base64,${base64Content}`;
            setContactsCount(data.length);
            setContactsUploaded(true);
            setNewContactsFile({ uri: fileUri, name: 'contacts_list.csv', type: 'text/csv' });
            Alert.alert('Contacts Verified', `${data.length} contacts saved successfully.`);
        } catch (err) {
            handleApiError(err);
        } finally {
            setContactsLoading(false);
        }
    };

    const viewImage = (imageUri) => {
        if (imageUri) {
            setCurrentViewImage(imageUri);
            setImageViewerVisible(true);
        }
    };

    // ── Update Profile ─────────────────────────────────────────────────────────
    const handleUpdate = async () => {
        setUpdating(true);
        try {
            const hasNewImages = newProfileImage || newAadhaarImage || newPanImage || newContactsFile;

            let result;

            if (hasNewImages) {
                const formData = new FormData();
                formData.append('name', name || '');
                formData.append('email', email || '');
                formData.append('marriage_status', maritalStatus || '');
                formData.append('dob', dob || '');
                formData.append('education', education || '');
                formData.append('employment', employment || '');
                formData.append('address', address || '');
                formData.append('aadhaar_number', aadhaar || '');
                formData.append('pan_number', pan || '');
                formData.append('account_holder_name', accountName || '');
                formData.append('bank_name', bankName || '');
                formData.append('account_number', accountNo || '');
                formData.append('ifsc_code', ifsc || '');
                formData.append('account_type', accountType || '');
                formData.append('branch_name', branch || '');
                formData.append('reference_name_1', ref1Name || '');
                formData.append('reference_mobile_1', ref1Phone || '');
                formData.append('reference_name_2', ref2Name || '');
                formData.append('reference_mobile_2', ref2Phone || '');

                if (newProfileImage) {
                    formData.append('profile_image', { uri: newProfileImage.uri, type: 'image/jpeg', name: 'profile.jpg' });
                }
                if (newAadhaarImage) {
                    formData.append('aadhaar_photo', { uri: newAadhaarImage.uri, type: 'image/jpeg', name: 'aadhaar.jpg' });
                }
                if (newPanImage) {
                    formData.append('pan_photo', { uri: newPanImage.uri, type: 'image/jpeg', name: 'pan.jpg' });
                }
                if (newContactsFile) {
                    formData.append('contacts_file', { uri: newContactsFile.uri, type: 'text/csv', name: 'contacts_list.csv' });
                }

                result = await uploadProfileImages(formData);
            } else {
                const payload = {
                    name, email, marriage_status: maritalStatus, dob, education, employment,
                    address, aadhaar_number: aadhaar, pan_number: pan,
                    account_holder_name: accountName, bank_name: bankName,
                    account_number: accountNo, ifsc_code: ifsc, account_type: accountType,
                    branch_name: branch, reference_name_1: ref1Name, reference_mobile_1: ref1Phone,
                    reference_name_2: ref2Name, reference_mobile_2: ref2Phone,
                };
                result = await updateUserProfile(payload);
            }

            if (result.success) {
                showSuccess(result.message || 'Profile updated successfully!');

                // ── Update user in context after successful save ──
                if (result.data?.user) {
                    await updateUser(result.data.user); // ← ADD: full user update
                } else if (newProfileImage) {
                    // If API doesn't return user but we changed profile image,
                    // keep the local image in context
                    await updateProfileImage(newProfileImage.uri); // ← ADD
                }

                setNewProfileImage(null);
                setNewAadhaarImage(null);
                setNewPanImage(null);
                setNewContactsFile(null);

                await fetchProfile(true);
            } else {
                handleApiError({ message: result.message });
            }
        } catch (err) {
            handleApiError(err);
        } finally {
            setUpdating(false);
        }
    };

    // ── Logout ─────────────────────────────────────────────────────────────────
    const handleLogout = async () => {
        Alert.alert('Logout', 'Are you sure you want to logout?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Logout',
                style: 'destructive',
                onPress: async () => {
                    await clearAllData();
                    clearUser(); // ← ADD: clear context on logout
                    navigation.dispatch(
                        CommonActions.reset({ index: 0, routes: [{ name: 'Login' }] })
                    );
                },
            },
        ]);
    };

    // ── Helpers ────────────────────────────────────────────────────────────────
    const getUserInitials = () => {
        const displayName = user?.name || name;
        if (!displayName) return 'U';
        const parts = displayName.trim().split(' ');
        if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
        return parts[0][0].toUpperCase();
    };

    const bottomPadding = Platform.OS === 'ios' ? 100 : insets.bottom > 0 ? insets.bottom + 80 : 80;

    const getProfileAlert = () => {
        if (!profileData) return null;
        if (profileData.profile_completed) {
            return {
                type: 'success',
                icon: 'checkmark-circle',
                iconColor: SUCCESS,
                iconBg: '#DCFCE7',
                cardBg: '#F0FFF4',
                borderColor: '#BBF7D0',
                title: 'Profile Complete',
                message: 'Your profile is complete! You are eligible to apply for loans.',
            };
        } else if (profileData.profile_status === 'incomplete') {
            return {
                type: 'warning',
                icon: 'alert-circle',
                iconColor: '#F59E0B',
                iconBg: '#FEF3C7',
                cardBg: '#FFFBEB',
                borderColor: '#FDE68A',
                title: 'Profile Incomplete',
                message: profileData.profile_message || 'Please complete your profile details.',
            };
        }
        return null;
    };

    const alertConfig = getProfileAlert();
    const totalFilled = progress.personal.filled + progress.kyc.filled + progress.bank.filled + progress.ref.filled;

    // ── Render ─────────────────────────────────────────────────────────────────
    return (
        <View style={styles.container}>
            <Header
                showLogo
                showProfile
                showNotification
                avatarText={getUserInitials()}
                profileImageUrl={user?.profile_image || null} // ← ADD
                onProfilePress={() => { }}
                onNotificationPress={() => { }}
            />

            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: bottomPadding, paddingHorizontal: 16 }}
            >
                {loading && !initialLoadDone.current ? (
                    <LoadingSkeleton />
                ) : (
                    <>
                        <Text style={styles.pageTitle}>My Profile</Text>
                        <Text style={styles.pageSubtitle}>
                            Complete every section to unlock full loan eligibility and faster approvals.
                        </Text>

                        {/* Profile Status Alert */}
                        {alertConfig && (
                            <View style={[styles.alertCard, { backgroundColor: alertConfig.cardBg, borderColor: alertConfig.borderColor }]}>
                                <View style={[styles.alertIconBox, { backgroundColor: alertConfig.iconBg }]}>
                                    <Ionicons name={alertConfig.icon} size={22} color={alertConfig.iconColor} />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={[styles.alertTitle, { color: alertConfig.type === 'success' ? '#166534' : '#92400E' }]}>
                                        {alertConfig.title}
                                    </Text>
                                    <Text style={[styles.alertText, { color: alertConfig.type === 'success' ? '#15803D' : '#B45309' }]}>
                                        {alertConfig.message}
                                    </Text>
                                </View>
                            </View>
                        )}

                        {/* Progress Card */}
                        <View style={styles.progressCard}>
                            <View style={styles.progressHeader}>
                                <CircularProgress percentage={progress.overall} size={90} />
                                <View style={styles.progressHeaderText}>
                                    <Text style={styles.progressTitle}>Profile Completion</Text>
                                    <Text style={styles.progressSubtitle}>{totalFilled} of 23 fields completed</Text>
                                    {progress.overall === 100 ? (
                                        <View style={styles.completeBadge}>
                                            <Ionicons name="trophy" size={14} color="#F59E0B" />
                                            <Text style={styles.completeBadgeText}>100% Complete!</Text>
                                        </View>
                                    ) : (
                                        <Text style={styles.progressHint}>{23 - totalFilled} fields remaining</Text>
                                    )}
                                </View>
                            </View>
                            <View style={styles.progressDivider} />
                            <View style={styles.progressTabs}>
                                {tabs.map((t, i) => (
                                    <ProgressTab key={i} icon={t.icon} label={t.label} filled={t.filled} total={t.total} index={i} />
                                ))}
                            </View>
                        </View>

                        {/* Identity Card */}
                        <View style={styles.identityCard}>
                            <TouchableOpacity
                                style={styles.identityAvatar}
                                onPress={() => viewImage(profileImage)}
                                activeOpacity={profileImage ? 0.7 : 1}
                                disabled={!profileImage}
                            >
                                {profileImage ? (
                                    <Image source={{ uri: profileImage }} style={styles.identityAvatarImage} />
                                ) : (
                                    <Text style={styles.identityAvatarText}>{getUserInitials()}</Text>
                                )}
                            </TouchableOpacity>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.identityName}>{name || 'User'}</Text>
                                <Text style={styles.identityEmail}>{email || 'No email'}</Text>
                                <Text style={styles.identityPhone}>+91 {mobile || 'N/A'}</Text>
                                {profileData?.referral_code && (
                                    <View style={styles.referralCodePill}>
                                        <Ionicons name="gift-outline" size={12} color={GREEN_DARK} />
                                        <Text style={styles.referralCodeText}>{profileData.referral_code}</Text>
                                    </View>
                                )}
                            </View>
                            <TouchableOpacity style={styles.editIconBtn} onPress={takeProfilePhoto}>
                                <Ionicons name="camera" size={16} color={GREEN_DARK} />
                            </TouchableOpacity>
                        </View>

                        {/* ── Personal Details ── */}
                        <Section icon="person-outline" title="Personal Details" badge={progress.personal.filled} badgeMax={8} defaultOpen>
                            <Field label="Name" value={name} onChangeText={setName} />
                            <Field label="Mobile Number" value={mobile} onChangeText={setMobile} keyboardType="phone-pad" editable={false} />
                            <Field label="Email" value={email} onChangeText={setEmail} keyboardType="email-address" />
                            <SelectField label="Marriage Status" value={maritalStatus} options={MARITAL_STATUS_OPTIONS} onSelect={setMaritalStatus} />
                            <DateField label="Date of Birth" value={dob} onChange={setDob} />
                            <Field label="Education" value={education} onChangeText={setEducation} />
                            <SelectField label="Employment" value={employment} options={EMPLOYMENT_OPTIONS} onSelect={setEmployment} />
                            <Field label="Address" value={address} onChangeText={setAddress} multiline />
                        </Section>

                        {/* ── KYC Details ── */}
                        <Section icon="shield-checkmark-outline" title="KYC Details" badge={progress.kyc.filled} badgeMax={5}>
                            <Field label="Aadhaar Number" value={aadhaar} onChangeText={setAadhaar} keyboardType="numeric" />
                            <Field label="PAN Number" value={pan} onChangeText={setPan} />
                            <PhotoRow label="Profile Photo (Selfie)" uploaded={!!profileImage} imageUri={profileImage} onPress={takeProfilePhoto} onView={() => viewImage(profileImage)} />
                            <PhotoRow label="Aadhaar Photo" uploaded={!!aadhaarImage} imageUri={aadhaarImage} onPress={() => pickImage('aadhaar')} onView={() => viewImage(aadhaarImage)} />
                            <PhotoRow label="PAN Photo" uploaded={!!panImage} imageUri={panImage} onPress={() => pickImage('pan')} onView={() => viewImage(panImage)} />
                            <ContactsField uploaded={contactsUploaded} count={contactsCount} loading={contactsLoading} onVerify={fetchAndSaveContacts} />
                        </Section>

                        {/* ── Bank Details ── */}
                        <Section icon="card-outline" title="Bank Details" badge={progress.bank.filled} badgeMax={6}>
                            <Field label="Account Holder Name" value={accountName} onChangeText={setAccountName} />
                            <Field label="Bank Name" value={bankName} onChangeText={setBankName} />
                            <Field label="Account Number" value={accountNo} onChangeText={setAccountNo} keyboardType="numeric" />
                            <Field label="IFSC Code" value={ifsc} onChangeText={setIfsc} />
                            <SelectField label="Account Type" value={accountType} options={ACCOUNT_TYPE_OPTIONS} onSelect={setAccountType} />
                            <Field label="Branch Name" value={branch} onChangeText={setBranch} />
                        </Section>

                        {/* ── References ── */}
                        <Section icon="people-outline" title="References" badge={progress.ref.filled} badgeMax={4}>
                            <Field label="Reference 1 Name" value={ref1Name} onChangeText={setRef1Name} />
                            <Field label="Reference 1 Contact Number" value={ref1Phone} onChangeText={setRef1Phone} keyboardType="phone-pad" />
                            <Field label="Reference 2 Name" value={ref2Name} onChangeText={setRef2Name} />
                            <Field label="Reference 2 Contact Number" value={ref2Phone} onChangeText={setRef2Phone} keyboardType="phone-pad" />
                        </Section>

                        {/* ── Update Button ── */}
                        <TouchableOpacity
                            style={[styles.updateBtn, updating && styles.updateBtnDisabled]}
                            onPress={handleUpdate}
                            activeOpacity={0.85}
                            disabled={updating}
                        >
                            <LinearGradient
                                colors={updating ? ['#9CA3AF', '#6B7280'] : [GREEN_DARK, '#145C4D']}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                                style={styles.updateBtnGradient}
                            >
                                <Ionicons name={updating ? 'hourglass-outline' : 'checkmark-circle'} size={20} color={WHITE} />
                                <Text style={styles.updateBtnText}>{updating ? 'Updating...' : 'Update Profile'}</Text>
                            </LinearGradient>
                        </TouchableOpacity>

                        {/* ── Logout Button ── */}
                        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.85}>
                            <Ionicons name="log-out-outline" size={20} color={ERROR_RED} />
                            <Text style={styles.logoutBtnText}>Logout</Text>
                        </TouchableOpacity>

                        <Text style={styles.versionText}>Version 1.0.0</Text>
                    </>
                )}
            </ScrollView>

            {/* Image Viewer */}
            <ImageView
                images={[{ uri: currentViewImage }]}
                imageIndex={0}
                visible={imageViewerVisible}
                onRequestClose={() => setImageViewerVisible(false)}
            />
        </View>
    );
}

// ── Styles (unchanged from original) ─────────────────────────────────────────
const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: GRAY_BG },
    pageTitle: { fontFamily: FONTS.bold, fontSize: 22, color: TEXT_DARK, marginTop: 14, marginBottom: 4 },
    pageSubtitle: { fontFamily: FONTS.regular, fontSize: 12, color: TEXT_GRAY, lineHeight: 18, marginBottom: 16 },
    alertCard: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 14, padding: 14, marginBottom: 16, borderWidth: 1 },
    alertIconBox: { width: 38, height: 38, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
    alertTitle: { fontFamily: FONTS.semiBold, fontSize: 13, marginBottom: 2 },
    alertText: { fontFamily: FONTS.regular, fontSize: 11, lineHeight: 16 },
    progressCard: { backgroundColor: WHITE, borderRadius: 16, padding: 20, marginBottom: 16, elevation: 3, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 12, shadowOffset: { width: 0, height: 4 } },
    progressHeader: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 16 },
    progressCircle: { position: 'relative', justifyContent: 'center', alignItems: 'center' },
    progressInner: { position: 'absolute', justifyContent: 'center', alignItems: 'center' },
    progressRing: { borderWidth: 6, backgroundColor: 'transparent' },
    progressPct: { fontFamily: FONTS.bold, fontSize: 20, color: GREEN_DARK },
    progressLabel: { fontFamily: FONTS.regular, fontSize: 9, color: TEXT_GRAY, marginTop: -2 },
    progressHeaderText: { flex: 1 },
    progressTitle: { fontFamily: FONTS.bold, fontSize: 16, color: TEXT_DARK, marginBottom: 2 },
    progressSubtitle: { fontFamily: FONTS.regular, fontSize: 12, color: TEXT_GRAY, marginBottom: 6 },
    progressHint: { fontFamily: FONTS.medium, fontSize: 11, color: GREEN_DARK },
    completeBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FEF3C7', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, gap: 4, alignSelf: 'flex-start' },
    completeBadgeText: { fontFamily: FONTS.semiBold, fontSize: 11, color: '#F59E0B' },
    progressDivider: { height: 1, backgroundColor: BORDER_CLR, marginBottom: 16 },
    progressTabs: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    progressTab: { width: '48%', borderRadius: 12, padding: 12 },
    progressTabHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    progressTabIcon: { width: 32, height: 32, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
    progressTabLabel: { fontFamily: FONTS.semiBold, fontSize: 13, color: TEXT_DARK, marginBottom: 4 },
    progressTabFooter: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    progressTabCount: { fontFamily: FONTS.medium, fontSize: 11, color: TEXT_GRAY },
    progressTabBar: { flex: 1, height: 4, backgroundColor: BORDER_CLR, borderRadius: 2, overflow: 'hidden' },
    progressTabBarFill: { height: '100%', borderRadius: 2 },
    identityCard: { backgroundColor: WHITE, borderRadius: 14, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16, elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, shadowOffset: { width: 0, height: 2 } },
    identityAvatar: { width: 64, height: 64, borderRadius: 32, backgroundColor: GREEN_DARK, justifyContent: 'center', alignItems: 'center', borderWidth: 3, borderColor: GREEN_LIGHT, overflow: 'hidden' },
    identityAvatarImage: { width: '100%', height: '100%' },
    identityAvatarText: { fontFamily: FONTS.bold, fontSize: 24, color: WHITE },
    identityName: { fontFamily: FONTS.bold, fontSize: 16, color: TEXT_DARK, marginBottom: 2 },
    identityEmail: { fontFamily: FONTS.regular, fontSize: 12, color: TEXT_GRAY, marginBottom: 2 },
    identityPhone: { fontFamily: FONTS.medium, fontSize: 12, color: GREEN_DARK, marginBottom: 4 },
    referralCodePill: { flexDirection: 'row', alignItems: 'center', backgroundColor: GREEN_LIGHT, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, gap: 4, alignSelf: 'flex-start' },
    referralCodeText: { fontFamily: FONTS.bold, fontSize: 10, color: GREEN_DARK, letterSpacing: 1 },
    editIconBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: GREEN_LIGHT, justifyContent: 'center', alignItems: 'center' },
    section: { backgroundColor: WHITE, borderRadius: 14, marginBottom: 12, overflow: 'hidden', elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, shadowOffset: { width: 0, height: 2 } },
    sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16 },
    sectionLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    sectionIconWrap: { width: 40, height: 40, borderRadius: 10, backgroundColor: GREEN_LIGHT, justifyContent: 'center', alignItems: 'center' },
    sectionIconWrapComplete: { backgroundColor: SUCCESS + '20' },
    sectionTitle: { fontFamily: FONTS.semiBold, fontSize: 14, color: TEXT_DARK, marginBottom: 2 },
    sectionComplete: { fontFamily: FONTS.regular, fontSize: 11, color: SUCCESS },
    sectionRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    sectionBadge: { backgroundColor: GREEN_DARK, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
    sectionBadgeComplete: { backgroundColor: SUCCESS },
    sectionBadgeText: { fontFamily: FONTS.bold, fontSize: 10, color: WHITE },
    sectionBody: { paddingHorizontal: 16, paddingBottom: 16, borderTopWidth: 1, borderTopColor: BORDER_CLR },
    field: { marginTop: 14 },
    fieldLabel: { fontFamily: FONTS.medium, fontSize: 12, color: TEXT_GRAY, marginBottom: 6 },
    fieldInput: { borderWidth: 1, borderColor: BORDER_CLR, borderRadius: 10, paddingVertical: 12, paddingHorizontal: 14, fontFamily: FONTS.regular, fontSize: 14, color: TEXT_DARK, backgroundColor: WHITE },
    fieldInputDisabled: { backgroundColor: GRAY_BG, color: TEXT_GRAY },
    selectInput: { borderWidth: 1, borderColor: BORDER_CLR, borderRadius: 10, paddingVertical: 12, paddingHorizontal: 14, backgroundColor: WHITE, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    selectText: { fontFamily: FONTS.regular, fontSize: 14, color: TEXT_DARK },
    selectPlaceholder: { color: TEXT_GRAY },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
    modalContent: { backgroundColor: WHITE, borderRadius: 16, width: '100%', maxHeight: '70%', elevation: 5, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 15, shadowOffset: { width: 0, height: 5 } },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: BORDER_CLR },
    modalTitle: { fontFamily: FONTS.semiBold, fontSize: 16, color: TEXT_DARK },
    optionsList: { maxHeight: 300 },
    optionItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: BORDER_CLR },
    optionItemSelected: { backgroundColor: GREEN_LIGHT },
    optionText: { fontFamily: FONTS.regular, fontSize: 14, color: TEXT_DARK },
    optionTextSelected: { fontFamily: FONTS.semiBold, color: GREEN_DARK },
    photoRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    photoThumb: { flex: 1, height: 64, borderWidth: 1.5, borderStyle: 'dashed', borderColor: BORDER_CLR, borderRadius: 10, justifyContent: 'center', alignItems: 'center', backgroundColor: GRAY_BG, flexDirection: 'row', gap: 8, overflow: 'hidden' },
    photoThumbUploaded: { borderColor: SUCCESS, borderStyle: 'solid', backgroundColor: SUCCESS + '10' },
    photoImage: { width: '100%', height: '100%' },
    uploadedTag: { fontFamily: FONTS.medium, fontSize: 12, color: SUCCESS },
    changeBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1.5, borderColor: GREEN_DARK, borderRadius: 10, paddingVertical: 12, paddingHorizontal: 16 },
    changeBtnText: { fontFamily: FONTS.semiBold, fontSize: 13, color: GREEN_DARK },
    contactsCard: { borderWidth: 1, borderColor: BORDER_CLR, borderRadius: 12, backgroundColor: WHITE, overflow: 'hidden' },
    contactsStatusRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
    contactsIconWrap: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
    contactsIconWrapDefault: { backgroundColor: GRAY_BG },
    contactsIconWrapSuccess: { backgroundColor: SUCCESS + '20' },
    contactsTitle: { fontFamily: FONTS.semiBold, fontSize: 13, color: TEXT_DARK, marginBottom: 2 },
    contactsSubtitle: { fontFamily: FONTS.regular, fontSize: 11, color: TEXT_GRAY, lineHeight: 16 },
    contactsCheckBadge: { padding: 2 },
    contactsVerifyBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: GREEN_DARK, paddingVertical: 13, borderTopWidth: 1, borderTopColor: BORDER_CLR },
    contactsVerifyBtnAlt: { backgroundColor: GREEN_LIGHT },
    contactsVerifyBtnDisabled: { opacity: 0.6 },
    contactsVerifyBtnText: { fontFamily: FONTS.semiBold, fontSize: 13, color: WHITE },
    contactsVerifyBtnTextAlt: { color: GREEN_DARK },
    updateBtn: { borderRadius: 12, overflow: 'hidden', marginTop: 8, marginBottom: 12, elevation: 4, shadowColor: GREEN_DARK, shadowOpacity: 0.3, shadowRadius: 8, shadowOffset: { width: 0, height: 4 } },
    updateBtnDisabled: { opacity: 0.6 },
    updateBtnGradient: { paddingVertical: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
    updateBtnText: { fontFamily: FONTS.bold, fontSize: 15, color: WHITE },
    logoutBtn: { backgroundColor: WHITE, borderRadius: 12, borderWidth: 1.5, borderColor: '#FEE2E2', paddingVertical: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 16 },
    logoutBtnText: { fontFamily: FONTS.semiBold, fontSize: 15, color: ERROR_RED },
    versionText: { fontFamily: FONTS.regular, fontSize: 11, color: TEXT_GRAY, textAlign: 'center', marginBottom: 10 },
});