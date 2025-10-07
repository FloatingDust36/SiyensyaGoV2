// In app/navigation/types.ts
import { NavigatorScreenParams } from '@react-navigation/native';

// Defines the screens available in the bottom tab navigator
export type TabParamList = {
    Camera: undefined;
    Museum: undefined;
    Profile: undefined;
};

// Defines the structure of the analysis result returned from the object recognition API
export type AnalysisResult = {
    objectName: string;
    confidence: number;
    funFact: string;
    the_science_in_action: string;
    why_it_matters_to_you: string;
    tryThis: string;
    explore_further: string;
};

// Defines all screens available in the app's root stack navigator
export type RootStackParamList = {
    Launch: undefined;
    Login: undefined;
    MainTabs: NavigatorScreenParams<TabParamList>;
    ObjectRecognition: { imageUri: string };
    LearningContent: {
        imageUri: string;
        result: AnalysisResult;
        discoveryId?: string; // Optional: if viewing from Museum
    };
};