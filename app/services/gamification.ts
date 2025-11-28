// app/services/gamification.ts

import { supabase } from './supabase';
import {
    UserStats,
    Achievement,
    AchievementProgress,
    LearningSession,
    DailyChallenge,
    UserChallengeProgress,
    LeaderboardEntry,
    LevelProgress,
    UserStatsSummary,
    LeaderboardType,
    LeaderboardPeriod
} from '../types/gamification';

export const GamificationService = {
    // ========================================
    // USER STATS
    // ========================================

    async getUserStats(userId: string): Promise<UserStats | null> {
        try {
            const { data, error } = await supabase
                .from('user_stats')
                .select('*')
                .eq('user_id', userId)
                .single();

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error fetching user stats:', error);
            return null;
        }
    },

    async getUserStatsSummary(userId: string): Promise<UserStatsSummary | null> {
        try {
            const { data, error } = await supabase
                .from('user_stats_summary')
                .select('*')
                .eq('user_id', userId)
                .single();

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error fetching user stats summary:', error);
            return null;
        }
    },

    async getLevelProgress(userId: string): Promise<LevelProgress | null> {
        try {
            const { data, error } = await supabase
                .rpc('get_level_progress', { user_uuid: userId })
                .single();

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error fetching level progress:', error);
            return null;
        }
    },

    // ========================================
    // ACHIEVEMENTS
    // ========================================

    async getAllAchievements(): Promise<Achievement[]> {
        try {
            const { data, error } = await supabase
                .from('achievements')
                .select('*')
                .order('tier', { ascending: true })
                .order('requirement_value', { ascending: true });

            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Error fetching achievements:', error);
            return [];
        }
    },

    async getAchievementProgress(userId: string): Promise<AchievementProgress[]> {
        try {
            const { data, error } = await supabase
                .rpc('get_achievement_progress', { user_uuid: userId });

            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Error fetching achievement progress:', error);
            return [];
        }
    },

    async checkAndUnlockAchievements(userId: string): Promise<AchievementProgress[]> {
        try {
            // Get current progress
            const progressList = await this.getAchievementProgress(userId);

            // Find achievements that should be unlocked but aren't
            const toUnlock = progressList.filter(
                (p) => !p.is_unlocked && p.current_progress >= p.requirement_value
            );

            // Unlock each achievement
            for (const achievement of toUnlock) {
                await this.unlockAchievement(userId, achievement.achievement_key);
            }

            return toUnlock;
        } catch (error) {
            console.error('Error checking achievements:', error);
            return [];
        }
    },

    async unlockAchievement(userId: string, achievementKey: string): Promise<boolean> {
        try {
            // Get achievement ID
            const { data: achievement, error: achError } = await supabase
                .from('achievements')
                .select('id, xp_reward')
                .eq('achievement_key', achievementKey)
                .single();

            if (achError || !achievement) {
                console.error('Achievement not found:', achievementKey);
                return false;
            }

            // Insert user achievement
            const { error: unlockError } = await supabase
                .from('user_achievements')
                .insert({
                    user_id: userId,
                    achievement_id: achievement.id,
                    progress: 100.0
                });

            if (unlockError) {
                // If duplicate, it's already unlocked (ignore error)
                if (unlockError.code === '23505') {
                    return false;
                }
                throw unlockError;
            }

            // Award XP
            if (achievement.xp_reward > 0) {
                const { error: xpError } = await supabase.rpc('add_xp_to_user', {
                    user_uuid: userId,
                    xp_amount: achievement.xp_reward
                });

                if (xpError) console.error('Error awarding XP:', xpError);
            }

            console.log(`✓ Achievement unlocked: ${achievementKey}`);
            return true;
        } catch (error) {
            console.error('Error unlocking achievement:', error);
            return false;
        }
    },

    // ========================================
    // LEARNING SESSIONS
    // ========================================

    async startLearningSession(
        userId: string,
        sessionType: 'single_discovery' | 'batch_discovery' | 'museum_review'
    ): Promise<string | null> {
        try {
            const currentHour = new Date().getHours();

            const { data, error } = await supabase
                .from('learning_sessions')
                .insert({
                    user_id: userId,
                    session_type: sessionType,
                    time_of_day: currentHour,
                    started_at: new Date().toISOString()
                })
                .select('id')
                .single();

            if (error) throw error;
            return data.id;
        } catch (error) {
            console.error('Error starting learning session:', error);
            return null;
        }
    },

    async endLearningSession(
        sessionId: string,
        objectsExplored: number,
        primaryCategory: string | null
    ): Promise<boolean> {
        try {
            // Get session start time
            const { data: session, error: fetchError } = await supabase
                .from('learning_sessions')
                .select('started_at')
                .eq('id', sessionId)
                .single();

            if (fetchError || !session) throw fetchError;

            // Calculate duration
            const startTime = new Date(session.started_at);
            const endTime = new Date();
            const durationSeconds = Math.floor((endTime.getTime() - startTime.getTime()) / 1000);

            // Update session
            const { error: updateError } = await supabase
                .from('learning_sessions')
                .update({
                    objects_explored: objectsExplored,
                    primary_category: primaryCategory,
                    duration_seconds: durationSeconds,
                    ended_at: endTime.toISOString()
                })
                .eq('id', sessionId);

            if (updateError) throw updateError;

            console.log(`✓ Learning session ended: ${durationSeconds}s, ${objectsExplored} objects`);
            return true;
        } catch (error) {
            console.error('Error ending learning session:', error);
            return false;
        }
    },

    async getRecentSessions(userId: string, limit: number = 10): Promise<LearningSession[]> {
        try {
            const { data, error } = await supabase
                .from('learning_sessions')
                .select('*')
                .eq('user_id', userId)
                .order('started_at', { ascending: false })
                .limit(limit);

            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Error fetching recent sessions:', error);
            return [];
        }
    },

    // ========================================
    // DAILY CHALLENGES
    // ========================================

    async getTodayChallenge(): Promise<DailyChallenge | null> {
        try {
            const today = new Date().toISOString().split('T')[0];

            const { data, error } = await supabase
                .from('daily_challenges')
                .select('*')
                .eq('challenge_date', today)
                .single();

            if (error) {
                // No challenge for today
                if (error.code === 'PGRST116') return null;
                throw error;
            }

            return data;
        } catch (error) {
            console.error('Error fetching daily challenge:', error);
            return null;
        }
    },

    async getChallengeProgress(
        userId: string,
        challengeId: string
    ): Promise<UserChallengeProgress | null> {
        try {
            const { data, error } = await supabase
                .from('user_challenge_progress')
                .select('*')
                .eq('user_id', userId)
                .eq('challenge_id', challengeId)
                .single();

            if (error) {
                if (error.code === 'PGRST116') return null;
                throw error;
            }

            return data;
        } catch (error) {
            console.error('Error fetching challenge progress:', error);
            return null;
        }
    },

    async updateChallengeProgress(
        userId: string,
        challengeId: string,
        progressIncrement: number
    ): Promise<boolean> {
        try {
            // Get current progress
            let currentProgress = await this.getChallengeProgress(userId, challengeId);

            if (!currentProgress) {
                // Create new progress record
                const { data, error } = await supabase
                    .from('user_challenge_progress')
                    .insert({
                        user_id: userId,
                        challenge_id: challengeId,
                        current_progress: progressIncrement
                    })
                    .select()
                    .single();

                if (error) throw error;
                currentProgress = data;
            } else {
                // Update existing progress
                const newProgress = currentProgress.current_progress + progressIncrement;

                const { error } = await supabase
                    .from('user_challenge_progress')
                    .update({ current_progress: newProgress })
                    .eq('id', currentProgress.id);

                if (error) throw error;
            }

            // Check if challenge is complete
            const challenge = await this.getTodayChallenge();
            if (challenge && currentProgress.current_progress >= challenge.target_value) {
                await this.completeDailyChallenge(userId, challengeId);
            }

            return true;
        } catch (error) {
            console.error('Error updating challenge progress:', error);
            return false;
        }
    },

    async completeDailyChallenge(userId: string, challengeId: string): Promise<boolean> {
        try {
            const { error } = await supabase
                .from('user_challenge_progress')
                .update({
                    is_completed: true,
                    completed_at: new Date().toISOString()
                })
                .eq('user_id', userId)
                .eq('challenge_id', challengeId);

            if (error) throw error;

            // Award XP
            const challenge = await this.getTodayChallenge();
            if (challenge && challenge.xp_reward > 0) {
                // XP will be awarded by trigger or manual update
                console.log(`✓ Daily challenge completed! +${challenge.xp_reward} XP`);
            }

            return true;
        } catch (error) {
            console.error('Error completing daily challenge:', error);
            return false;
        }
    },

    // ========================================
    // LEADERBOARDS
    // ========================================

    async getLeaderboard(
        type: LeaderboardType = 'all_time_xp',
        period: LeaderboardPeriod = 'all_time',
        limit: number = 100
    ): Promise<LeaderboardEntry[]> {
        try {
            const { data, error } = await supabase.rpc('get_leaderboard', {
                board_type: type,
                board_period: period,
                limit_count: limit
            });

            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Error fetching leaderboard:', error);
            return [];
        }
    },

    async updateLeaderboard(
        userId: string,
        type: LeaderboardType,
        score: number
    ): Promise<boolean> {
        try {
            const period: LeaderboardPeriod = type.includes('weekly')
                ? 'weekly'
                : type.includes('monthly')
                    ? 'monthly'
                    : 'all_time';

            const periodKey =
                period === 'weekly'
                    ? new Date().toISOString().slice(0, 10).replace(/-/g, '') + 'W'
                    : period === 'monthly'
                        ? new Date().toISOString().slice(0, 7)
                        : 'all_time';

            const { error } = await supabase
                .from('leaderboard_entries')
                .upsert(
                    {
                        user_id: userId,
                        leaderboard_type: type,
                        period: period,
                        period_key: periodKey,
                        score: score,
                        updated_at: new Date().toISOString()
                    },
                    { onConflict: 'user_id,leaderboard_type,period_key' }
                );

            if (error) throw error;
            return true;
        } catch (error) {
            console.error('Error updating leaderboard:', error);
            return false;
        }
    }
};