// In App.tsx
import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { useFonts, Orbitron_700Bold } from '@expo-google-fonts/orbitron';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import RootNavigator from './app/navigation/RootNavigator';

export default function App() {
  const [fontsLoaded, fontError] = useFonts({
    Orbitron_700Bold,
  });

  // Keep the app loading screen blank until fonts are ready
  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <RootNavigator />
      </NavigationContainer>
      <StatusBar style="light" />
    </SafeAreaProvider>
  );
}