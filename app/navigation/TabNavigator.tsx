// In app/navigation/TabNavigator.tsx
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/theme';

// Import our screens
import CameraScreen from '../screens/CameraScreen';
import MuseumScreen from '../screens/MuseumScreen';
import ProfileScreen from '../screens/ProfileScreen';

const Tab = createBottomTabNavigator();

const CustomCameraButton = () => (
    <View style={styles.cameraButtonContainer}>
        <Ionicons name="scan-outline" color={colors.background} size={32} />
    </View>
);

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
                    borderTopWidth: 0.5,
                    height: 85,
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
                    tabBarIcon: () => <CustomCameraButton />,
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

const styles = StyleSheet.create({
    cameraButtonContainer: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
        // This 'translateY' is what gives it the "floating" effect
        transform: [{ translateY: -25 }],
        // Add a glow effect
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.7,
        shadowRadius: 10,
        elevation: 10,
    },
});