// In app/navigation/TabNavigator.tsx
import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/theme';

// Import our screens
import CameraScreen from '../screens/CameraScreen';
import MuseumScreen from '../screens/MuseumScreen';
import ProfileScreen from '../screens/ProfileScreen';

const Tab = createBottomTabNavigator();

export default function TabNavigator() {
    return (
        <Tab.Navigator
            initialRouteName="Camera" // The Camera is the central, default screen [cite: 47, 112]
            screenOptions={{
                headerShown: false, // We will handle headers on a per-screen basis later
                tabBarShowLabel: false,
                tabBarStyle: {
                    backgroundColor: colors.background,
                    borderTopColor: colors.primary,
                    borderTopWidth: 1,
                    height: 90,
                },
                tabBarActiveTintColor: colors.primary,
                tabBarInactiveTintColor: colors.lightGray,
            }}
        >
            <Tab.Screen
                name="Museum"
                component={MuseumScreen}
                options={{
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="library-outline" color={color} size={size} />
                    ),
                }}
            />
            <Tab.Screen
                name="Camera"
                component={CameraScreen}
                options={{
                    tabBarIcon: ({ color, size }) => (
                        // Make the center camera icon larger for emphasis
                        <Ionicons name="camera-outline" color={color} size={size * 1.5} />
                    ),
                }}
            />
            <Tab.Screen
                name="Profile"
                component={ProfileScreen}
                options={{
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="person-outline" color={color} size={size} />
                    ),
                }}
            />
        </Tab.Navigator>
    );
}