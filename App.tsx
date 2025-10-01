// In App.tsx
import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { useFonts, Orbitron_700Bold } from '@expo-google-fonts/orbitron';
import { ActivityIndicator, View } from 'react-native';

import TabNavigator from './app/navigation/TabNavigator';
import { colors } from './app/theme/theme';

export default function App() {
  // Load the Orbitron font
  let [fontsLoaded] = useFonts({
    Orbitron_700Bold,
  });

  // Show a loading indicator while the font is loading
  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <TabNavigator />
      <StatusBar style="light" />
    </NavigationContainer>
  );
}