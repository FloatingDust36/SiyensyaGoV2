// app/screens/AchievementsScreen.tsx
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
import AchievementCard from '../components/gamification/AchievementCard';
import { AchievementProgress, AchievementTier } from '../types/gamification';

type FilterType = 'all' | 'unlocked' | 'locked' | 'bronze' | 'silver' | 'gold' | 'platinum';

export default function AchievementsScreen() {
    const navigation = useNavigation();
    const { achievementProgress, refreshGamificationData, user } = useApp();

    const [activeFilter, setActiveFilter] = useState<FilterType>('all');
    const [isRefreshing, setIsRefreshing] = useState(false);

    const handleRefresh = async () => {
        setIsRefreshing(true);
        await refreshGamificationData();
        setIsRefreshing(false);
    };

    const filteredAchievements = achievementProgress.filter((achievement) => {
        if (activeFilter === 'all') return true;
        if (activeFilter === 'unlocked') return achievement.is_unlocked;
        if (activeFilter === 'locked') return !achievement.is_unlocked;
        // Tier filters
        return achievement.tier === activeFilter;
    });

    const unlockedCount = achievementProgress.filter(a => a.is_unlocked).length;
    const totalCount = achievementProgress.length;
    const completionPercentage = totalCount > 0 ? (unlockedCount / totalCount) * 100 : 0;

    const filters: { key: FilterType; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
        { key: 'all', label: 'All', icon: 'apps' },
        { key: 'unlocked', label: 'Unlocked', icon: 'checkmark-circle' },
        { key: 'locked', label: 'Locked', icon: 'lock-closed' },
        { key: 'bronze', label: 'Bronze', icon: 'medal' },
        { key: 'silver', label: 'Silver', icon: 'medal' },
        { key: 'gold', label: 'Gold', icon: 'medal' },
        { key: 'platinum', label: 'Platinum', icon: 'medal' },
    ];

    if (user.isGuest) {
        return (
            <SafeAreaView style={styles.container} edges={['top']}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()}>
                        <Ionicons name="arrow-back" size={28} color={colors.text} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Achievements</Text>
                    <View style={{ width: 28 }} />
                </View>

                <View style={styles.guestPrompt}>
                    <Ionicons name="trophy-outline" size={80} color={colors.lightGray} />
                    <Text style={styles.guestTitle}>Achievements Locked</Text>
                    <Text style={styles.guestMessage}>
                        Create an account to unlock achievements, track your progress, and compete with
                        other learners!
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
                <Text style={styles.headerTitle}>Achievements</Text>
                <TouchableOpacity onPress={handleRefresh} disabled={isRefreshing}>
                    {isRefreshing ? (
                        <ActivityIndicator size="small" color={colors.primary} />
                    ) : (
                        <Ionicons name="refresh" size={24} color={colors.primary} />
                    )}
                </TouchableOpacity>
            </View>

            {/* Progress Summary */}
            <View style={styles.summaryCard}>
                <View style={styles.summaryIconContainer}>
                    <Ionicons name="trophy" size={40} color={colors.warning} />
                </View>
                <View style={styles.summaryContent}>
                    <Text style={styles.summaryTitle}>
                        {unlockedCount} / {totalCount} Unlocked
                    </Text>
                    <View style={styles.progressBar}>
                        <View style={[styles.progressFill, { width: `${completionPercentage}%` }]} />
                    </View>
                    <Text style={styles.summarySubtitle}>{Math.round(completionPercentage)}% Complete</Text>
                </View>
            </View>

            {/* Filter Tabs */}
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.filterContainer}
                contentContainerStyle={styles.filterContent}
            >
                {filters.map((filter) => (
                    <TouchableOpacity
                        key={filter.key}
                        style={[styles.filterTab, activeFilter === filter.key && styles.filterTabActive]}
                        onPress={() => setActiveFilter(filter.key)}
                    >
                        <Ionicons
                            name={filter.icon}
                            size={18}
                            color={activeFilter === filter.key ? colors.background : colors.lightGray}
                        />
                        <Text
                            style={[
                                styles.filterTabText,
                                activeFilter === filter.key && styles.filterTabTextActive,
                            ]}
                        >
                            {filter.label}
                        </Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>

            {/* Achievements List */}
            <ScrollView
                style={styles.achievementsList}
                contentContainerStyle={styles.achievementsContent}
                refreshControl={
                    <RefreshControl
                        refreshing={isRefreshing}
                        onRefresh={handleRefresh}
                        tintColor={colors.primary}
                    />
                }
            >
                {filteredAchievements.length === 0 ? (
                    <View style={styles.emptyState}>
                        <Ionicons name="trophy-outline" size={64} color={colors.lightGray} />
                        <Text style={styles.emptyTitle}>No Achievements</Text>
                        <Text style={styles.emptyMessage}>
                            {activeFilter === 'unlocked'
                                ? 'You haven\'t unlocked any achievements yet. Keep exploring!'
                                : 'No achievements match this filter.'}
                        </Text>
                    </View>
                ) : (
                    filteredAchievements.map((achievement) => (
                        <AchievementCard
                            key={achievement.achievement_key}
                            achievement={achievement}
                        />
                    ))
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
    summaryCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#1A1C2A',
        marginHorizontal: 20,
        marginBottom: 20,
        padding: 20,
        borderRadius: 15,
        borderWidth: 1,
        borderColor: 'rgba(255, 165, 0, 0.3)',
    },
    summaryIconContainer: {
        width: 70,
        height: 70,
        borderRadius: 35,
        backgroundColor: 'rgba(255, 165, 0, 0.2)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    summaryContent: {
        flex: 1,
    },
    summaryTitle: {
        fontFamily: fonts.heading,
        fontSize: 20,
        color: colors.text,
        marginBottom: 8,
    },
    progressBar: {
        height: 8,
        backgroundColor: 'rgba(255, 165, 0, 0.2)',
        borderRadius: 4,
        overflow: 'hidden',
        marginBottom: 6,
    },
    progressFill: {
        height: '100%',
        backgroundColor: colors.warning,
        borderRadius: 4,
    },
    summarySubtitle: {
        fontFamily: fonts.body,
        fontSize: 13,
        color: colors.lightGray,
    },
    filterContainer: {
        maxHeight: 50,
        marginBottom: 15,
    },
    filterContent: {
        paddingHorizontal: 20,
        gap: 10,
    },
    filterTab: {
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
    filterTabActive: {
        backgroundColor: colors.primary,
        borderColor: colors.primary,
    },
    filterTabText: {
        fontFamily: fonts.heading,
        fontSize: 13,
        color: colors.lightGray,
    },
    filterTabTextActive: {
        color: colors.background,
    },
    achievementsList: {
        flex: 1,
    },
    achievementsContent: {
        paddingHorizontal: 20,
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