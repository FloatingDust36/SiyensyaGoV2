// app/context/AppContext.tsx
import NetInfo from '@react-native-community/netinfo';
import React, { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import { AppContextType, Discovery, UserData, AppSettings, GradeLevel, DiscoverySessionState } from './types';
import { StorageService } from '../services/storage';
import { deleteImage } from '../services/imageStorage';
import {
    supabase,
    SupabaseAuth,
    SupabaseProfile,
    SupabaseDiscoveries,
    SupabaseStorage,
    SupabaseSettings
} from '../services/supabase';
import { sessionManager } from '../utils/sessionManager';
import { DetectedObject, SceneContext } from '../navigation/types';
import { GamificationService } from '../services/gamification';
import { UserStats, AchievementProgress } from '../types/gamification';

const DEFAULT_USER: UserData = {
    isGuest: true,
    userName: 'Guest Explorer',
    gradeLevel: 'juniorHigh',
};

const DEFAULT_SETTINGS: AppSettings = {
    notificationsEnabled: true,
    soundEnabled: true,
    language: 'english',
};

// Create Context
const AppContext = createContext<AppContextType | undefined>(undefined);

// Provider Component
export function AppProvider({ children }: { children: ReactNode }) {
    const [isOnline, setIsOnline] = useState(true);
    const [isFirstLaunch, setIsFirstLaunch] = useState<boolean>(true);
    const [user, setUser] = useState<UserData>(DEFAULT_USER);
    const [discoveries, setDiscoveries] = useState<Discovery[]>([]);
    const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
    const [isLoading, setIsLoading] = useState(true);
    const [authUser, setAuthUser] = useState<any>(null);
    const [isSyncing, setIsSyncing] = useState(false);
    const [syncStatus, setSyncStatus] = useState<string>('');
    const [currentSession, setCurrentSession] = useState<DiscoverySessionState | null>(null);

    // Gamification State (NEW)
    const [userStats, setUserStats] = useState<UserStats | null>(null);
    const [achievementProgress, setAchievementProgress] = useState<AchievementProgress[]>([]);
    const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
    const [unlockedAchievement, setUnlockedAchievement] = useState<AchievementProgress | null>(null);

    // Load data on mount
    useEffect(() => {
        loadInitialData();
        const authCleanup = setupAuthListener();
        const networkCleanup = setupNetworkListener();

        // Initialize session manager and cleanup expired sessions
        initializeSessionManager();

        return () => {
            authCleanup();
            networkCleanup();
        };
    }, []);

    // Initialize Session Manager
    const initializeSessionManager = async () => {
        try {
            await sessionManager.initialize();
            const cleanedCount = await sessionManager.cleanupExpiredSessions();
            if (cleanedCount > 0) {
                console.log(`🧹 Cleaned up ${cleanedCount} expired sessions on startup`);
            }
        } catch (error) {
            console.error('Error initializing session manager:', error);
        }
    };

    // Setup Supabase auth listener
    const setupAuthListener = () => {
        const { data: authListener } = supabase.auth.onAuthStateChange(
            async (event, session) => {
                console.log('Auth event:', event);
                setAuthUser(session?.user ?? null);

                if (event === 'SIGNED_IN' && session?.user) {
                    await handleUserSignIn(session.user);
                } else if (event === 'SIGNED_OUT') {
                    await handleUserSignOut();
                }
            }
        );

        return () => {
            authListener.subscription.unsubscribe();
        };
    };

    // Setup network listener
    const setupNetworkListener = () => {
        const unsubscribe = NetInfo.addEventListener(state => {
            const online = state.isConnected ?? false;
            setIsOnline(online);

            if (online) {
                console.log('📡 Back online');
            } else {
                console.log('📡 Offline');
            }
        });

        return unsubscribe;
    };

    // Refresh Gamification Data (NEW)
    const refreshGamificationData = async () => {
        if (authUser && !user.isGuest) {
            try {
                const [stats, progress] = await Promise.all([
                    GamificationService.getUserStats(authUser.id),
                    GamificationService.getAchievementProgress(authUser.id)
                ]);

                setUserStats(stats);
                setAchievementProgress(progress);
            } catch (error) {
                console.error('Error refreshing gamification data:', error);
            }
        }
    };

    // Check Achievements (NEW)
    const checkAchievements = async () => {
        if (authUser && !user.isGuest) {
            try {
                const newlyUnlocked = await GamificationService.checkAndUnlockAchievements(authUser.id);

                if (newlyUnlocked.length > 0) {
                    console.log(`🎉 Unlocked ${newlyUnlocked.length} achievements!`);
                    await refreshGamificationData();
                }
            } catch (error) {
                console.error('Error checking achievements:', error);
            }
        }
    };

    // Handle user sign in
    const handleUserSignIn = async (supabaseUser: any) => {
        try {
            console.log('handleUserSignIn called for user:', supabaseUser.id);

            const profilePromise = SupabaseProfile.getProfile(supabaseUser.id);
            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Profile query timeout')), 3000)
            );

            let profile;
            try {
                profile = await Promise.race([profilePromise, timeoutPromise]);
            } catch (timeoutErr) {
                console.log('Profile query timed out after 3s, continuing with defaults');
                profile = null;
            }

            if (!profile) {
                console.log('No profile found for new user, creating default');
                const userData: UserData = {
                    isGuest: false,
                    userName: supabaseUser.email?.split('@')[0] || 'User',
                    email: supabaseUser.email,
                    gradeLevel: 'elementary',
                };
                setUser(userData);
                await StorageService.saveUser(userData);
                return;
            }

            const userData: UserData = {
                isGuest: false,
                userName: profile.user_name,
                email: supabaseUser.email,
                gradeLevel: profile.grade_level as GradeLevel,
            };
            setUser(userData);
            await StorageService.saveUser(userData);

            await syncFromCloud(supabaseUser.id);
            await syncSettingsFromCloud(supabaseUser.id);

            // Load gamification data (NEW)
            await refreshGamificationData();

        } catch (error) {
            console.error('Error handling sign in:', error);
            const userData: UserData = {
                isGuest: false,
                userName: supabaseUser.email?.split('@')[0] || 'User',
                email: supabaseUser.email,
                gradeLevel: 'elementary',
            };
            setUser(userData);
            await StorageService.saveUser(userData);
        }
    };

    // Handle user sign out
    const handleUserSignOut = async () => {
        setUser(DEFAULT_USER);
        await StorageService.saveUser(DEFAULT_USER);

        // Clear gamification data (NEW)
        setUserStats(null);
        setAchievementProgress([]);
        setUnlockedAchievement(null);
    };

    // Sync discoveries from cloud
    const syncFromCloud = async (userId: string) => {
        if (!userId) return;

        setIsSyncing(true);
        try {
            const cloudDiscoveries = await SupabaseDiscoveries.getDiscoveries(userId);

            const localDiscoveries: Discovery[] = cloudDiscoveries.map((d: any) => ({
                id: d.id,
                objectName: d.object_name,
                confidence: d.confidence,
                category: d.category,
                imageUri: SupabaseStorage.getImageUrl(d.image_path),
                funFact: d.fun_fact,
                the_science_in_action: d.the_science_in_action,
                why_it_matters_to_you: d.why_it_matters_to_you,
                tryThis: d.try_this,
                explore_further: d.explore_further,
                timestamp: new Date(d.created_at).getTime(),
                dateSaved: new Date(d.created_at).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric'
                }),
            }));

            setDiscoveries(localDiscoveries);
            await StorageService.saveDiscoveries(localDiscoveries);

            setSyncStatus('Sync complete!');
            setTimeout(() => setSyncStatus(''), 2000);

            console.log(`✓ Synced ${localDiscoveries.length} discoveries from cloud`);
        } catch (error) {
            console.error('Sync from cloud error:', error);
            setSyncStatus('Sync failed');
            setTimeout(() => setSyncStatus(''), 3000);
            const localDiscoveries = await StorageService.getDiscoveries();
            setDiscoveries(localDiscoveries);
        } finally {
            setIsSyncing(false);
        }
    };

    // Sync settings from cloud
    const syncSettingsFromCloud = async (userId: string) => {
        try {
            const cloudSettings = await SupabaseSettings.getSettings(userId);
            const localSettings: AppSettings = {
                notificationsEnabled: cloudSettings.notifications_enabled,
                soundEnabled: cloudSettings.sound_enabled,
                language: cloudSettings.language as 'english' | 'filipino',
            };
            setSettings(localSettings);
            await StorageService.saveSettings(localSettings);
        } catch (error) {
            console.error('Settings sync error:', error);
        }
    };

    // Load initial data
    const loadInitialData = async () => {
        try {
            setIsLoading(true);

            const session = await SupabaseAuth.getSession();

            if (session) {
                setAuthUser(session.user);
                await handleUserSignIn(session.user);
                setIsFirstLaunch(false);
            } else {
                const savedUser = await StorageService.getUser();
                if (savedUser) {
                    setUser(savedUser);
                    setIsFirstLaunch(false);
                }

                const savedDiscoveries = await StorageService.getDiscoveries();
                setDiscoveries(savedDiscoveries);

                const savedSettings = await StorageService.getSettings();
                if (savedSettings) {
                    setSettings(savedSettings);
                }
            }
        } catch (error) {
            console.error('Error loading initial data:', error);
        } finally {
            setIsLoading(false);
        }
    };

    // Update User
    const updateUser = async (userData: Partial<UserData>) => {
        try {
            const updatedUser = { ...user, ...userData };
            setUser(updatedUser);
            await StorageService.saveUser(updatedUser);

            if (authUser && !updatedUser.isGuest) {
                await SupabaseProfile.updateProfile(authUser.id, {
                    user_name: updatedUser.userName,
                    grade_level: updatedUser.gradeLevel,
                });
            }
        } catch (error) {
            console.error('Error updating user:', error);
            throw error;
        }
    };

    // Add Discovery (WITH GAMIFICATION)
    const addDiscovery = async (discoveryData: Omit<Discovery, 'id' | 'timestamp' | 'dateSaved'>) => {
        try {
            const newDiscovery: Discovery = {
                ...discoveryData,
                id: `discovery_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                timestamp: Date.now(),
                dateSaved: new Date().toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric'
                }),
            };

            await StorageService.addDiscovery(newDiscovery);
            setDiscoveries(prev => [newDiscovery, ...prev]);

            if (authUser && !user.isGuest) {
                try {
                    const imagePath = await SupabaseStorage.uploadImage(
                        discoveryData.imageUri,
                        authUser.id
                    );

                    await SupabaseDiscoveries.addDiscovery(authUser.id, {
                        object_name: newDiscovery.objectName,
                        confidence: newDiscovery.confidence,
                        category: newDiscovery.category,
                        image_path: imagePath,
                        fun_fact: newDiscovery.funFact,
                        the_science_in_action: newDiscovery.the_science_in_action,
                        why_it_matters_to_you: newDiscovery.why_it_matters_to_you,
                        try_this: newDiscovery.tryThis,
                        explore_further: newDiscovery.explore_further,
                    });

                    console.log('✓ Discovery synced to cloud');

                    // GAMIFICATION: Check for newly unlocked achievements (NEW)
                    const newlyUnlocked = await GamificationService.checkAndUnlockAchievements(authUser.id);

                    if (newlyUnlocked.length > 0) {
                        console.log(`🎉 Unlocked ${newlyUnlocked.length} achievement(s)!`);

                        // Show modal for first unlocked achievement
                        setUnlockedAchievement(newlyUnlocked[0]);

                        // Refresh gamification data
                        await refreshGamificationData();
                    }

                    // GAMIFICATION: Update leaderboards (NEW)
                    const stats = await GamificationService.getUserStats(authUser.id);
                    if (stats) {
                        await GamificationService.updateLeaderboard(
                            authUser.id,
                            'all_time_xp',
                            stats.total_xp
                        );
                        await GamificationService.updateLeaderboard(
                            authUser.id,
                            'weekly_discoveries',
                            stats.discoveries_this_week
                        );
                        await GamificationService.updateLeaderboard(
                            authUser.id,
                            'monthly_xp',
                            stats.total_xp
                        );
                    }

                } catch (cloudError) {
                    console.error('Cloud sync error (discovery still saved locally):', cloudError);
                }
            }
        } catch (error) {
            console.error('Error adding discovery:', error);
            throw error;
        }
    };

    // Remove Discovery
    const removeDiscovery = async (id: string) => {
        try {
            const discovery = discoveries.find(d => d.id === id);

            await StorageService.removeDiscovery(id);
            setDiscoveries(prev => prev.filter(d => d.id !== id));

            if (!discovery) return;

            const isCloudImage = discovery.imageUri.startsWith('http');

            if (isCloudImage) {
                if (authUser && !user.isGuest) {
                    try {
                        const urlParts = discovery.imageUri.split('/discovery-images/');
                        if (urlParts[1]) {
                            const imagePath = urlParts[1];
                            await SupabaseStorage.deleteImage(imagePath);
                            console.log('✓ Cloud image deleted:', imagePath);
                        }
                    } catch (cloudError) {
                        console.error('Cloud delete error:', cloudError);
                    }
                }
            } else {
                await deleteImage(discovery.imageUri);
                console.log('✓ Local image deleted');
            }

            if (authUser && !user.isGuest) {
                try {
                    await SupabaseDiscoveries.deleteDiscovery(id);
                    console.log('✓ Discovery deleted from cloud database');
                } catch (cloudError) {
                    console.error('Cloud database delete error:', cloudError);
                }
            }
        } catch (error) {
            console.error('Error removing discovery:', error);
            throw error;
        }
    };

    // Get Discovery by ID
    const getDiscoveryById = (id: string): Discovery | undefined => {
        return discoveries.find(d => d.id === id);
    };

    // Update Settings
    const updateSettings = async (newSettings: Partial<AppSettings>) => {
        try {
            const updatedSettings = { ...settings, ...newSettings };
            setSettings(updatedSettings);
            await StorageService.saveSettings(updatedSettings);

            if (authUser && !user.isGuest) {
                await SupabaseSettings.updateSettings(authUser.id, {
                    notifications_enabled: updatedSettings.notificationsEnabled,
                    sound_enabled: updatedSettings.soundEnabled,
                    language: updatedSettings.language,
                });
            }
        } catch (error) {
            console.error('Error updating settings:', error);
            throw error;
        }
    };

    // Calculate Stats
    const stats = React.useMemo(() => {
        const subjectDistribution: Record<string, number> = {};

        discoveries.forEach(discovery => {
            const category = discovery.category || 'Other';
            subjectDistribution[category] = (subjectDistribution[category] || 0) + 1;
        });

        const favoriteSubject = Object.entries(subjectDistribution)
            .sort(([, a], [, b]) => b - a)[0]?.[0] || 'None';

        return {
            totalDiscoveries: discoveries.length,
            streak: 0,
            subjectDistribution,
            favoriteSubject,
        };
    }, [discoveries]);

    // Clear All Data
    const clearAllData = async () => {
        try {
            for (const discovery of discoveries) {
                if (discovery.imageUri) {
                    await deleteImage(discovery.imageUri);
                }
            }

            await StorageService.clearAll();
            setUser(DEFAULT_USER);
            setDiscoveries([]);
            setSettings(DEFAULT_SETTINGS);

            // Clear gamification data (NEW)
            setUserStats(null);
            setAchievementProgress([]);
            setUnlockedAchievement(null);
        } catch (error) {
            console.error('Error clearing data:', error);
            throw error;
        }
    };

    // Sign Out
    const signOut = async () => {
        try {
            if (!user.isGuest && authUser) {
                await SupabaseAuth.signOut();
            }

            const guestUser: UserData = {
                isGuest: true,
                userName: 'Guest Explorer',
                gradeLevel: user.gradeLevel,
            };
            setUser(guestUser);
            await StorageService.saveUser(guestUser);

            setDiscoveries([]);
            await StorageService.saveDiscoveries([]);

            // Clear gamification data (NEW)
            setUserStats(null);
            setAchievementProgress([]);
            setUnlockedAchievement(null);
        } catch (error) {
            console.error('Error signing out:', error);
            throw error;
        }
    };

    // Create Session
    const createSession = async (
        imageUri: string,
        objects: DetectedObject[],
        context?: SceneContext
    ): Promise<string> => {
        try {
            const sessionId = await sessionManager.createSession(imageUri, objects, context);
            const session = await sessionManager.getSession(sessionId);
            if (session) {
                setCurrentSession(session);
                console.log(`✓ Session ${sessionId} created and set as current`);
            }
            return sessionId;
        } catch (error) {
            console.error('Error creating session:', error);
            throw error;
        }
    };

    // Get Session
    const getSession = (sessionId: string): DiscoverySessionState | null => {
        sessionManager.getSession(sessionId).then(session => {
            if (session) {
                setCurrentSession(session);
            }
        });
        return currentSession;
    };

    // Mark Object as Explored
    const markObjectAsExplored = (sessionId: string, objectId: string): void => {
        sessionManager.markObjectAsExplored(sessionId, objectId).then(() => {
            sessionManager.getSession(sessionId).then(session => {
                if (session) {
                    setCurrentSession(session);
                }
            });
        });
    };

    // Clear Expired Sessions
    const clearExpiredSessions = (): void => {
        sessionManager.cleanupExpiredSessions();
    };

    // Start Learning Session (NEW)
    const startLearningSession = async (
        sessionType: 'single_discovery' | 'batch_discovery' | 'museum_review'
    ): Promise<string | null> => {
        if (authUser && !user.isGuest) {
            const sessionId = await GamificationService.startLearningSession(authUser.id, sessionType);
            setActiveSessionId(sessionId);
            return sessionId;
        }
        return null;
    };

    // End Learning Session (NEW)
    const endLearningSession = async (
        objectsExplored: number,
        primaryCategory: string | null
    ): Promise<void> => {
        if (authUser && !user.isGuest && activeSessionId) {
            await GamificationService.endLearningSession(activeSessionId, objectsExplored, primaryCategory);
            setActiveSessionId(null);
        }
    };

    // CONTEXT VALUE
    const contextValue: AppContextType = {
        // User
        user,
        updateUser,

        // Discoveries
        discoveries,
        addDiscovery,
        removeDiscovery,
        getDiscoveryById,

        // Sessions
        currentSession,
        createSession,
        getSession,
        markObjectAsExplored,
        clearExpiredSessions,

        // Settings
        settings,
        updateSettings,

        // Stats
        stats,

        // Actions
        clearAllData,
        signOut,

        // State
        isLoading: isLoading || isSyncing,
        isFirstLaunch,
        isOnline,
        syncStatus,

        // Gamification (NEW)
        userStats,
        achievementProgress,
        refreshGamificationData,
        checkAchievements,

        // Session Tracking (NEW)
        startLearningSession,
        endLearningSession,

        // Achievement Modal (NEW)
        unlockedAchievement,
        setUnlockedAchievement,
    };

    return (
        <AppContext.Provider value={contextValue}>
            {children}
        </AppContext.Provider>
    );
}

// Custom Hook
export function useApp() {
    const context = useContext(AppContext);
    if (context === undefined) {
        throw new Error('useApp must be used within an AppProvider');
    }
    return context;
}