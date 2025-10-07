// In app/context/types.ts

export type GradeLevel = 'elementary' | 'juniorHigh' | 'seniorHigh';

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
};

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

export type AppContextType = {
    // User
    user: UserData;
    updateUser: (userData: Partial<UserData>) => Promise<void>;

    // Discoveries
    discoveries: Discovery[];
    addDiscovery: (discovery: Omit<Discovery, 'id' | 'timestamp' | 'dateSaved'>) => Promise<void>;
    removeDiscovery: (id: string) => Promise<void>;
    getDiscoveryById: (id: string) => Discovery | undefined;

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
};