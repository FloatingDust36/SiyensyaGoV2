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
    category: string;
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
    GradeLevel: undefined;
    MainTabs: NavigatorScreenParams<TabParamList>;
    ObjectRecognition: { imageUri: string };
    ObjectSelection: {
        imageUri: string;
        detectedObjects: DetectedObject[];
    };

    LearningContent: {
        imageUri: string;
        result: AnalysisResult;
        discoveryId?: string; // Optional: if viewing from Museum
    };
};

export type DetectedObject = {
    name: string;
    confidence: number;
    boundingBox: {
        x: number;      // Percentage (0-100)
        y: number;      // Percentage (0-100)
        width: number;  // Percentage (0-100)
        height: number; // Percentage (0-100)
    };
};

export type ObjectDetectionResult = {
    objects: DetectedObject[];
    imageWidth: number;
    imageHeight: number;
};