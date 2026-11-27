import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import TabNavigator from './src/navigation/TabNavigator';
import SplashScreen from './src/screens/SplashScreen';
import WelcomeScreen from './src/screens/WelcomeScreen';
import { ThemeProvider, useTheme, colors } from './src/theme';
import { WishlistProvider } from './src/contexts/WishlistContext';
import { loadToken } from './src/services/api';

function AppInner() {
  const { colors: theme, isDark } = useTheme();
  const [showSplash, setShowSplash] = useState(true);
  const [showWelcome, setShowWelcome] = useState<boolean | null>(null);

  // Everyone who is not signed in sees the welcome slides each time the app opens; someone signed in goes straight to Home.
  useEffect(() => {
    if (!showSplash && showWelcome === null) {
      loadToken().then((signedIn) => setShowWelcome(!signedIn));
    }
  }, [showSplash, showWelcome]);

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
      <WelcomeScreen onComplete={() => setShowWelcome(false)} />
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
