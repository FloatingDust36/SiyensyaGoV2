// In app/navigation/RootNavigator.tsx
import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { RootStackParamList } from './types';

// Import all the screens and navigators
import LaunchScreen from '../screens/LaunchScreen';
import LoginScreen from '../screens/LoginScreen';
import TabNavigator from './TabNavigator';
import ObjectRecognitionScreen from '../screens/ObjectRecognitionScreen';
import LearningContentScreen from '../screens/LearningContentScreen';

const Stack = createStackNavigator<RootStackParamList>();

export default function RootNavigator() {
    return (
        <Stack.Navigator
            initialRouteName="Launch"
            screenOptions={{ headerShown: false }}
        >
            <Stack.Screen name="Launch" component={LaunchScreen} />
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="MainTabs" component={TabNavigator} />
            <Stack.Screen name="ObjectRecognition" component={ObjectRecognitionScreen} />
            <Stack.Screen name="LearningContent" component={LearningContentScreen} />
        </Stack.Navigator>
    );
}