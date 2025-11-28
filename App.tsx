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
import { AppProvider, useApp } from './app/context/AppContext';
import AchievementUnlockModal from './app/components/gamification/AchievementUnlockModal';

// Wrapper component to access AppContext
function AppContent() {
  const { unlockedAchievement, setUnlockedAchievement } = useApp();

  return (
    <>
      <RootNavigator />

      {/* Global Achievement Unlock Modal */}
      <AchievementUnlockModal
        visible={!!unlockedAchievement}
        achievement={unlockedAchievement}
        onClose={() => setUnlockedAchievement(null)}
      />
    </>
  );
}

export default function App() {
  const [fontsLoaded, fontError] = useFonts({
    Orbitron_700Bold,
  });

  useEffect(() => {
    if (Platform.OS === 'android') {
      SystemUI.setBackgroundColorAsync(colors.background);
    }
  }, []);

  // Keep the app loading screen blank until fonts are ready
  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <AppProvider>
        <NavigationContainer>
          <RootNavigator />
        </NavigationContainer>
      </AppProvider>
      <StatusBar style="light" />
    </SafeAreaProvider>
  );
}