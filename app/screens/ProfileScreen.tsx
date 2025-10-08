// In app/screens/ProfileScreen.tsx
import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { colors, fonts } from '../theme/theme';
import { useApp } from '../context/AppContext';

export default function ProfileScreen() {
    const navigation = useNavigation();

    const { user, updateUser, stats, settings, updateSettings, signOut, clearAllData } = useApp();

    const handleChangeGradeLevel = () => {
        Alert.alert(
            'Select Grade Level',
            'Choose your current grade level',
            [
                { text: 'Elementary (K-6)', onPress: () => updateUser({ gradeLevel: 'elementary' }) },
                { text: 'Junior High (7-10)', onPress: () => updateUser({ gradeLevel: 'juniorHigh' }) },
                { text: 'Senior High (11-12)', onPress: () => updateUser({ gradeLevel: 'seniorHigh' }) },
                { text: 'Cancel', style: 'cancel' }
            ]
        );
    };

    const getGradeLevelDisplay = () => {
        switch (user.gradeLevel) {
            case 'elementary': return 'Elementary (K-6)';
            case 'juniorHigh': return 'Junior High (7-10)';
            case 'seniorHigh': return 'Senior High (11-12)';
        }
    };

    const handleSignOut = () => {
        Alert.alert(
            'Sign Out',
            'Are you sure you want to sign out?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Sign Out',
                    style: 'destructive',
                    onPress: async () => {
                        await signOut();
                        Alert.alert('Signed Out', 'You have been signed out successfully');
                        navigation.navigate('Login' as never);
                    }
                }
            ]
        );
    };

    const handleUpgradeAccount = () => {
        Alert.alert(
            'Create Account',
            'Create an account to sync your discoveries across devices and unlock exclusive features!',
            [
                { text: 'Maybe Later', style: 'cancel' },
                {
                    text: 'Create Account',
                    onPress: () => navigation.navigate('Login' as never)
                }
            ]
        );
    };

    const handleAbout = () => {
        Alert.alert(
            'About SiyensyaGo',
            'Version 1.0.0\n\nMaking STEM learning accessible and fun for Filipino students.\n\n© 2025 SiyensyaGo',
            [{ text: 'OK' }]
        );
    };

    const handleHelp = () => {
        Alert.alert(
            'Help & Support',
            'Need help? Visit our support page or contact us at support@siyensyago.ph',
            [
                { text: 'OK' },
                { text: 'Visit Support Page', onPress: () => { } }
            ]
        );
    };

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
                {/* Header */}
                <View style={styles.header}>
                    <Text style={styles.headerTitle}>Profile</Text>
                </View>

                {/* User Info Card */}
                <View style={styles.userCard}>
                    <View style={styles.avatarContainer}>
                        <View style={styles.avatar}>
                            <Ionicons name="person" size={40} color={colors.primary} />
                        </View>
                        {user.isGuest && (
                            <View style={styles.guestBadge}>
                                <Text style={styles.guestBadgeText}>GUEST</Text>
                            </View>
                        )}
                    </View>
                    <View style={styles.userInfo}>
                        <Text style={styles.userName}>{user.userName}</Text>
                        <TouchableOpacity
                            style={styles.gradeLevelButton}
                            onPress={handleChangeGradeLevel}
                        >
                            <Ionicons name="school-outline" size={16} color={colors.primary} />
                            <Text style={styles.gradeLevel}>{getGradeLevelDisplay()}</Text>
                            <Ionicons name="chevron-forward" size={16} color={colors.lightGray} />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Guest Upgrade Prompt */}
                {user.isGuest && (
                    <TouchableOpacity style={styles.upgradeCard} onPress={handleUpgradeAccount}>
                        <View style={styles.upgradeIcon}>
                            <Ionicons name="rocket" size={28} color={colors.secondary} />
                        </View>
                        <View style={styles.upgradeContent}>
                            <Text style={styles.upgradeTitle}>Upgrade to Full Account</Text>
                            <Text style={styles.upgradeSubtitle}>
                                Sync discoveries, earn badges, and unlock more features!
                            </Text>
                        </View>
                        <Ionicons name="chevron-forward" size={24} color={colors.primary} />
                    </TouchableOpacity>
                )}

                {/* Stats Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Your Stats</Text>

                    <View style={styles.statsGrid}>
                        <View style={styles.statCard}>
                            <Ionicons name="scan" size={32} color={colors.primary} />
                            <Text style={styles.statValue}>{stats.totalDiscoveries}</Text>
                            <Text style={styles.statLabel}>Discoveries</Text>
                        </View>

                        <View style={styles.statCard}>
                            <Ionicons name="flame" size={32} color={colors.warning} />
                            <Text style={styles.statValue}>{stats.streak}</Text>
                            <Text style={styles.statLabel}>Day Streak</Text>
                        </View>

                        <View style={styles.statCard}>
                            <Ionicons name="star" size={32} color={colors.secondary} />
                            <Text style={styles.statValue}>0</Text>
                            <Text style={styles.statLabel}>Badges</Text>
                        </View>
                    </View>

                    {/* Subject Distribution - Only show if there are discoveries */}
                    {stats.totalDiscoveries > 0 && (
                        <View style={styles.subjectsCard}>
                            <Text style={styles.subjectsTitle}>Subject Distribution</Text>
                            {Object.entries(stats.subjectDistribution).map(([subject, count]) => (
                                <View key={subject} style={styles.subjectRow}>
                                    <Text style={styles.subjectName}>
                                        {subject.charAt(0).toUpperCase() + subject.slice(1)}
                                    </Text>
                                    <View style={styles.subjectBar}>
                                        <View
                                            style={[
                                                styles.subjectBarFill,
                                                { width: `${(Number(count) / stats.totalDiscoveries) * 100}%` }
                                            ]}
                                        />
                                    </View>
                                    <Text style={styles.subjectCount}>{Number(count)}</Text>
                                </View>
                            ))}
                        </View>
                    )}
                </View>

                {/* Settings Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Settings</Text>

                    {/* Grade Level */}
                    <TouchableOpacity style={styles.settingItem} onPress={handleChangeGradeLevel}>
                        <View style={styles.settingLeft}>
                            <Ionicons name="school-outline" size={24} color={colors.primary} />
                            <Text style={styles.settingText}>Grade Level</Text>
                        </View>
                        <View style={styles.settingRight}>
                            <Text style={styles.settingValue}>{getGradeLevelDisplay()}</Text>
                            <Ionicons name="chevron-forward" size={20} color={colors.lightGray} />
                        </View>
                    </TouchableOpacity>

                    {/* Notifications */}
                    {/*<View style={styles.settingItem}>
                        <View style={styles.settingLeft}>
                            <Ionicons name="notifications-outline" size={24} color={colors.primary} />
                            <Text style={styles.settingText}>Notifications</Text>
                        </View>
                        <Switch
                            value={settings.notificationsEnabled}
                            onValueChange={(value) => updateSettings({ notificationsEnabled: value })}
                            trackColor={{ false: '#1A1C2A', true: colors.primary }}
                            thumbColor={colors.text}
                        />
                    </View>*/}

                    {/* Sound Effects */}
                    {/*<View style={styles.settingItem}>
                        <View style={styles.settingLeft}>
                            <Ionicons name="volume-high-outline" size={24} color={colors.primary} />
                            <Text style={styles.settingText}>Sound Effects</Text>
                        </View>
                        <Switch
                            value={settings.soundEnabled}
                            onValueChange={(value) => updateSettings({ soundEnabled: value })}
                            trackColor={{ false: '#1A1C2A', true: colors.primary }}
                            thumbColor={colors.text}
                        />
                    </View>*/}

                    {/* Language - Coming Soon */}
                    <TouchableOpacity
                        style={styles.settingItem}
                        onPress={() => Alert.alert('Coming Soon', 'Language selection will be available in a future update')}
                    >
                        <View style={styles.settingLeft}>
                            <Ionicons name="language-outline" size={24} color={colors.primary} />
                            <Text style={styles.settingText}>Language</Text>
                        </View>
                        <View style={styles.settingRight}>
                            <Text style={styles.settingValue}>English</Text>
                            <Ionicons name="chevron-forward" size={20} color={colors.lightGray} />
                        </View>
                    </TouchableOpacity>
                </View>

                {/* Support Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Support</Text>

                    <TouchableOpacity style={styles.settingItem} onPress={handleHelp}>
                        <View style={styles.settingLeft}>
                            <Ionicons name="help-circle-outline" size={24} color={colors.primary} />
                            <Text style={styles.settingText}>Help & Support</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color={colors.lightGray} />
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.settingItem} onPress={handleAbout}>
                        <View style={styles.settingLeft}>
                            <Ionicons name="information-circle-outline" size={24} color={colors.primary} />
                            <Text style={styles.settingText}>About</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color={colors.lightGray} />
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.settingItem}
                        onPress={() => Alert.alert('Privacy Policy', 'Opening privacy policy...')}
                    >
                        <View style={styles.settingLeft}>
                            <Ionicons name="shield-checkmark-outline" size={24} color={colors.primary} />
                            <Text style={styles.settingText}>Privacy Policy</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color={colors.lightGray} />
                    </TouchableOpacity>
                </View>

                {/* Sign Out / Delete Account */}
                <View style={styles.section}>
                    {!user.isGuest ? (
                        <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
                            <Ionicons name="log-out-outline" size={24} color={colors.warning} />
                            <Text style={styles.signOutText}>Sign Out</Text>
                        </TouchableOpacity>
                    ) : (
                        <TouchableOpacity
                            style={styles.signOutButton}
                            onPress={() => Alert.alert('Clear Data', 'This will remove all your discoveries. Are you sure?', [
                                { text: 'Cancel', style: 'cancel' },
                                {
                                    text: 'Clear Data', style: 'destructive', onPress: async () => {
                                        await clearAllData();
                                        Alert.alert('Data Cleared', 'All your data has been removed');
                                    }
                                }
                            ])}
                        >
                            <Ionicons name="trash-outline" size={24} color={colors.warning} />
                            <Text style={styles.signOutText}>Clear All Data</Text>
                        </TouchableOpacity>
                    )}
                </View>

                {/* Version Info */}
                <Text style={styles.versionText}>Version 1.0.0</Text>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    scrollView: {
        flex: 1,
    },
    header: {
        padding: 20,
        paddingBottom: 10,
    },
    headerTitle: {
        fontFamily: fonts.heading,
        fontSize: 28,
        color: colors.text,
    },
    userCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#1A1C2A',
        marginHorizontal: 20,
        marginBottom: 20,
        padding: 20,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: 'rgba(0, 191, 255, 0.2)',
    },
    avatarContainer: {
        position: 'relative',
    },
    avatar: {
        width: 70,
        height: 70,
        borderRadius: 35,
        backgroundColor: 'rgba(0, 191, 255, 0.2)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: colors.primary,
    },
    guestBadge: {
        position: 'absolute',
        bottom: -5,
        left: 0,
        right: 0,
        backgroundColor: colors.warning,
        borderRadius: 8,
        paddingVertical: 2,
        paddingHorizontal: 6,
    },
    guestBadgeText: {
        fontFamily: fonts.heading,
        fontSize: 9,
        color: colors.background,
        textAlign: 'center',
    },
    userInfo: {
        flex: 1,
        marginLeft: 15,
    },
    userName: {
        fontFamily: fonts.heading,
        fontSize: 20,
        color: colors.text,
        marginBottom: 8,
    },
    gradeLevelButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    gradeLevel: {
        fontFamily: fonts.body,
        fontSize: 14,
        color: colors.primary,
        flex: 1,
    },
    upgradeCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(138, 43, 226, 0.1)',
        marginHorizontal: 20,
        marginBottom: 20,
        padding: 20,
        borderRadius: 15,
        borderWidth: 2,
        borderColor: colors.secondary,
    },
    upgradeIcon: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: 'rgba(138, 43, 226, 0.2)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    upgradeContent: {
        flex: 1,
        marginLeft: 15,
    },
    upgradeTitle: {
        fontFamily: fonts.heading,
        fontSize: 16,
        color: colors.secondary,
        marginBottom: 4,
    },
    upgradeSubtitle: {
        fontFamily: fonts.body,
        fontSize: 13,
        color: colors.lightGray,
        lineHeight: 18,
    },
    section: {
        marginBottom: 30,
    },
    sectionTitle: {
        fontFamily: fonts.heading,
        fontSize: 18,
        color: colors.primary,
        marginHorizontal: 20,
        marginBottom: 15,
    },
    statsGrid: {
        flexDirection: 'row',
        paddingHorizontal: 20,
        gap: 12,
        marginBottom: 15,
    },
    statCard: {
        flex: 1,
        backgroundColor: '#1A1C2A',
        borderRadius: 15,
        padding: 15,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(0, 191, 255, 0.2)',
    },
    statValue: {
        fontFamily: fonts.heading,
        fontSize: 24,
        color: colors.text,
        marginTop: 8,
    },
    statLabel: {
        fontFamily: fonts.body,
        fontSize: 12,
        color: colors.lightGray,
        marginTop: 4,
        textAlign: 'center',
    },
    subjectsCard: {
        backgroundColor: '#1A1C2A',
        marginHorizontal: 20,
        padding: 20,
        borderRadius: 15,
        borderWidth: 1,
        borderColor: 'rgba(0, 191, 255, 0.2)',
    },
    subjectsTitle: {
        fontFamily: fonts.heading,
        fontSize: 16,
        color: colors.text,
        marginBottom: 15,
    },
    subjectRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
        gap: 10,
    },
    subjectName: {
        fontFamily: fonts.body,
        fontSize: 14,
        color: colors.text,
        width: 80,
    },
    subjectBar: {
        flex: 1,
        height: 8,
        backgroundColor: 'rgba(0, 191, 255, 0.1)',
        borderRadius: 4,
        overflow: 'hidden',
    },
    subjectBarFill: {
        height: '100%',
        backgroundColor: colors.primary,
        borderRadius: 4,
    },
    subjectCount: {
        fontFamily: fonts.heading,
        fontSize: 14,
        color: colors.primary,
        width: 30,
        textAlign: 'right',
    },
    settingItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#1A1C2A',
        marginHorizontal: 20,
        marginBottom: 10,
        padding: 18,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(0, 191, 255, 0.2)',
    },
    settingLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 15,
        flex: 1,
    },
    settingText: {
        fontFamily: fonts.body,
        fontSize: 16,
        color: colors.text,
    },
    settingRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    settingValue: {
        fontFamily: fonts.body,
        fontSize: 14,
        color: colors.lightGray,
    },
    signOutButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        backgroundColor: 'rgba(255, 69, 0, 0.1)',
        marginHorizontal: 20,
        padding: 18,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: colors.warning,
    },
    signOutText: {
        fontFamily: fonts.heading,
        fontSize: 16,
        color: colors.warning,
    },
    versionText: {
        fontFamily: fonts.body,
        fontSize: 12,
        color: colors.lightGray,
        textAlign: 'center',
        marginBottom: 30,
        opacity: 0.5,
    },
});