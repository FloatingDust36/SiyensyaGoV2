// In App.tsx
import React, { useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { useFonts, Orbitron_700Bold } from '@expo-google-fonts/orbitron';
import { ActivityIndicator, View } from 'react-native';

import TabNavigator from './app/navigation/TabNavigator';
import { colors } from './app/theme/theme';
import LaunchScreen from './app/screens/LaunchScreen'; // Import the new screen

export default function App() {
  const [isLoading, setIsLoading] = useState(true);

  let [fontsLoaded, fontError] = useFonts({
    Orbitron_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      // Simulate a 2.5 second boot-up sequence for the launch screen
      setTimeout(() => {
        setIsLoading(false);
      }, 2500);
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) {
    // This part is for the initial font loading, which is almost instant.
    // The main loading experience is handled by our LaunchScreen.
    return null;
  }

  return (
    <NavigationContainer>
      {isLoading ? <LaunchScreen /> : <TabNavigator />}
      <StatusBar style="light" />
    </NavigationContainer>
  );
}