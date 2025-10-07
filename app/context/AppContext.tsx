// In app/context/AppContext.tsx
import React, { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import { AppContextType, Discovery, UserData, AppSettings, GradeLevel } from './types';
import { StorageService } from '../services/storage';

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

    // Load data on mount
    useEffect(() => {
        loadInitialData();
    }, []);

    const loadInitialData = async () => {
        try {
            setIsLoading(true);

            // Load user
            const savedUser = await StorageService.getUser();
            if (savedUser) {
                setUser(savedUser);
            }

            // Load discoveries
            const savedDiscoveries = await StorageService.getDiscoveries();
            setDiscoveries(savedDiscoveries);

            // Load settings
            const savedSettings = await StorageService.getSettings();
            if (savedSettings) {
                setSettings(savedSettings);
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

            await StorageService.addDiscovery(newDiscovery);
            setDiscoveries(prev => [newDiscovery, ...prev]);
        } catch (error) {
            console.error('Error adding discovery:', error);
            throw error;
        }
    };

    // Remove Discovery
    const removeDiscovery = async (id: string) => {
        try {
            await StorageService.removeDiscovery(id);
            setDiscoveries(prev => prev.filter(d => d.id !== id));
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
            streak: 0, // TODO: Calculate actual streak based on timestamps
            subjectDistribution,
            favoriteSubject,
        };
    }, [discoveries]);

    // Clear All Data
    const clearAllData = async () => {
        try {
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
            // For now, just reset to guest
            const guestUser: UserData = {
                isGuest: true,
                userName: 'Guest Explorer',
                gradeLevel: user.gradeLevel, // Keep grade level
            };
            setUser(guestUser);
            await StorageService.saveUser(guestUser);
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
        isLoading,
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