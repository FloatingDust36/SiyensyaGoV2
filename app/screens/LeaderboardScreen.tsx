// app/screens/LeaderboardScreen.tsx
import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { colors, fonts } from '../theme/theme';
import { useApp } from '../context/AppContext';
import { GamificationService } from '../services/gamification';
import { LeaderboardEntry, LeaderboardType, LeaderboardPeriod } from '../types/gamification';

type LeaderboardTab = {
    key: LeaderboardType;
    label: string;
    icon: keyof typeof Ionicons.glyphMap;
};

const LEADERBOARD_TABS: LeaderboardTab[] = [
    { key: 'all_time_xp', label: 'All Time XP', icon: 'star' },
    { key: 'weekly_discoveries', label: 'This Week', icon: 'calendar' },
    { key: 'monthly_xp', label: 'This Month', icon: 'calendar-outline' },
];

export default function LeaderboardScreen() {
    const navigation = useNavigation();
    const { user, userStats } = useApp();

    const [activeTab, setActiveTab] = useState<LeaderboardType>('all_time_xp');
    const [leaderboardData, setLeaderboardData] = useState<LeaderboardEntry[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);

    useEffect(() => {
        loadLeaderboard();
    }, [activeTab]);

    const loadLeaderboard = async () => {
        setIsLoading(true);
        try {
            const period: LeaderboardPeriod =
                activeTab === 'weekly_discoveries' ? 'weekly' :
                    activeTab === 'monthly_xp' ? 'monthly' : 'all_time';

            const data = await GamificationService.getLeaderboard(activeTab, period, 100);
            setLeaderboardData(data);
        } catch (error) {
            console.error('Error loading leaderboard:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleRefresh = async () => {
        setIsRefreshing(true);
        await loadLeaderboard();
        setIsRefreshing(false);
    };

    const getRankMedal = (rank: number) => {
        if (rank === 1) return { icon: 'trophy' as const, color: '#FFD700' };
        if (rank === 2) return { icon: 'medal' as const, color: '#C0C0C0' };
        if (rank === 3) return { icon: 'medal' as const, color: '#CD7F32' };
        return null;
    };

    if (user.isGuest) {
        return (
            <SafeAreaView style={styles.container} edges={['top']}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()}>
                        <Ionicons name="arrow-back" size={28} color={colors.text} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Leaderboard</Text>
                    <View style={{ width: 28 }} />
                </View>

                <View style={styles.guestPrompt}>
                    <Ionicons name="podium-outline" size={80} color={colors.lightGray} />
                    <Text style={styles.guestTitle}>Leaderboards Locked</Text>
                    <Text style={styles.guestMessage}>
                        Create an account to compete with other learners and climb the ranks!
                    </Text>
                    <TouchableOpacity
                        style={styles.guestButton}
                        onPress={() => navigation.navigate('Login' as never)}
                    >
                        <Text style={styles.guestButtonText}>Create Account</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Ionicons name="arrow-back" size={28} color={colors.text} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Leaderboard</Text>
                <TouchableOpacity onPress={handleRefresh} disabled={isRefreshing}>
                    {isRefreshing ? (
                        <ActivityIndicator size="small" color={colors.primary} />
                    ) : (
                        <Ionicons name="refresh" size={24} color={colors.primary} />
                    )}
                </TouchableOpacity>
            </View>

            {/* Tabs */}
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.tabContainer}
                contentContainerStyle={styles.tabContent}
            >
                {LEADERBOARD_TABS.map((tab) => (
                    <TouchableOpacity
                        key={tab.key}
                        style={[styles.tab, activeTab === tab.key && styles.tabActive]}
                        onPress={() => setActiveTab(tab.key)}
                    >
                        <Ionicons
                            name={tab.icon}
                            size={18}
                            color={activeTab === tab.key ? colors.background : colors.lightGray}
                        />
                        <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>
                            {tab.label}
                        </Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>

            {/* Current User Rank */}
            {userStats && (
                <View style={styles.yourRankCard}>
                    <View style={styles.yourRankBadge}>
                        <Ionicons name="person" size={24} color={colors.primary} />
                    </View>
                    <View style={styles.yourRankContent}>
                        <Text style={styles.yourRankLabel}>Your Rank</Text>
                        <Text style={styles.yourRankValue}>
                            {leaderboardData.find(e => e.is_current_user)?.rank || 'Unranked'}
                        </Text>
                    </View>
                    <View style={styles.yourRankScore}>
                        <Text style={styles.yourRankScoreLabel}>
                            {activeTab.includes('xp') ? 'XP' : 'Discoveries'}
                        </Text>
                        <Text style={styles.yourRankScoreValue}>
                            {leaderboardData.find(e => e.is_current_user)?.score || 0}
                        </Text>
                    </View>
                </View>
            )}

            {/* Leaderboard List */}
            <ScrollView
                style={styles.leaderboardList}
                contentContainerStyle={styles.leaderboardContent}
                refreshControl={
                    <RefreshControl
                        refreshing={isRefreshing}
                        onRefresh={handleRefresh}
                        tintColor={colors.primary}
                    />
                }
            >
                {isLoading ? (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color={colors.primary} />
                        <Text style={styles.loadingText}>Loading leaderboard...</Text>
                    </View>
                ) : leaderboardData.length === 0 ? (
                    <View style={styles.emptyState}>
                        <Ionicons name="trophy-outline" size={64} color={colors.lightGray} />
                        <Text style={styles.emptyTitle}>No Rankings Yet</Text>
                        <Text style={styles.emptyMessage}>
                            Be the first to make discoveries and climb the leaderboard!
                        </Text>
                    </View>
                ) : (
                    leaderboardData.map((entry) => {
                        const medal = getRankMedal(entry.rank);
                        return (
                            <View
                                key={`${entry.rank}-${entry.user_name}`}
                                style={[
                                    styles.leaderboardEntry,
                                    entry.is_current_user && styles.leaderboardEntryHighlight,
                                ]}
                            >
                                {/* Rank */}
                                <View style={styles.rankContainer}>
                                    {medal ? (
                                        <Ionicons name={medal.icon} size={28} color={medal.color} />
                                    ) : (
                                        <Text style={styles.rankText}>#{entry.rank}</Text>
                                    )}
                                </View>

                                {/* User Info */}
                                <View style={styles.userInfo}>
                                    <View style={styles.userAvatar}>
                                        <Ionicons
                                            name="person"
                                            size={20}
                                            color={entry.is_current_user ? colors.primary : colors.lightGray}
                                        />
                                    </View>
                                    <Text
                                        style={[
                                            styles.userName,
                                            entry.is_current_user && styles.userNameHighlight,
                                        ]}
                                        numberOfLines={1}
                                    >
                                        {entry.user_name}
                                        {entry.is_current_user && ' (You)'}
                                    </Text>
                                </View>

                                {/* Score */}
                                <View style={styles.scoreContainer}>
                                    <Text
                                        style={[
                                            styles.scoreValue,
                                            entry.is_current_user && styles.scoreValueHighlight,
                                        ]}
                                    >
                                        {entry.score.toLocaleString()}
                                    </Text>
                                    <Text style={styles.scoreLabel}>
                                        {activeTab.includes('xp') ? 'XP' : 'items'}
                                    </Text>
                                </View>
                            </View>
                        );
                    })
                )}

                {/* Bottom Padding */}
                <View style={{ height: 40 }} />
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 15,
    },
    headerTitle: {
        fontFamily: fonts.heading,
        fontSize: 24,
        color: colors.text,
    },
    tabContainer: {
        maxHeight: 50,
        marginBottom: 15,
    },
    tabContent: {
        paddingHorizontal: 20,
        gap: 10,
    },
    tab: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: '#1A1C2A',
        borderWidth: 1,
        borderColor: 'rgba(0, 191, 255, 0.2)',
    },
    tabActive: {
        backgroundColor: colors.primary,
        borderColor: colors.primary,
    },
    tabText: {
        fontFamily: fonts.heading,
        fontSize: 13,
        color: colors.lightGray,
    },
    tabTextActive: {
        color: colors.background,
    },
    yourRankCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 191, 255, 0.1)',
        marginHorizontal: 20,
        marginBottom: 20,
        padding: 16,
        borderRadius: 15,
        borderWidth: 2,
        borderColor: colors.primary,
    },
    yourRankBadge: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: 'rgba(0, 191, 255, 0.2)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    yourRankContent: {
        flex: 1,
    },
    yourRankLabel: {
        fontFamily: fonts.body,
        fontSize: 12,
        color: colors.lightGray,
        marginBottom: 2,
    },
    yourRankValue: {
        fontFamily: fonts.heading,
        fontSize: 20,
        color: colors.text,
    },
    yourRankScore: {
        alignItems: 'flex-end',
    },
    yourRankScoreLabel: {
        fontFamily: fonts.body,
        fontSize: 11,
        color: colors.lightGray,
        marginBottom: 2,
    },
    yourRankScoreValue: {
        fontFamily: fonts.heading,
        fontSize: 18,
        color: colors.primary,
    },
    leaderboardList: {
        flex: 1,
    },
    leaderboardContent: {
        paddingHorizontal: 20,
    },
    loadingContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 60,
    },
    loadingText: {
        fontFamily: fonts.body,
        fontSize: 14,
        color: colors.lightGray,
        marginTop: 12,
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 60,
    },
    emptyTitle: {
        fontFamily: fonts.heading,
        fontSize: 20,
        color: colors.text,
        marginTop: 16,
        marginBottom: 8,
    },
    emptyMessage: {
        fontFamily: fonts.body,
        fontSize: 14,
        color: colors.lightGray,
        textAlign: 'center',
        lineHeight: 20,
        paddingHorizontal: 40,
    },
    leaderboardEntry: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#1A1C2A',
        padding: 14,
        borderRadius: 12,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: 'rgba(0, 191, 255, 0.2)',
    },
    leaderboardEntryHighlight: {
        backgroundColor: 'rgba(0, 191, 255, 0.1)',
        borderColor: colors.primary,
        borderWidth: 2,
    },
    rankContainer: {
        width: 50,
        alignItems: 'center',
        justifyContent: 'center',
    },
    rankText: {
        fontFamily: fonts.heading,
        fontSize: 18,
        color: colors.lightGray,
    },
    userInfo: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    userAvatar: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: 'rgba(0, 191, 255, 0.2)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    userName: {
        fontFamily: fonts.body,
        fontSize: 15,
        color: colors.text,
        flex: 1,
    },
    userNameHighlight: {
        fontFamily: fonts.heading,
        color: colors.primary,
    },
    scoreContainer: {
        alignItems: 'flex-end',
        minWidth: 70,
    },
    scoreValue: {
        fontFamily: fonts.heading,
        fontSize: 16,
        color: colors.text,
    },
    scoreValueHighlight: {
        color: colors.primary,
    },
    scoreLabel: {
        fontFamily: fonts.body,
        fontSize: 11,
        color: colors.lightGray,
    },
    guestPrompt: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 40,
    },
    guestTitle: {
        fontFamily: fonts.heading,
        fontSize: 24,
        color: colors.text,
        marginTop: 20,
        marginBottom: 12,
    },
    guestMessage: {
        fontFamily: fonts.body,
        fontSize: 15,
        color: colors.lightGray,
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: 30,
    },
    guestButton: {
        backgroundColor: colors.primary,
        paddingHorizontal: 32,
        paddingVertical: 14,
        borderRadius: 25,
    },
    guestButtonText: {
        fontFamily: fonts.heading,
        fontSize: 16,
        color: colors.background,
    },
});