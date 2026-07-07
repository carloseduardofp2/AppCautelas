import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import MainContent from './src/screens/MainContent'; // Importando a tela principal

export default function App() {
  return (
    <SafeAreaProvider>
      <MainContent />
    </SafeAreaProvider>
  );
}