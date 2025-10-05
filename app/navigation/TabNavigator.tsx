// In app/navigation/TabNavigator.tsx
import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts } from '../theme/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context'; // Import the hook

// Import our screens
import CameraScreen from '../screens/CameraScreen';
import MuseumScreen from '../screens/MuseumScreen';
import ProfileScreen from '../screens/ProfileScreen';

const Tab = createBottomTabNavigator();

export default function TabNavigator() {
    // Get bottom safe area inset
    const insets = useSafeAreaInsets();

    return (
        <Tab.Navigator
            initialRouteName="Camera"
            screenOptions={{
                headerShown: false,
                tabBarActiveTintColor: colors.primary,
                tabBarInactiveTintColor: colors.lightGray,
                tabBarStyle: {
                    backgroundColor: colors.background,
                    borderTopColor: 'rgba(0, 191, 255, 0.2)',
                    height: 70 + insets.bottom,
                    paddingTop: 5,
                },
                tabBarLabelStyle: {
                    fontFamily: fonts.heading,
                    fontSize: 10,
                    paddingBottom: 5,
                },
                tabBarIconStyle: {
                    paddingTop: 5,
                }
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
                        <Ionicons name="camera-outline" color={color} size={size * 1.1} />
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