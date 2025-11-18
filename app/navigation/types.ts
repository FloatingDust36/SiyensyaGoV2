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

export type DetectedObject = {
    id: string;
    name: string;
    confidence: number;
    boundingBox: {
        x: number;
        y: number;
        width: number;
        height: number;
    };
};

export type SceneContext = {
    location: 'workspace' | 'kitchen' | 'classroom' | 'garden' | 'living_room' | 'laboratory' | 'outdoor' | 'other';
    description: string;           // Brief scene description
    suggestedLearningPath: string[]; // Recommended object order
    relatedConcepts: string[];     // STEM concepts in scene
    culturalContext?: string;      // Filipino-specific context (optional)
};

export type ObjectDetectionResult = {
    objects: DetectedObject[];     // ENHANCED: Now includes IDs
    imageWidth: number;            // EXISTING
    imageHeight: number;           // EXISTING
    context?: SceneContext;        // NEW: Scene analysis (optional)
};

// Defines all screens available in the app's root stack navigator
export type RootStackParamList = {
    Launch: undefined;
    Login: undefined;
    GradeLevel: undefined;
    MainTabs: NavigatorScreenParams<TabParamList>;
    ObjectRecognition: { imageUri: string };
    ObjectSelection: {
        sessionId?: string
        imageUri: string;
        detectedObjects: DetectedObject[];
    };
    LearningContent: {
        sessionId?: string;
        objectId?: string;
        imageUri: string;
        result: AnalysisResult;
        discoveryId?: string;
        boundingBox?: {
            x: number;
            y: number;
            width: number;
            height: number;
        };
        // Batch learning parameters
        batchQueue?: DetectedObject[];
        currentBatchIndex?: number;
    };
    SessionSummary: {
        sessionId: string;
        exploredCount: number;
        totalCount: number;
    };
};