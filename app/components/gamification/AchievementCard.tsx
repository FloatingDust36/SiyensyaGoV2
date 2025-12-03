// app/components/gamification/AchievementCard.tsx
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts } from '../../theme/theme';
import { AchievementProgress, AchievementTier } from '../../types/gamification';
import ProgressBar from './ProgressBar';

type AchievementCardProps = {
    achievement: AchievementProgress;
    onPress?: () => void;
};

const TIER_COLORS: Record<AchievementTier, string> = {
    bronze: '#CD7F32',
    silver: '#C0C0C0',
    gold: '#FFD700',
    platinum: '#E5E4E2',
};

export default function AchievementCard({ achievement, onPress }: AchievementCardProps) {
    const tierColor = TIER_COLORS[achievement.tier];
    const isLocked = !achievement.is_unlocked;

    return (
        <TouchableOpacity
            style={[
                styles.container,
                isLocked && styles.containerLocked,
                { borderColor: achievement.is_unlocked ? achievement.color : 'rgba(0, 191, 255, 0.2)' }
            ]}
            onPress={onPress}
            activeOpacity={0.7}
            disabled={!onPress}
        >
            <View style={[
                styles.iconContainer,
                { backgroundColor: `${achievement.color}${isLocked ? '10' : '20'}` }
            ]}>
                <Ionicons
                    name={achievement.icon_name as any}
                    size={32}
                    color={isLocked ? colors.lightGray : achievement.color}
                />
            </View>

            <View style={styles.content}>
                <Text style={[styles.name, isLocked && styles.textLocked]}>
                    {achievement.name}
                </Text>
                <Text style={[styles.description, isLocked && styles.textLocked]}>
                    {achievement.description}
                </Text>

                {!achievement.is_unlocked && (
                    <View style={styles.progressContainer}>
                        <ProgressBar
                            progress={achievement.progress_percentage}
                            color={achievement.color}
                            height={6}
                        />
                        <Text style={styles.progressText}>
                            {achievement.current_progress}/{achievement.requirement_value}
                        </Text>
                    </View>
                )}

                {achievement.is_unlocked && (
                    <View style={styles.unlockedBadge}>
                        <Ionicons name="checkmark-circle" size={16} color={colors.success} />
                        <Text style={styles.unlockedText}>Unlocked</Text>
                    </View>
                )}
            </View>

            {isLocked && (
                <View style={styles.lockOverlay}>
                    <Ionicons name="lock-closed" size={20} color={colors.lightGray} />
                </View>
            )}
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        backgroundColor: '#1A1C2A',
        borderRadius: 15,
        padding: 16,
        borderWidth: 2,
        marginBottom: 12,
        position: 'relative',
    },
    containerLocked: {
        opacity: 0.6,
    },
    iconContainer: {
        width: 64,
        height: 64,
        borderRadius: 32,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
        position: 'relative',
    },
    tierBadge: {
        position: 'absolute',
        bottom: -4,
        right: -4,
        width: 24,
        height: 24,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: colors.background,
    },
    content: {
        flex: 1,
    },
    name: {
        fontFamily: fonts.heading,
        fontSize: 16,
        color: colors.text,
        marginBottom: 4,
    },
    description: {
        fontFamily: fonts.body,
        fontSize: 13,
        color: colors.lightGray,
        lineHeight: 18,
        marginBottom: 8,
    },
    textLocked: {
        color: colors.lightGray,
    },
    progressContainer: {
        marginTop: 4,
    },
    progressText: {
        fontFamily: fonts.heading,
        fontSize: 11,
        color: colors.primary,
        marginTop: 4,
    },
    unlockedBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginTop: 4,
    },
    unlockedText: {
        fontFamily: fonts.heading,
        fontSize: 12,
        color: colors.success,
    },
    lockOverlay: {
        position: 'absolute',
        top: 16,
        right: 16,
    },
});