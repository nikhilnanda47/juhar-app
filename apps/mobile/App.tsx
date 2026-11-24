import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import AsyncStorage from '@react-native-async-storage/async-storage';
import TabNavigator from './src/navigation/TabNavigator';
import SplashScreen from './src/screens/SplashScreen';
import WelcomeScreen from './src/screens/WelcomeScreen';
import { ThemeProvider, useTheme, colors } from './src/theme';
import { WishlistProvider } from './src/contexts/WishlistContext';

const ONBOARDING_KEY = 'juhar_onboarding_done';

function AppInner() {
  const { colors: theme, isDark } = useTheme();
  const [showSplash, setShowSplash] = useState(true);
  const [showWelcome, setShowWelcome] = useState<boolean | null>(null);

  useEffect(() => {
    if (!showSplash && showWelcome === null) {
      AsyncStorage.getItem(ONBOARDING_KEY).then((val) => {
        setShowWelcome(val !== 'true');
      });
    }
  }, [showSplash]);

  if (showSplash) {
    return <SplashScreen onFinish={() => setShowSplash(false)} />;
  }

  if (showWelcome === null) {
    return (
      <View style={[styles.loading, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  if (showWelcome) {
    return (
      <WelcomeScreen onComplete={() => {
        AsyncStorage.setItem(ONBOARDING_KEY, 'true');
        setShowWelcome(false);
      }} />
    );
  }

  return (
    <NavigationContainer>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <TabNavigator />
    </NavigationContainer>
  );
}

export default function App() {
  const [fontsLoaded] = useFonts({
    'NotoSerif-Regular': require('./assets/fonts/NotoSerif-Regular.ttf'),
    'NotoSerif-Medium': require('./assets/fonts/NotoSerif-Medium.ttf'),
    'DMSans-Regular': require('./assets/fonts/DMSans-Regular.ttf'),
    'DMSans-Medium': require('./assets/fonts/DMSans-Medium.ttf'),
    'DMSans-SemiBold': require('./assets/fonts/DMSans-SemiBold.ttf'),
    'DMSans-Bold': require('./assets/fonts/DMSans-Bold.ttf'),
  });

  if (!fontsLoaded) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <WishlistProvider>
          <AppInner />
        </WishlistProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
});
