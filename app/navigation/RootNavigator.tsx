// In app/navigation/RootNavigator.tsx
import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { RootStackParamList } from './types';

import LaunchScreen from '../screens/LaunchScreen';
import LoginScreen from '../screens/LoginScreen';
import GradeLevelScreen from '../screens/GradeLevelScreen';
import TabNavigator from './TabNavigator';
import ObjectRecognitionScreen from '../screens/ObjectRecognitionScreen';
import ObjectSelectionScreen from '../screens/ObjectSelectionScreen';
import DiscoverySessionScreen from '../screens/DiscoverySessionScreen';
import LearningContentScreen from '../screens/LearningContentScreen';
import SessionSummaryScreen from '../screens/SessionSummaryScreen';

const Stack = createStackNavigator<RootStackParamList>();

export default function RootNavigator() {
    return (
        <Stack.Navigator
            initialRouteName="Launch"
            screenOptions={{ headerShown: false }}
        >
            <Stack.Screen name="Launch" component={LaunchScreen} />
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="GradeLevel" component={GradeLevelScreen} />
            <Stack.Screen name="MainTabs" component={TabNavigator} />
            <Stack.Screen name="ObjectRecognition" component={ObjectRecognitionScreen} />
            <Stack.Screen name="ObjectSelection" component={DiscoverySessionScreen} />
            <Stack.Screen name="LearningContent" component={LearningContentScreen} />
            <Stack.Screen name="SessionSummary" component={SessionSummaryScreen} />
        </Stack.Navigator>
    );
}