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
            return data as LevelProgress | null;
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
            const [achievements, stats, userAchievementsResult] = await Promise.all([
                this.getAllAchievements(),
                this.getUserStats(userId),
                supabase.from('user_achievements').select('achievement_id').eq('user_id', userId)
            ]);

            if (!stats) {
                console.error("Could not fetch user stats, cannot calculate achievement progress.");
                return [];
            }

            if (userAchievementsResult.error) {
                console.error("Error fetching user achievements:", userAchievementsResult.error);
                // Decide if you want to return [] or throw the error
                return [];
            }

            const unlockedAchievementIds = new Set(userAchievementsResult.data?.map(ua => ua.achievement_id) || []);

            const progressList: AchievementProgress[] = achievements.map(achievement => {
                const isUnlocked = unlockedAchievementIds.has(achievement.id);

                let currentProgress = 0;
                // Determine current progress based on the achievement's requirement type
                switch (achievement.requirement_type) {
                    case 'discovery_count':
                        currentProgress = stats.total_discoveries;
                        break;
                    case 'streak':
                        currentProgress = stats.current_streak;
                        break;
                    case 'category_mastery':
                        if (achievement.category && stats.category_counts) {
                            const categoryCounts = stats.category_counts as Record<string, number>;
                            currentProgress = categoryCounts[achievement.category] || 0;
                        }
                        break;
                    case 'time_based':
                        // Assuming time_based requirement is in minutes
                        currentProgress = stats.total_learning_time_minutes;
                        break;
                }

                // If an achievement is unlocked, its progress is considered complete.
                // Otherwise, use the calculated current progress, capped at the requirement value.
                const finalProgress = isUnlocked ? achievement.requirement_value : Math.min(currentProgress, achievement.requirement_value);

                // Calculate the progress percentage, ensuring it doesn't exceed 100%
                const progressPercentage = achievement.requirement_value > 0
                    ? Math.min(100, (finalProgress / achievement.requirement_value) * 100)
                    : isUnlocked ? 100 : 0;

                return {
                    achievement_key: achievement.achievement_key,
                    name: achievement.name,
                    description: achievement.description,
                    icon_name: achievement.icon_name,
                    color: achievement.color,
                    tier: achievement.tier,
                    is_unlocked: isUnlocked,
                    current_progress: finalProgress,
                    requirement_value: achievement.requirement_value,
                    progress_percentage: progressPercentage,
                    xp_reward: achievement.xp_reward
                };
            });

            return progressList;

        } catch (error) {
            console.error('Error calculating achievement progress:', error);
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
            let finalProgress: number;  // ← NEW: Track the final progress value

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
                finalProgress = progressIncrement;
            } else {
                // Update existing progress
                const newProgress = currentProgress.current_progress + progressIncrement;
                finalProgress = newProgress;

                const { error } = await supabase
                    .from('user_challenge_progress')
                    .update({ current_progress: newProgress })
                    .eq('id', currentProgress.id);

                if (error) throw error;
            }

            // Check if challenge is complete using finalProgress
            const challenge = await this.getTodayChallenge();
            if (challenge && finalProgress >= challenge.target_value) {
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
            // Get current user ID
            const { data: { user: currentUser } } = await supabase.auth.getUser();
            const currentUserId = currentUser?.id;

            // Workaround: Query leaderboard_entries directly instead of using RPC
            // to avoid enum type casting issues in the database function

            // Calculate period_key based on period
            const periodKey =
                period === 'weekly'
                    ? new Date().toISOString().slice(0, 10).replace(/-/g, '') + 'W'
                    : period === 'monthly'
                        ? new Date().toISOString().slice(0, 7)
                        : 'all_time';

            // Query leaderboard entries (without join to avoid syntax issues)
            const { data: entriesData, error: entriesError } = await supabase
                .from('leaderboard_entries')
                .select('user_id, score')
                .eq('leaderboard_type', type as any) // Cast to any to bypass enum type check
                .eq('period', period)
                .eq('period_key', periodKey)
                .order('score', { ascending: false })
                .limit(limit);

            if (entriesError) {
                // If direct query fails, try RPC as fallback (might still fail with enum issue)
                console.warn('Direct query failed, trying RPC:', entriesError);
                try {
                    const { data: rpcData, error: rpcError } = await supabase.rpc('get_leaderboard', {
                        board_type: type,
                        board_period: period,
                        limit_count: limit
                    });

                    if (rpcError) throw rpcError;
                    return rpcData || [];
                } catch (rpcError) {
                    console.error('RPC also failed:', rpcError);
                    return [];
                }
            }

            if (!entriesData || entriesData.length === 0) {
                return [];
            }

            // Fetch user names separately
            const userIds = entriesData.map(e => e.user_id);
            const { data: profilesData } = await supabase
                .from('profiles')
                .select('id, user_name')
                .in('id', userIds);

            const profilesMap = new Map(
                (profilesData || []).map(p => [p.id, p.user_name])
            );

            // Transform data to LeaderboardEntry format
            const entries: LeaderboardEntry[] = entriesData.map((entry: any, index: number) => ({
                rank: index + 1,
                user_name: profilesMap.get(entry.user_id) || 'Unknown User',
                score: entry.score || 0,
                is_current_user: currentUserId ? entry.user_id === currentUserId : false
            }));

            return entries;
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