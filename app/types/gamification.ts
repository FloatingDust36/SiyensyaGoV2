// app/types/gamification.ts

export type AchievementTier = 'bronze' | 'silver' | 'gold' | 'platinum';
export type RequirementType = 'discovery_count' | 'streak' | 'category_mastery' | 'time_based';
export type LeaderboardType = 'all_time_xp' | 'all_time_discoveries' | 'weekly_xp' | 'weekly_discoveries' | 'monthly_xp' | 'category_master';
export type LeaderboardPeriod = 'weekly' | 'monthly' | 'all_time';

export type UserStats = {
    user_id: string;
    total_discoveries: number;
    discoveries_this_week: number;
    discoveries_this_month: number;
    current_streak: number;
    longest_streak: number;
    last_discovery_date: string | null;
    category_counts: Record<string, number>;
    total_xp: number;
    level: number;
    total_learning_time_minutes: number;
    average_session_duration_minutes: number;
    favorite_category: string | null;
    most_productive_hour: number | null;
    created_at: string;
    updated_at: string;
};

export type Achievement = {
    id: string;
    achievement_key: string;
    name: string;
    description: string;
    icon_name: string;
    color: string;
    category: string | null;
    requirement_type: RequirementType;
    requirement_value: number;
    xp_reward: number;
    tier: AchievementTier;
    is_secret: boolean;
    created_at: string;
};

export type UserAchievement = {
    id: string;
    user_id: string;
    achievement_id: string;
    unlocked_at: string;
    progress: number;
};

export type AchievementProgress = {
    achievement_key: string;
    name: string;
    description: string;
    icon_name: string;
    color: string;
    tier: AchievementTier;
    is_unlocked: boolean;
    current_progress: number;
    requirement_value: number;
    progress_percentage: number;
};

export type LearningSession = {
    id: string;
    user_id: string;
    session_type: 'single_discovery' | 'batch_discovery' | 'museum_review';
    objects_explored: number;
    duration_seconds: number;
    primary_category: string | null;
    time_of_day: number;
    started_at: string;
    ended_at: string | null;
    created_at: string;
};

export type DailyChallenge = {
    id: string;
    challenge_date: string;
    challenge_type: string;
    target_category: string | null;
    target_value: number;
    xp_reward: number;
    bonus_badge_id: string | null;
    title: string;
    description: string;
    icon_name: string;
    created_at: string;
};

export type UserChallengeProgress = {
    id: string;
    user_id: string;
    challenge_id: string;
    current_progress: number;
    is_completed: boolean;
    completed_at: string | null;
    created_at: string;
};

export type LeaderboardEntry = {
    rank: number;
    user_name: string;
    score: number;
    is_current_user: boolean;
};

export type LevelProgress = {
    current_level: number;
    current_xp: number;
    xp_for_next_level: number;
    progress_percentage: number;
};

export type UserStatsSummary = {
    user_id: string;
    user_name: string;
    grade_level: string;
    total_discoveries: number;
    current_streak: number;
    longest_streak: number;
    total_xp: number;
    level: number;
    favorite_category: string | null;
    category_counts: Record<string, number>;
    achievements_unlocked: number;
    total_achievements: number;
};