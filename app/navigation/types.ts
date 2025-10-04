// In app/navigation/types.ts
import { NavigatorScreenParams } from '@react-navigation/native';

// Defines the screens available in the bottom tab navigator
export type TabParamList = {
    Museum: undefined;
    Camera: undefined;
    Profile: undefined;
};

// Defines all screens available in the app's root stack navigator
export type RootStackParamList = {
    Launch: undefined;
    Login: undefined;
    MainTabs: NavigatorScreenParams<TabParamList>;
    ObjectRecognition: { imageUri: string }; // This screen will expect an imageUri
};