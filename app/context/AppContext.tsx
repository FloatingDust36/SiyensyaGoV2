// app/context/AppContext.tsx
import React, { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import { AppContextType, Discovery, UserData, AppSettings, GradeLevel } from './types';
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

// Default values
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
    const [user, setUser] = useState<UserData>(DEFAULT_USER);
    const [discoveries, setDiscoveries] = useState<Discovery[]>([]);
    const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
    const [isLoading, setIsLoading] = useState(true);
    const [authUser, setAuthUser] = useState<any>(null);
    const [isSyncing, setIsSyncing] = useState(false);

    // Load data on mount
    useEffect(() => {
        loadInitialData();
        setupAuthListener();
    }, []);

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

    // Handle user sign in
    const handleUserSignIn = async (supabaseUser: any) => {
        try {
            // Get profile from Supabase
            const profile = await SupabaseProfile.getProfile(supabaseUser.id);

            // Update local user state
            const userData: UserData = {
                isGuest: false,
                userName: profile.user_name,
                email: supabaseUser.email,
                gradeLevel: profile.grade_level as GradeLevel,
            };
            setUser(userData);
            await StorageService.saveUser(userData);

            // Sync discoveries from cloud
            await syncFromCloud(supabaseUser.id);

            // Sync settings from cloud
            await syncSettingsFromCloud(supabaseUser.id);
        } catch (error) {
            console.error('Error handling sign in:', error);
        }
    };

    // Handle user sign out
    const handleUserSignOut = async () => {
        setUser(DEFAULT_USER);
        await StorageService.saveUser(DEFAULT_USER);
    };

    // Sync discoveries from Supabase to local
    const syncFromCloud = async (userId: string) => {
        if (!userId) return;

        setIsSyncing(true);
        try {
            const cloudDiscoveries = await SupabaseDiscoveries.getDiscoveries(userId);

            // Convert Supabase format to local format
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

            console.log(`✓ Synced ${localDiscoveries.length} discoveries from cloud`);
        } catch (error) {
            console.error('Sync from cloud error:', error);
            // Fall back to local storage
            const localDiscoveries = await StorageService.getDiscoveries();
            setDiscoveries(localDiscoveries);
        } finally {
            setIsSyncing(false);
        }
    };

    // Sync settings from Supabase
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
            setIsLoading(true);

            // Check for existing Supabase session
            const session = await SupabaseAuth.getSession();

            if (session) {
                // User is already logged in
                setAuthUser(session.user);
                await handleUserSignIn(session.user);
            } else {
                // Load from local storage (guest mode)
                const savedUser = await StorageService.getUser();
                if (savedUser) {
                    setUser(savedUser);
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

            // Sync to cloud if logged in
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

    // Add Discovery
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

            // Save locally first
            await StorageService.addDiscovery(newDiscovery);
            setDiscoveries(prev => [newDiscovery, ...prev]);

            // Sync to cloud if logged in
            if (authUser && !user.isGuest) {
                try {
                    // Upload image to Supabase Storage
                    const imagePath = await SupabaseStorage.uploadImage(
                        discoveryData.imageUri,
                        authUser.id
                    );

                    // Save to Supabase database
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

            // Remove from local storage
            await StorageService.removeDiscovery(id);
            setDiscoveries(prev => prev.filter(d => d.id !== id));

            // Delete local image file
            if (discovery?.imageUri) {
                await deleteImage(discovery.imageUri);
            }

            // Remove from cloud if logged in
            if (authUser && !user.isGuest) {
                try {
                    await SupabaseDiscoveries.deleteDiscovery(id);
                    // Note: Supabase Storage cleanup can be done with a database trigger
                } catch (cloudError) {
                    console.error('Cloud delete error:', cloudError);
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

            // Sync to cloud if logged in
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
            streak: 0, // TODO: Calculate actual streak
            subjectDistribution,
            favoriteSubject,
        };
    }, [discoveries]);

    // Clear All Data
    const clearAllData = async () => {
        try {
            // Delete all local images
            for (const discovery of discoveries) {
                if (discovery.imageUri) {
                    await deleteImage(discovery.imageUri);
                }
            }

            await StorageService.clearAll();
            setUser(DEFAULT_USER);
            setDiscoveries([]);
            setSettings(DEFAULT_SETTINGS);
        } catch (error) {
            console.error('Error clearing data:', error);
            throw error;
        }
    };

    // Sign Out
    const signOut = async () => {
        try {
            if (!user.isGuest && authUser) {
                // Sign out from Supabase
                await SupabaseAuth.signOut();
            }

            // Reset to guest
            const guestUser: UserData = {
                isGuest: true,
                userName: 'Guest Explorer',
                gradeLevel: user.gradeLevel, // Keep grade level
            };
            setUser(guestUser);
            await StorageService.saveUser(guestUser);

            // Clear discoveries for privacy
            setDiscoveries([]);
            await StorageService.saveDiscoveries([]);
        } catch (error) {
            console.error('Error signing out:', error);
            throw error;
        }
    };

    const contextValue: AppContextType = {
        user,
        updateUser,
        discoveries,
        addDiscovery,
        removeDiscovery,
        getDiscoveryById,
        settings,
        updateSettings,
        stats,
        clearAllData,
        signOut,
        isLoading: isLoading || isSyncing,
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