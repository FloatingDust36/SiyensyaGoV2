// app/screens/ProfileScreen.tsx - ENHANCED VERSION
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/types';
import { colors, fonts } from '../theme/theme';
import { useApp } from '../context/AppContext';
import StatCard from '../components/gamification/StatCard';
import ProgressBar from '../components/gamification/ProgressBar';
import { GamificationService } from '../services/gamification';
import { LevelProgress } from '../types/gamification';

type NavigationProp = StackNavigationProp<RootStackParamList>;

export default function ProfileScreen() {
    const navigation = useNavigation<NavigationProp>();
    const {
        user,
        updateUser,
        stats,
        settings,
        updateSettings,
        signOut,
        clearAllData,
        userStats,
        achievementProgress,
        refreshGamificationData
    } = useApp();

    const [levelProgress, setLevelProgress] = useState<LevelProgress | null>(null);
    const [isRefreshing, setIsRefreshing] = useState(false);

    // Load level progress
    useEffect(() => {
        loadLevelProgress();
    }, [userStats]);

    const loadLevelProgress = async () => {
        if (!user.isGuest && userStats) {
            const progress = await GamificationService.getLevelProgress(userStats.user_id);
            setLevelProgress(progress);
        }
    };

    const handleRefresh = async () => {
        setIsRefreshing(true);
        try {
            await refreshGamificationData();
            await loadLevelProgress();
        } finally {
            setIsRefreshing(false);
        }
    };

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
                    <TouchableOpacity onPress={handleRefresh} disabled={isRefreshing}>
                        {isRefreshing ? (
                            <ActivityIndicator size="small" color={colors.primary} />
                        ) : (
                            <Ionicons name="refresh" size={24} color={colors.primary} />
                        )}
                    </TouchableOpacity>
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
                                    <Text style={styles.levelNumber}>{levelProgress.current_level}</Text>
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

                    {/* Quick Actions */}
                    {!user.isGuest && (
                        <View style={styles.quickActions}>
                            <TouchableOpacity
                                style={styles.quickActionButton}
                                onPress={() => navigation.navigate('Achievements' as never)}
                            >
                                <Ionicons name="trophy" size={20} color={colors.primary} />
                                <Text style={styles.quickActionText}>View Achievements</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.quickActionButton}
                                onPress={() => navigation.navigate('Leaderboard' as never)}
                            >
                                <Ionicons name="podium" size={20} color={colors.secondary} />
                                <Text style={styles.quickActionText}>Leaderboards</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </View>

                {/* Category Distribution (Only show if there are discoveries) */}
                {stats.totalDiscoveries > 0 && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Subject Distribution</Text>
                        <View style={styles.subjectsCard}>
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
                    </View>
                )}

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

                    <TouchableOpacity
                        style={styles.settingItem}
                        onPress={() => Alert.alert('About', 'SiyensyaGo v1.0.0\n\nMaking STEM learning accessible and fun for Filipino students.\n\n© 2025 SiyensyaGo')}
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

                <Text style={styles.versionText}>Version 1.0.0</Text>
            </ScrollView>
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

    quickActions: {
        flexDirection: 'row',
        paddingHorizontal: 20,
        gap: 12
    },
    quickActionButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: '#1A1C2A',
        paddingVertical: 14,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(0, 191, 255, 0.3)'
    },
    quickActionText: { fontFamily: fonts.heading, fontSize: 13, color: colors.primary },

    subjectsCard: {
        backgroundColor: '#1A1C2A',
        marginHorizontal: 20,
        padding: 20,
        borderRadius: 15,
        borderWidth: 1,
        borderColor: 'rgba(0, 191, 255, 0.2)'
    },
    subjectRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 10 },
    subjectName: { fontFamily: fonts.body, fontSize: 14, color: colors.text, width: 80 },
    subjectBar: {
        flex: 1,
        height: 8,
        backgroundColor: 'rgba(0, 191, 255, 0.1)',
        borderRadius: 4,
        overflow: 'hidden'
    },
    subjectBarFill: {
        height: '100%',
        backgroundColor: colors.primary,
        borderRadius: 4
    },
    subjectCount: { fontFamily: fonts.heading, fontSize: 14, color: colors.primary, width: 30, textAlign: 'right' },

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