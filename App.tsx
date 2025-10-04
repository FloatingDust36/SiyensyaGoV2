// In App.tsx
import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { Platform, StatusBar as RNStatusBar } from 'react-native';
import { useFonts, Orbitron_700Bold } from '@expo-google-fonts/orbitron';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import * as SystemUI from 'expo-system-ui';
import RootNavigator from './app/navigation/RootNavigator';
import { colors } from './app/theme/theme';

export default function App() {
  const [fontsLoaded, fontError] = useFonts({
    Orbitron_700Bold,
  });

  useEffect(() => {
    if (Platform.OS === 'android') {
      // Set the system UI (navigation bar) background color for edge-to-edge mode
      SystemUI.setBackgroundColorAsync(colors.background);
    }
  }, []);

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