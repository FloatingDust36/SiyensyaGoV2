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
import { View, ActivityIndicator, StyleSheet } from 'react-native';

const Stack = createStackNavigator<RootStackParamList>();

export default function RootNavigator() {
    const { user, isLoading } = useApp();
    const [isAppReady, setIsAppReady] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => {
            setIsAppReady(true);
        }, 3000); // Show launch screen for 3 seconds

        return () => clearTimeout(timer);
    }, []);

    // While the context is loading or the app is not ready, show the launch screen
    if (isLoading || !isAppReady) {
        return <LaunchScreen />;
    }

    return (
        <Stack.Navigator
            // Determine the initial route based on user state
            initialRouteName={user.isGuest ? 'Login' : user.gradeLevel ? 'MainTabs' : 'GradeLevel'}
            screenOptions={{ headerShown: false }}
        >
            {/* Conditional rendering of screens based on authentication status */}
            {user.isGuest ? (
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
            ) : user.gradeLevel ? (
                <>
                    <Stack.Screen name="MainTabs" component={TabNavigator} />
                    <Stack.Screen name="ObjectRecognition" component={ObjectRecognitionScreen} />
                    <Stack.Screen name="ObjectSelection" component={DiscoverySessionScreen} />
                    <Stack.Screen name="LearningContent" component={LearningContentScreen} />
                    <Stack.Screen name="SessionSummary" component={SessionSummaryScreen} />
                    <Stack.Screen name="Achievements" component={AchievementsScreen} />
                    <Stack.Screen name="Leaderboard" component={LeaderboardScreen} />
                </>
            ) : (
                <>
                    <Stack.Screen name="GradeLevel" component={GradeLevelScreen} />
                    <Stack.Screen name="MainTabs" component={TabNavigator} />
                </>
            )}
        </Stack.Navigator>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#121212', // Dark background for the loading screen
    },
});