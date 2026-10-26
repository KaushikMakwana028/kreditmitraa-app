// components/Header.jsx
import React from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    StatusBar,
    Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/colors';
import { FONTS } from '../constants/fonts';

export default function Header({
    title,
    showLogo = true,
    showProfile = true,
    avatarText = 'U',
    profileImageUrl = null,   // ← NEW prop
    showNotification = false,
    notificationCount = 0,
    showFilter = false,
    onProfilePress,
    onNotificationPress,
    onFilterPress,
}) {
    const insets = useSafeAreaInsets();

    return (
        <>
            <StatusBar
                barStyle="dark-content"
                backgroundColor={COLORS.background}
                translucent={false}
            />
            <View style={[styles.header, { paddingTop: insets.top }]}>
                {/* Left Side */}
                <View style={styles.headerLeft}>
                    {showLogo && (
                        <View style={styles.logoContainer}>
                            <Image
                                source={require('../../assets/logo.png')}
                                style={styles.logoImage}
                                resizeMode="contain"
                            />
                        </View>
                    )}
                    {title && (
                        <View style={styles.titleContainer}>
                            <Text style={styles.headerTitle}>{title}</Text>
                        </View>
                    )}
                </View>

                {/* Right Side */}
                <View style={styles.headerRight}>
                    {showFilter && (
                        <TouchableOpacity
                            style={styles.iconButton}
                            onPress={onFilterPress}
                            activeOpacity={0.7}
                        >
                            <Ionicons name="filter" size={20} color={COLORS.primary} />
                        </TouchableOpacity>
                    )}

                    {showProfile && (
                        <TouchableOpacity
                            style={styles.profileAvatar}
                            onPress={onProfilePress}
                            activeOpacity={0.7}
                        >
                            {/* ── Show image if available, else initials ── */}
                            {profileImageUrl ? (
                                <Image
                                    source={{ uri: profileImageUrl }}
                                    style={styles.profileImage}
                                    // Fallback to initials on image error
                                    onError={() => { }}
                                />
                            ) : (
                                <Text style={styles.avatarText}>{avatarText}</Text>
                            )}
                        </TouchableOpacity>
                    )}
                </View>
            </View>
        </>
    );
}

const styles = StyleSheet.create({
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingBottom: 10,
        backgroundColor: COLORS.background,
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        gap: 12,
    },
    logoContainer: {
        width: 60,
        height: 60,
        borderRadius: 20,
    },
    logoImage: {
        width: '100%',
        height: '100%',
        borderRadius: 16,
    },
    titleContainer: {
        flex: 1,
    },
    headerTitle: {
        fontFamily: FONTS.semiBold,
        fontSize: 18,
        color: COLORS.black,
    },
    headerRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    iconButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: COLORS.white,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 2,
        shadowColor: '#000',
        shadowOpacity: 0.06,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 2 },
    },
    profileAvatar: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: COLORS.primary,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: COLORS.secondary,
        elevation: 2,
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 2 },
        overflow: 'hidden', // ← ensures image is clipped to circle
    },
    profileImage: {
        width: '100%',
        height: '100%',
        borderRadius: 22,
    },
    avatarText: {
        fontFamily: FONTS.bold,
        fontSize: 16,
        color: COLORS.white,
    },
});