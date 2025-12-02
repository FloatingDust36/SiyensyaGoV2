import React, { useState, useEffect } from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { RootStackParamList } from './types';
import { useApp } from '../context/AppContext';
import LaunchScreen from '../screens/LaunchScreen';
import LoginScreen from '../screens/LoginScreen';
import GradeLevelScreen from '../screens/GradeLevelScreen';
import TabNavigator from './TabNavigator';
import ObjectRecognitionScreen from '../screens/ObjectRecognitionScreen';
import DiscoverySessionScreen from '../screens/DiscoverySessionScreen';
import LearningContentScreen from '../screens/LearningContentScreen';
import SessionSummaryScreen from '../screens/SessionSummaryScreen';
import AchievementsScreen from '../screens/AchievementsScreen';
import LeaderboardScreen from '../screens/LeaderboardScreen';

const Stack = createStackNavigator<RootStackParamList>();

export default function RootNavigator() {
    const { user, isLoading } = useApp();
    const [isAppReady, setIsAppReady] = useState(false);

    useEffect(() => {
        // Show launch screen for a minimum time to allow hydration
        const timer = setTimeout(() => {
            setIsAppReady(true);
        }, 2000);

        return () => clearTimeout(timer);
    }, []);

    // Combine context loading state with minimum launch screen time
    if (isLoading || !isAppReady) {
        return <LaunchScreen />;
    }

    return (
        <Stack.Navigator
            screenOptions={{ headerShown: false }}
            // Dynamic initial route based on user state
            initialRouteName={
                user.isGuest
                    ? 'Login'
                    : !user.hasCompletedOnboarding
                        ? 'GradeLevel'
                        : 'MainTabs'
            }
        >
            {user.isGuest ? (
                // GUEST / UNAUTHENTICATED ROUTES
                <>
                    <Stack.Screen name="Login" component={LoginScreen} />
                    <Stack.Screen name="GradeLevel" component={GradeLevelScreen} />
                    <Stack.Screen name="MainTabs" component={TabNavigator} />
                    <Stack.Screen name="ObjectRecognition" component={ObjectRecognitionScreen} />
                    <Stack.Screen name="ObjectSelection" component={DiscoverySessionScreen} />
                    <Stack.Screen name="LearningContent" component={LearningContentScreen} />
                    <Stack.Screen name="SessionSummary" component={SessionSummaryScreen} />
                    <Stack.Screen name="Achievements" component={AchievementsScreen} />
                    <Stack.Screen name="Leaderboard" component={LeaderboardScreen} />
                </>
            ) : !user.hasCompletedOnboarding ? (
                // ONBOARDING ROUTE (Signed in but hasn't picked grade/finished setup)
                <>
                    <Stack.Screen name="GradeLevel" component={GradeLevelScreen} />
                    <Stack.Screen name="MainTabs" component={TabNavigator} />
                </>
            ) : (
                // MAIN APP ROUTES (Signed in & Onboarded)
                <>
                    <Stack.Screen name="MainTabs" component={TabNavigator} />
                    <Stack.Screen name="ObjectRecognition" component={ObjectRecognitionScreen} />
                    <Stack.Screen name="ObjectSelection" component={DiscoverySessionScreen} />
                    <Stack.Screen name="LearningContent" component={LearningContentScreen} />
                    <Stack.Screen name="SessionSummary" component={SessionSummaryScreen} />
                    <Stack.Screen name="Achievements" component={AchievementsScreen} />
                    <Stack.Screen name="Leaderboard" component={LeaderboardScreen} />
                </>
            )}
        </Stack.Navigator>
    );
}