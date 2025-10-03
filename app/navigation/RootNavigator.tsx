// In app/navigation/RootNavigator.tsx
import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { NavigationContainer } from '@react-navigation/native';

// Import all the screens and navigators
import LaunchScreen from '../screens/LaunchScreen';
import LoginScreen from '../screens/LoginScreen';
import TabNavigator from './TabNavigator';

const Stack = createStackNavigator();

export default function RootNavigator() {
    return (
        <NavigationContainer>
            <Stack.Navigator
                initialRouteName="Launch"
                screenOptions={{ headerShown: false }}
            >
                <Stack.Screen name="Launch" component={LaunchScreen} />
                <Stack.Screen name="Login" component={LoginScreen} />
                <Stack.Screen name="MainTabs" component={TabNavigator} />
            </Stack.Navigator>
        </NavigationContainer>
    );
}