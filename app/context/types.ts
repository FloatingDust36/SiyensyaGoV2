// app/context/types.ts
import { DetectedObject, SceneContext } from '../navigation/types';
import { UserStats, AchievementProgress } from '../types/gamification';

export type GradeLevel = 'elementary' | 'juniorHigh' | 'seniorHigh';

export type UserData = {
    isGuest: boolean;
    userName: string;
    email?: string;
    gradeLevel: GradeLevel;
};

export type AppSettings = {
    notificationsEnabled: boolean;
    soundEnabled: boolean;
    language: 'english' | 'filipino';
};

export type Discovery = {
    id: string;
    objectName: string;
    confidence: number;
    category: string;
    imageUri: string;
    funFact: string;
    the_science_in_action: string;
    why_it_matters_to_you: string;
    tryThis: string;
    explore_further: string;
    timestamp: number;
    dateSaved: string;

    sessionId?: string;
    fullImageUri?: string;
    boundingBox?: {
        x: number;
        y: number;
        width: number;
        height: number;
    };
};

export type DiscoverySessionState = {
    sessionId: string;
    fullImageUri: string;
    detectedObjects: DetectedObject[];
    exploredObjectIds: string[];
    context?: SceneContext;
    createdAt: number;
    expiresAt: number;
};

export type AppContextType = {
    // User
    user: UserData;
    updateUser: (userData: Partial<UserData>) => Promise<void>;

    // Discoveries
    discoveries: Discovery[];
    addDiscovery: (discovery: Omit<Discovery, 'id' | 'timestamp' | 'dateSaved'>) => Promise<void>;
    removeDiscovery: (id: string) => Promise<void>;
    getDiscoveryById: (id: string) => Discovery | undefined;

    // Discovery Sessions
    currentSession: DiscoverySessionState | null;
    createSession: (imageUri: string, objects: DetectedObject[], context?: SceneContext) => Promise<string>;
    getSession: (sessionId: string) => DiscoverySessionState | null;
    markObjectAsExplored: (sessionId: string, objectId: string) => void;
    clearExpiredSessions: () => void;

    // Settings
    settings: AppSettings;
    updateSettings: (settings: Partial<AppSettings>) => Promise<void>;

    // Stats (computed)
    stats: {
        totalDiscoveries: number;
        streak: number;
        subjectDistribution: Record<string, number>;
        favoriteSubject: string;
    };

    // Actions
    clearAllData: () => Promise<void>;
    signOut: () => Promise<void>;

    // Loading state
    isLoading: boolean;
    isFirstLaunch: boolean;
    isOnline: boolean;
    syncStatus: string;

    // Gamification (NEW)
    userStats: UserStats | null;
    achievementProgress: AchievementProgress[];
    refreshGamificationData: () => Promise<void>;
    checkAchievements: () => Promise<void>;

    // Session Tracking (NEW)
    startLearningSession: (sessionType: 'single_discovery' | 'batch_discovery' | 'museum_review') => Promise<string | null>;
    endLearningSession: (objectsExplored: number, primaryCategory: string | null) => Promise<void>;

    // Achievement Modal (NEW)
    unlockedAchievement: AchievementProgress | null;
    setUnlockedAchievement: (achievement: AchievementProgress | null) => void;
};