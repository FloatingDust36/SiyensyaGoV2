// app/navigation/RootNavigator.tsx
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
import { View, StyleSheet } from 'react-native';
import AchievementUnlockModal from '../components/gamification/AchievementUnlockModal';

const Stack = createStackNavigator<RootStackParamList>();

export default function RootNavigator() {
    const { user, isLoading, unlockedAchievement, setUnlockedAchievement } = useApp();
    const [isAppReady, setIsAppReady] = useState(false);

    useEffect(() => {
        // Show launch screen for a minimum time for branding
        const timer = setTimeout(() => {
            setIsAppReady(true);
        }, 3000);

        return () => clearTimeout(timer);
    }, []);

    // Combine context loading state with minimum launch screen time
    if (isLoading || !isAppReady) {
        return <LaunchScreen />;
    }

    return (
        <View style={{ flex: 1 }}>
            <Stack.Navigator
                screenOptions={{ headerShown: false }}
            >
                {/* LOGIC:
                    1. If user has completed onboarding (Selected Grade) -> MainTabs
                       (This applies to both Logged In users AND Guests)
                    2. If not completed onboarding -> Auth/Setup Flow
                */}

                {user.hasCompletedOnboarding ? (
                    <Stack.Screen name="MainTabs" component={TabNavigator} />
                ) : (
                    /* Setup Flow */
                    user.isGuest ? (
                        // Guest: Needs to Login OR Select Grade (via "Continue as Guest")
                        <>
                            <Stack.Screen name="Login" component={LoginScreen} />
                            <Stack.Screen name="GradeLevel" component={GradeLevelScreen} />
                        </>
                    ) : (
                        // Logged In but needs Grade Selection
                        <Stack.Screen name="GradeLevel" component={GradeLevelScreen} />
                    )
                )}

                {/* Common Screens available to both flows */}
                <Stack.Screen name="ObjectRecognition" component={ObjectRecognitionScreen} />
                <Stack.Screen name="ObjectSelection" component={DiscoverySessionScreen} />
                <Stack.Screen name="LearningContent" component={LearningContentScreen} />
                <Stack.Screen name="SessionSummary" component={SessionSummaryScreen} />
                <Stack.Screen name="Achievements" component={AchievementsScreen} />
                <Stack.Screen name="Leaderboard" component={LeaderboardScreen} />
            </Stack.Navigator>

            {/* GLOBAL ACHIEVEMENT MODAL */}
            <AchievementUnlockModal
                visible={!!unlockedAchievement}
                achievement={unlockedAchievement}
                onClose={() => setUnlockedAchievement(null)}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#121212',
    },
});