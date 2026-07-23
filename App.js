import React, { useEffect } from 'react';
import { auth } from './src/services/firebaseConfig';
import { signInAnonymously } from 'firebase/auth';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import MainContent from './src/screens/MainContent'; // Importando a tela principal

export default function App() {

  useEffect(() => {
    // Tenta autenticar anonimamente ao abrir o aplicativo
    signInAnonymously(auth)
      .then(() => {
        console.log('Autenticado anonimamente com sucesso!');
      })
      .catch((error) => {
        console.error('Erro ao autenticar anonimamente:', error);
      });
  }, []);

  return (
    <SafeAreaProvider>
      <MainContent />
    </SafeAreaProvider>
  );
}