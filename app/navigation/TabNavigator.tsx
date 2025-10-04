// In app/navigation/TabNavigator.tsx
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import CustomTabBar from './CustomTabBar';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts } from '../theme/theme';

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
            tabBar={(props) => <CustomTabBar {...props} />}
            screenOptions={{
                headerShown: false,
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
                    tabBarLabel: '',
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
        width: 65,
        height: 65,
        borderRadius: 32.5,
        backgroundColor: colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
        // This 'translateY' is what gives it the "floating" effect
        transform: [{ translateY: -30 }],
        // Add a glow effect
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.7,
        shadowRadius: 10,
        elevation: 10,
        borderWidth: 3,
        borderColor: colors.background
    },
});