// app/services/supabase.ts
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import { decode } from 'base64-arraybuffer';
import * as WebBrowser from 'expo-web-browser';
import { makeRedirectUri } from 'expo-auth-session';

// 1. Tell WebBrowser to close the session (needed for Android)
WebBrowser.maybeCompleteAuthSession();

// 2. Define your scheme and redirect URI
const redirectUri = makeRedirectUri({
    scheme: 'siyensyago', // Must match the scheme in app.json
});

// CLIENT CONFIGURATION
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
        'Missing Supabase credentials. Add EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY to .env'
    );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
    },
});


// AUTHENTICATION FUNCTIONS
export const SupabaseAuth = {
    // Sign up with email
    async signUp(email: string, password: string, fullName: string) {
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    user_name: fullName,
                },
            },
        });

        if (error) throw error;

        return data;
    },

    // Sign in with email
    async signIn(email: string, password: string) {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (error) throw error;
        return data;
    },

    // Sign in with Google/Facebook (Uses Expo WebBrowser for OAuth flow)
    async signInWithOAuth(provider: 'google' | 'facebook' | 'apple') {
        // 3. Construct the Supabase OAuth URL with the redirect URI
        const { data, error } = await supabase.auth.signInWithOAuth({
            provider,
            options: {
                redirectTo: redirectUri,
                skipBrowserRedirect: true, // Crucial for using expo-web-browser
            },
        });

        if (error) throw error;

        // 4. Open the login URL in the Expo WebBrowser
        const res = await WebBrowser.openAuthSessionAsync(
            data?.url ?? '',
            redirectUri
        );

        // This function returns the WebBrowser result, and Supabase's internal listener 
        // will handle the final session creation upon successful deep link return.
        return res; 
    },

    // Sign out
    async signOut() {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
    },

    // Get current user
    async getCurrentUser() {
        const { data: { user } } = await supabase.auth.getUser();
        return user;
    },

    // Get current session
    async getSession() {
        const { data: { session } } = await supabase.auth.getSession();
        return session;
    },
};

// PROFILE FUNCTIONS
export const SupabaseProfile = {
    // Get user profile
    async getProfile(userId: string) {
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single();

        if (error) throw error;
        return data;
    },

    // Update profile
    async updateProfile(userId: string, updates: {
        user_name?: string;
        grade_level?: string;
        has_completed_onboarding?: boolean;
    }) {
        const { data, error } = await supabase
            .from('profiles')
            .update({
                ...updates,
                updated_at: new Date().toISOString(),
            })
            .eq('id', userId)
            .select()
            .single();

        if (error) throw error;
        return data;
    },
};

// IMAGE STORAGE FUNCTIONS
export const SupabaseStorage = {
    // Upload image to Supabase Storage
    async uploadImage(localUri: string, userId: string): Promise<string> {
        try {
            // Read image as base64
            const base64 = await FileSystem.readAsStringAsync(localUri, {
                encoding: 'base64',
            });

            // Generate unique filename
            const filename = `${userId}/${Date.now()}_${Math.random().toString(36).substr(2, 9)}.jpg`;

            // Upload to Supabase Storage
            const { data, error } = await supabase.storage
                .from('discovery-images')
                .upload(filename, decode(base64), {
                    contentType: 'image/jpeg',
                    upsert: false,
                });

            if (error) throw error;

            // Return the storage path
            return data.path;
        } catch (error) {
            console.error('Image upload error:', error);
            throw error;
        }
    },

    // Get public URL for image
    getImageUrl(path: string): string {
        const { data } = supabase.storage
            .from('discovery-images')
            .getPublicUrl(path);

        return data.publicUrl;
    },

    // Delete image from storage
    async deleteImage(path: string) {
        const { error } = await supabase.storage
            .from('discovery-images')
            .remove([path]);

        if (error) throw error;
    },
};

// DISCOVERIES FUNCTIONS
export const SupabaseDiscoveries = {
    // Get all discoveries for user
    async getDiscoveries(userId: string) {
        const { data, error } = await supabase
            .from('discoveries')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data;
    },

    // Add new discovery
    async addDiscovery(userId: string, discovery: {
        object_name: string;
        confidence: number;
        category: string;
        image_path: string;
        fun_fact: string;
        the_science_in_action: string;
        why_it_matters_to_you: string;
        try_this: string;
        explore_further: string;
    }) {
        const { data, error } = await supabase
            .from('discoveries')
            .insert({
                user_id: userId,
                ...discovery,
            })
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    // Delete discovery
    async deleteDiscovery(discoveryId: string) {
        const { error } = await supabase
            .from('discoveries')
            .delete()
            .eq('id', discoveryId);

        if (error) throw error;
    },

    // Get single discovery
    async getDiscovery(discoveryId: string) {
        const { data, error } = await supabase
            .from('discoveries')
            .select('*')
            .eq('id', discoveryId)
            .single();

        if (error) throw error;
        return data;
    },
};

// SETTINGS FUNCTIONS
export const SupabaseSettings = {
    // Get user settings
    async getSettings(userId: string) {
        const { data, error } = await supabase
            .from('user_settings')
            .select('*')
            .eq('user_id', userId)
            .single();

        if (error) {
            // If no settings exist, create default
            if (error.code === 'PGRST116') {
                return await this.createDefaultSettings(userId);
            }
            throw error;
        }
        return data;
    },

    // Create default settings
    async createDefaultSettings(userId: string) {
        const { data, error } = await supabase
            .from('user_settings')
            .insert({
                user_id: userId,
                notifications_enabled: true,
                sound_enabled: true,
                language: 'english',
            })
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    // Update settings
    async updateSettings(userId: string, settings: {
        notifications_enabled?: boolean;
        sound_enabled?: boolean;
        language?: string;
    }) {
        const { data, error } = await supabase
            .from('user_settings')
            .update({
                ...settings,
                updated_at: new Date().toISOString(),
            })
            .eq('user_id', userId)
            .select()
            .single();

        if (error) throw error;
        return data;
    },
};