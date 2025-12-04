// app/context/AppContext.tsx
import NetInfo from '@react-native-community/netinfo';
import React, { createContext, useState, useEffect, useContext, ReactNode, useRef } from 'react';
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
    hasCompletedOnboarding: false,
};

const DEFAULT_SETTINGS: AppSettings = {
    notificationsEnabled: true,
    soundEnabled: true,
    language: 'english',
};

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
    const [isOnline, setIsOnline] = useState(true);
    const [isFirstLaunch, setIsFirstLaunch] = useState<boolean>(true);
    const [user, setUser] = useState<UserData>(DEFAULT_USER);
    const [discoveries, setDiscoveries] = useState<Discovery[]>([]);
    const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
    const [isLoading, setIsLoading] = useState(true);
    const [authUser, setAuthUser] = useState<any>(null);
    const [syncStatus, setSyncStatus] = useState<string>('');
    const [currentSession, setCurrentSession] = useState<DiscoverySessionState | null>(null);

    // Gamification State
    const [userStats, setUserStats] = useState<UserStats | null>(null);
    const [achievementProgress, setAchievementProgress] = useState<AchievementProgress[]>([]);
    const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
    const [unlockedAchievement, setUnlockedAchievement] = useState<AchievementProgress | null>(null);

    const wasOnline = useRef(true);

    useEffect(() => {
        loadInitialData();
        const authCleanup = setupAuthListener();
        const networkCleanup = setupNetworkListener();
        initializeSessionManager();

        return () => {
            authCleanup();
            networkCleanup();
        };
    }, []);

    const initializeSessionManager = async () => {
        try {
            await sessionManager.initialize();
            await sessionManager.cleanupExpiredSessions();
        } catch (error) {
            console.error('Error initializing session manager:', error);
        }
    };

    const setupAuthListener = () => {
        const { data: authListener } = supabase.auth.onAuthStateChange(
            async (event, session) => {
                console.log(`🔐 Auth event: ${event}`);

                if (session?.user) {
                    setAuthUser(session.user);
                } else {
                    setAuthUser(null);
                }

                if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
                    if (session?.user) {
                        await handleUserSignIn(session.user);
                    }
                } else if (event === 'SIGNED_OUT') {
                    await handleUserSignOut();
                }

                setIsLoading(false);
            }
        );

        return () => {
            authListener.subscription.unsubscribe();
        };
    };

    const setupNetworkListener = () => {
        const unsubscribe = NetInfo.addEventListener(state => {
            const online = state.isConnected ?? false;
            if (online !== wasOnline.current) {
                setIsOnline(online);
                if (online && authUser) syncFromCloud(authUser.id);
                wasOnline.current = online;
            }
        });
        return unsubscribe;
    };

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

    const checkAchievements = async () => {
        if (authUser && !user.isGuest) {
            try {
                const newlyUnlocked = await GamificationService.checkAndUnlockAchievements(authUser.id);
                if (newlyUnlocked.length > 0) {
                    setUnlockedAchievement(newlyUnlocked[0]);
                    await refreshGamificationData();
                }
            } catch (error) {
                console.error('Error checking achievements:', error);
            }
        }
    };

    // --- CORE AUTH LOGIC ---
    const handleUserSignIn = async (supabaseUser: any) => {
        try {
            console.log('handleUserSignIn called for user:', supabaseUser.id);

            // Fetch profile with timeout to prevent hanging
            const profilePromise = SupabaseProfile.getProfile(supabaseUser.id);
            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Profile query timeout')), 3000)
            );

            let profile: any = null;
            try {
                profile = await Promise.race([profilePromise, timeoutPromise]);
            } catch (err) {
                console.log('Profile fetch timed out or failed, treating as new/incomplete user');
            }

            let userData: UserData;

            if (profile) {
                // EXISTING USER: Use stored onboarding status
                // If has_completed_onboarding is true -> RootNavigator goes to MainTabs
                // If false -> RootNavigator goes to GradeLevel
                userData = {
                    isGuest: false,
                    userName: profile.user_name || supabaseUser.email?.split('@')[0],
                    email: supabaseUser.email,
                    gradeLevel: (profile.grade_level as GradeLevel) || 'juniorHigh',
                    hasCompletedOnboarding: profile.has_completed_onboarding === true,
                };
            } else {
                // NEW USER: Force onboarding = false
                // This ensures RootNavigator sends them to GradeLevelScreen first
                userData = {
                    isGuest: false,
                    userName: supabaseUser.user_metadata?.full_name || supabaseUser.email?.split('@')[0] || 'Explorer',
                    email: supabaseUser.email,
                    gradeLevel: 'juniorHigh',
                    hasCompletedOnboarding: false,
                };
            }

            setUser(userData);
            await StorageService.saveUser(userData);

            const localDiscoveries = await StorageService.getDiscoveries();
            setDiscoveries(localDiscoveries);

            // Only sync deep data if we have a valid profile
            if (profile) {
                await syncFromCloud(supabaseUser.id);
                await syncSettingsFromCloud(supabaseUser.id);
                await refreshGamificationData();
            }

        } catch (error) {
            console.error('Error handling sign in:', error);
            const userData: UserData = {
                isGuest: false,
                userName: 'Explorer',
                gradeLevel: 'juniorHigh',
                hasCompletedOnboarding: false
            };
            setUser(userData);
        }
    };

    const handleUserSignOut = async () => {
        // Reset to DEFAULT_USER immediately.
        // DEFAULT_USER has isGuest: true, hasCompletedOnboarding: false
        setUser(DEFAULT_USER);
        await StorageService.saveUser(DEFAULT_USER);
        setDiscoveries([]);
        setUserStats(null);
        setAchievementProgress([]);
    };

    const syncFromCloud = async (userId: string) => {
        setSyncStatus('Syncing...');
        try {
            const cloudDiscoveries = await SupabaseDiscoveries.getDiscoveries(userId);

            if (cloudDiscoveries && cloudDiscoveries.length > 0) {
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
                    dateSaved: new Date(d.created_at).toISOString(),
                }));
                setDiscoveries(localDiscoveries);
                await StorageService.saveDiscoveries(localDiscoveries);
            }
            setSyncStatus('');
        } catch (error) {
            console.error('Sync error:', error);
            setSyncStatus('Sync failed');
        }
    };

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

    const loadInitialData = async () => {
        try {
            const savedUser = await StorageService.getUser();
            if (savedUser) {
                if (!authUser) setUser(savedUser);
            }
            const savedDiscoveries = await StorageService.getDiscoveries();
            setDiscoveries(savedDiscoveries);
            const savedSettings = await StorageService.getSettings();
            if (savedSettings) setSettings(savedSettings);
        } catch (error) {
            console.error('Error loading local data:', error);
            setIsLoading(false);
        }
    };

    const updateUser = async (userData: Partial<UserData>) => {
        try {
            const updatedUser = { ...user, ...userData };
            setUser(updatedUser);
            await StorageService.saveUser(updatedUser);

            if (authUser && !updatedUser.isGuest) {
                await SupabaseProfile.updateProfile(authUser.id, {
                    user_name: updatedUser.userName,
                    grade_level: updatedUser.gradeLevel,
                    has_completed_onboarding: updatedUser.hasCompletedOnboarding,
                });
            }
        } catch (error) {
            console.error('Error updating user:', error);
            throw error;
        }
    };

    const addDiscovery = async (discoveryData: Omit<Discovery, 'id' | 'timestamp' | 'dateSaved'>) => {
        try {
            const newDiscovery: Discovery = {
                ...discoveryData,
                id: `discovery_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                timestamp: Date.now(),
                dateSaved: new Date().toISOString(),
            };

            await StorageService.addDiscovery(newDiscovery);
            setDiscoveries(prev => [newDiscovery, ...prev]);

            if (authUser && !user.isGuest) {
                try {
                    const imagePath = await SupabaseStorage.uploadImage(discoveryData.imageUri, authUser.id);
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

                    const newlyUnlocked = await GamificationService.checkAndUnlockAchievements(authUser.id);
                    if (newlyUnlocked.length > 0) {
                        setUnlockedAchievement(newlyUnlocked[0]);
                        await refreshGamificationData();
                    }

                    const stats = await GamificationService.getUserStats(authUser.id);
                    if (stats) {
                        await GamificationService.updateLeaderboard(authUser.id, 'all_time_xp', stats.total_xp);
                    }
                } catch (cloudError) {
                    console.error('Cloud sync error:', cloudError);
                }
            }
        } catch (error) {
            console.error('Error adding discovery:', error);
            throw error;
        }
    };

    const removeDiscovery = async (id: string) => {
        try {
            const discovery = discoveries.find(d => d.id === id);
            await StorageService.removeDiscovery(id);
            setDiscoveries(prev => prev.filter(d => d.id !== id));

            if (!discovery) return;

            if (discovery.imageUri.startsWith('http') && authUser && !user.isGuest) {
                const urlParts = discovery.imageUri.split('/discovery-images/');
                if (urlParts[1]) await SupabaseStorage.deleteImage(urlParts[1]);
            } else {
                await deleteImage(discovery.imageUri);
            }

            if (authUser && !user.isGuest) {
                await SupabaseDiscoveries.deleteDiscovery(id);
            }
        } catch (error) {
            console.error('Error removing discovery:', error);
            throw error;
        }
    };

    const getDiscoveryById = (id: string) => discoveries.find(d => d.id === id);

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
        }
    };

    const stats = React.useMemo(() => {
        const subjectDistribution: Record<string, number> = {};
        discoveries.forEach(discovery => {
            const category = discovery.category || 'Other';
            subjectDistribution[category] = (subjectDistribution[category] || 0) + 1;
        });
        const favoriteSubject = Object.entries(subjectDistribution).sort(([, a], [, b]) => b - a)[0]?.[0] || 'None';
        return { totalDiscoveries: discoveries.length, streak: 0, subjectDistribution, favoriteSubject };
    }, [discoveries]);

    const clearAllData = async () => {
        try {
            for (const discovery of discoveries) {
                if (discovery.imageUri) await deleteImage(discovery.imageUri);
            }
            await StorageService.clearAll();
            setUser(DEFAULT_USER);
            setDiscoveries([]);
            setSettings(DEFAULT_SETTINGS);
            setUserStats(null);
            setAchievementProgress([]);
        } catch (error) {
            console.error('Error clearing data:', error);
        }
    };

    const signOut = async () => {
        try {
            if (!user.isGuest && authUser) await SupabaseAuth.signOut();
            // Reset to DEFAULT_USER ensures hasCompletedOnboarding is false for fresh Guest
            setUser(DEFAULT_USER);
            await StorageService.saveUser(DEFAULT_USER);
            setDiscoveries([]);
            await StorageService.saveDiscoveries([]);
            setUserStats(null);
            setAchievementProgress([]);
        } catch (error) {
            console.error('Error signing out:', error);
        }
    };

    const syncDiscoveries = React.useCallback(async () => {
        if (authUser && !user.isGuest) await syncFromCloud(authUser.id);
    }, [authUser, user.isGuest]);

    const createSession = async (imageUri: string, objects: DetectedObject[], context?: SceneContext) => {
        const sessionId = await sessionManager.createSession(imageUri, objects, context);
        const session = await sessionManager.getSession(sessionId);
        if (session) setCurrentSession(session);
        return sessionId;
    };

    const getSession = (sessionId: string) => {
        sessionManager.getSession(sessionId).then(session => { if (session) setCurrentSession(session); });
        return currentSession;
    };

    const markObjectAsExplored = (sessionId: string, objectId: string) => {
        sessionManager.markObjectAsExplored(sessionId, objectId).then(() => {
            sessionManager.getSession(sessionId).then(session => { if (session) setCurrentSession(session); });
        });
    };

    const clearExpiredSessions = () => sessionManager.cleanupExpiredSessions();

    const startLearningSession = async (sessionType: 'single_discovery' | 'batch_discovery' | 'museum_review') => {
        if (authUser && !user.isGuest) {
            const sessionId = await GamificationService.startLearningSession(authUser.id, sessionType);
            setActiveSessionId(sessionId);
            return sessionId;
        }
        return null;
    };

    const endLearningSession = async (objectsExplored: number, primaryCategory: string | null) => {
        if (authUser && !user.isGuest && activeSessionId) {
            await GamificationService.endLearningSession(activeSessionId, objectsExplored, primaryCategory);
            setActiveSessionId(null);
        }
    };

    return (
        <AppContext.Provider value={{
            user, updateUser, discoveries, addDiscovery, removeDiscovery, getDiscoveryById,
            currentSession, createSession, getSession, markObjectAsExplored, clearExpiredSessions,
            settings, updateSettings, stats, clearAllData, signOut, syncDiscoveries,
            isLoading, isFirstLaunch, isOnline, syncStatus,
            userStats, achievementProgress, refreshGamificationData, checkAchievements,
            startLearningSession, endLearningSession, unlockedAchievement, setUnlockedAchievement
        }}>
            {children}
        </AppContext.Provider>
    );
}

export function useApp() {
    const context = useContext(AppContext);
    if (context === undefined) throw new Error('useApp must be used within an AppProvider');
    return context;
}