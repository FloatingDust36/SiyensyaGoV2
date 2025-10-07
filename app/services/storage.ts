// In app/services/storage.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Discovery, UserData, AppSettings } from '../context/types';

// Storage keys
const KEYS = {
    USER: '@siyensyago_user',
    DISCOVERIES: '@siyensyago_discoveries',
    SETTINGS: '@siyensyago_settings',
};

// User Storage
export const StorageService = {
    // User
    async getUser(): Promise<UserData | null> {
        try {
            const data = await AsyncStorage.getItem(KEYS.USER);
            return data ? JSON.parse(data) : null;
        } catch (error) {
            console.error('Error getting user:', error);
            return null;
        }
    },

    async saveUser(user: UserData): Promise<void> {
        try {
            await AsyncStorage.setItem(KEYS.USER, JSON.stringify(user));
        } catch (error) {
            console.error('Error saving user:', error);
            throw error;
        }
    },

    // Discoveries
    async getDiscoveries(): Promise<Discovery[]> {
        try {
            const data = await AsyncStorage.getItem(KEYS.DISCOVERIES);
            return data ? JSON.parse(data) : [];
        } catch (error) {
            console.error('Error getting discoveries:', error);
            return [];
        }
    },

    async saveDiscoveries(discoveries: Discovery[]): Promise<void> {
        try {
            await AsyncStorage.setItem(KEYS.DISCOVERIES, JSON.stringify(discoveries));
        } catch (error) {
            console.error('Error saving discoveries:', error);
            throw error;
        }
    },

    async addDiscovery(discovery: Discovery): Promise<void> {
        try {
            const discoveries = await this.getDiscoveries();
            discoveries.unshift(discovery); // Add to beginning
            await this.saveDiscoveries(discoveries);
        } catch (error) {
            console.error('Error adding discovery:', error);
            throw error;
        }
    },

    async removeDiscovery(id: string): Promise<void> {
        try {
            const discoveries = await this.getDiscoveries();
            const filtered = discoveries.filter(d => d.id !== id);
            await this.saveDiscoveries(filtered);
        } catch (error) {
            console.error('Error removing discovery:', error);
            throw error;
        }
    },

    // Settings
    async getSettings(): Promise<AppSettings | null> {
        try {
            const data = await AsyncStorage.getItem(KEYS.SETTINGS);
            return data ? JSON.parse(data) : null;
        } catch (error) {
            console.error('Error getting settings:', error);
            return null;
        }
    },

    async saveSettings(settings: AppSettings): Promise<void> {
        try {
            await AsyncStorage.setItem(KEYS.SETTINGS, JSON.stringify(settings));
        } catch (error) {
            console.error('Error saving settings:', error);
            throw error;
        }
    },

    // Clear all data
    async clearAll(): Promise<void> {
        try {
            await AsyncStorage.multiRemove([KEYS.USER, KEYS.DISCOVERIES, KEYS.SETTINGS]);
        } catch (error) {
            console.error('Error clearing data:', error);
            throw error;
        }
    },
};