// app/screens/ProfileScreen.tsx
import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/types';
import { colors, fonts } from '../theme/theme';
import { useApp } from '../context/AppContext';
import StatCard from '../components/gamification/StatCard';
import ProgressBar from '../components/gamification/ProgressBar';
import { GamificationService } from '../services/gamification';
import { LevelProgress } from '../types/gamification';
import AboutModal from '../components/AboutModal'; // Import the new modal

type NavigationProp = StackNavigationProp<RootStackParamList>;

export default function ProfileScreen() {
    const navigation = useNavigation<NavigationProp>();
    const {
        user,
        updateUser,
        stats,
        signOut,
        clearAllData,
        userStats,
        achievementProgress,
        refreshGamificationData
    } = useApp();

    const [levelProgress, setLevelProgress] = useState<LevelProgress | null>(null);
    const [aboutVisible, setAboutVisible] = useState(false);

    // Auto-refresh when focused
    useFocusEffect(
        useCallback(() => {
            const loadData = async () => {
                if (!user.isGuest) {
                    await refreshGamificationData();
                    if (userStats) {
                        const progress = await GamificationService.getLevelProgress(userStats.user_id);
                        setLevelProgress(progress);
                    }
                }
            };
            loadData();
        }, [user.isGuest, userStats?.user_id])
    );

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
                { text: 'Create Account', onPress: () => navigation.navigate('Login' as never) }
            ]
        );
    };

    const unlockedAchievements = achievementProgress.filter(a => a.is_unlocked).length;
    const totalAchievements = achievementProgress.length;

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
                        <TouchableOpacity style={styles.gradeLevelButton} onPress={handleChangeGradeLevel}>
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
                                Sync discoveries, unlock achievements, and compete on leaderboards!
                            </Text>
                        </View>
                        <Ionicons name="chevron-forward" size={24} color={colors.primary} />
                    </TouchableOpacity>
                )}

                {/* Level & XP Section (Only for authenticated users) */}
                {!user.isGuest && userStats && levelProgress && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Level & Experience</Text>

                        <View style={styles.levelCard}>
                            <View style={styles.levelHeader}>
                                <View style={styles.levelBadge}>
                                    <Ionicons name="star" size={32} color={colors.warning} />
                                    {/* REMOVED THE NUMBER TEXT HERE */}
                                </View>
                                <View style={styles.levelInfo}>
                                    <Text style={styles.levelTitle}>Level {levelProgress.current_level}</Text>
                                    <Text style={styles.levelSubtitle}>
                                        {levelProgress.current_xp} / {levelProgress.xp_for_next_level} XP
                                    </Text>
                                </View>
                            </View>
                            <ProgressBar
                                progress={levelProgress.progress_percentage}
                                color={colors.warning}
                                height={12}
                                showLabel={true}
                                label={`Progress to Level ${levelProgress.current_level + 1}`}
                            />
                        </View>
                    </View>
                )}

                {/* Stats Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Your Stats</Text>

                    <View style={styles.statsGrid}>
                        <StatCard
                            icon="scan"
                            iconColor={colors.primary}
                            label="Discoveries"
                            value={userStats?.total_discoveries || stats.totalDiscoveries}
                            style={styles.statCard}
                        />

                        <StatCard
                            icon="flame"
                            iconColor={colors.warning}
                            label="Day Streak"
                            value={userStats?.current_streak || 0}
                            subtitle={`Best: ${userStats?.longest_streak || 0}`}
                            style={styles.statCard}
                        />

                        <StatCard
                            icon="trophy"
                            iconColor={colors.secondary}
                            label="Achievements"
                            value={`${unlockedAchievements}/${totalAchievements}`}
                            style={styles.statCard}
                        />

                        <StatCard
                            icon="star"
                            iconColor={colors.warning}
                            label="Total XP"
                            value={userStats?.total_xp || 0}
                            subtitle={`Level ${userStats?.level || 1}`}
                            style={styles.statCard}
                        />
                    </View>
                </View>

                {/* Settings Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Settings</Text>

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

                    <TouchableOpacity
                        style={styles.settingItem}
                        onPress={() => Alert.alert('Help & Support', 'Need help? Contact us at support@siyensyago.ph')}
                    >
                        <View style={styles.settingLeft}>
                            <Ionicons name="help-circle-outline" size={24} color={colors.primary} />
                            <Text style={styles.settingText}>Help & Support</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color={colors.lightGray} />
                    </TouchableOpacity>

                    {/* ADDED ABOUT BUTTON */}
                    <TouchableOpacity
                        style={styles.settingItem}
                        onPress={() => setAboutVisible(true)}
                    >
                        <View style={styles.settingLeft}>
                            <Ionicons name="information-circle-outline" size={24} color={colors.primary} />
                            <Text style={styles.settingText}>About</Text>
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
                                    text: 'Clear Data',
                                    style: 'destructive',
                                    onPress: async () => {
                                        await clearAllData();
                                        Alert.alert('Data Cleared', 'All your data has been removed.');
                                        navigation.navigate('Login' as never);
                                    }
                                }
                            ])}
                        >
                            <Ionicons name="trash-outline" size={24} color={colors.warning} />
                            <Text style={styles.signOutText}>Clear All Data</Text>
                        </TouchableOpacity>
                    )}
                </View>

                <Text style={styles.versionText}>Version 1.0.0</Text>
                <View style={{ height: 80 }} />
            </ScrollView>

            <AboutModal visible={aboutVisible} onClose={() => setAboutVisible(false)} />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    scrollView: { flex: 1 },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 20,
        paddingBottom: 10
    },
    headerTitle: { fontFamily: fonts.heading, fontSize: 28, color: colors.text },

    userCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#1A1C2A',
        marginHorizontal: 20,
        marginBottom: 20,
        padding: 20,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: 'rgba(0, 191, 255, 0.2)'
    },
    avatarContainer: { position: 'relative' },
    avatar: {
        width: 70,
        height: 70,
        borderRadius: 35,
        backgroundColor: 'rgba(0, 191, 255, 0.2)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: colors.primary
    },
    guestBadge: {
        position: 'absolute',
        bottom: -5,
        left: 0,
        right: 0,
        backgroundColor: colors.warning,
        borderRadius: 8,
        paddingVertical: 2,
        paddingHorizontal: 6
    },
    guestBadgeText: {
        fontFamily: fonts.heading,
        fontSize: 9,
        color: colors.background,
        textAlign: 'center'
    },
    userInfo: { flex: 1, marginLeft: 15 },
    userName: { fontFamily: fonts.heading, fontSize: 20, color: colors.text, marginBottom: 8 },
    gradeLevelButton: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    gradeLevel: { fontFamily: fonts.body, fontSize: 14, color: colors.primary, flex: 1 },

    upgradeCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(138, 43, 226, 0.1)',
        marginHorizontal: 20,
        marginBottom: 20,
        padding: 20,
        borderRadius: 15,
        borderWidth: 2,
        borderColor: colors.secondary
    },
    upgradeIcon: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: 'rgba(138, 43, 226, 0.2)',
        justifyContent: 'center',
        alignItems: 'center'
    },
    upgradeContent: { flex: 1, marginLeft: 15 },
    upgradeTitle: { fontFamily: fonts.heading, fontSize: 16, color: colors.secondary, marginBottom: 4 },
    upgradeSubtitle: { fontFamily: fonts.body, fontSize: 13, color: colors.lightGray, lineHeight: 18 },

    section: { marginBottom: 30 },
    sectionTitle: { fontFamily: fonts.heading, fontSize: 18, color: colors.primary, marginHorizontal: 20, marginBottom: 15 },

    levelCard: {
        backgroundColor: '#1A1C2A',
        marginHorizontal: 20,
        padding: 20,
        borderRadius: 15,
        borderWidth: 1,
        borderColor: 'rgba(255, 165, 0, 0.3)'
    },
    levelHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
    levelBadge: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: 'rgba(255, 165, 0, 0.2)',
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
        marginRight: 16
    },
    levelNumber: {
        position: 'absolute',
        fontFamily: fonts.heading,
        fontSize: 18,
        color: colors.warning,
        bottom: 4
    },
    levelInfo: { flex: 1 },
    levelTitle: { fontFamily: fonts.heading, fontSize: 20, color: colors.text, marginBottom: 4 },
    levelSubtitle: { fontFamily: fonts.body, fontSize: 14, color: colors.lightGray },

    statsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        paddingHorizontal: 20,
        gap: 12,
        marginBottom: 15
    },
    statCard: { width: '48%' },

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
        borderColor: 'rgba(0, 191, 255, 0.2)'
    },
    settingLeft: { flexDirection: 'row', alignItems: 'center', gap: 15, flex: 1 },
    settingText: { fontFamily: fonts.body, fontSize: 16, color: colors.text },
    settingRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    settingValue: { fontFamily: fonts.body, fontSize: 14, color: colors.lightGray },

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
        borderColor: colors.warning
    },
    signOutText: { fontFamily: fonts.heading, fontSize: 16, color: colors.warning },
    versionText: {
        fontFamily: fonts.body,
        fontSize: 12,
        color: colors.lightGray,
        textAlign: 'center',
        marginBottom: 30,
        opacity: 0.5
    },
});