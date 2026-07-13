import React, { useState } from 'react';
import { StatusBar } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider, useTheme } from './src/theme/ThemeContext';
import ChatScreen from './src/screens/ChatScreen';
import SettingsScreen from './src/screens/SettingsScreen';

function AppRoot() {
  const [screen, setScreen] = useState('chat');
  const theme = useTheme();

  return (
    <>
      <StatusBar 
        barStyle={theme.isDark ? "light-content" : "dark-content"} 
        backgroundColor={theme.colors.bgApp} 
      />
      {screen === 'chat' ? (
        <ChatScreen onNavigateSettings={() => setScreen('settings')} />
      ) : (
        <SettingsScreen onBack={() => setScreen('chat')} />
      )}
    </>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AppRoot />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
