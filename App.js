import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { auth } from './src/services/firebaseConfig';
import { signInAnonymously } from 'firebase/auth';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import MainContent from './src/screens/MainContent'; // Importando a tela principal

export default function App() {
  const [pronto, setPronto] = useState(false);
  const [erro, setErro] = useState('');

  useEffect(() => {
    // Tenta autenticar anonimamente ao abrir o aplicativo
    signInAnonymously(auth)
      .then(() => {
        setPronto(true);
      })
      .catch((error) => {
        setErro('Não foi possível iniciar a sessão. Confira a conexão e recarregue o aplicativo.');
      });
  }, []);

  return (
    <SafeAreaProvider>
      {pronto ? <MainContent /> : <View style={{ flex: 1, backgroundColor: '#0F172A', justifyContent: 'center', padding: 24 }}><Text style={{ color: '#fff' }}>{erro || 'Iniciando sessão…'}</Text>{!erro && <ActivityIndicator />}</View>}
    </SafeAreaProvider>
  );
}
