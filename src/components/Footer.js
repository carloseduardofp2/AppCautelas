import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { styles } from '../styles/MainStyles';

export default function Footer({ abaAtiva, setAbaAtiva }) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[
      styles.footer,
      {
        paddingBottom: insets.bottom > 0 ? insets.bottom : 0,
        height: 55 + (insets.bottom > 0 ? insets.bottom : 0)
      }
    ]}>
      <TouchableOpacity style={styles.footerButton} onPress={() => setAbaAtiva('Livro')}>
        <Text style={[styles.footerButtonText, abaAtiva === 'Livro' && styles.footerButtonTextActive]}>Livro</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.footerButton} onPress={() => setAbaAtiva('Pendentes')}>
        <Text style={[styles.footerButtonText, abaAtiva === 'Pendentes' && styles.footerButtonTextActive]}>Pendentes</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.footerButton} onPress={() => setAbaAtiva('Materiais')}>
        <Text style={[styles.footerButtonText, abaAtiva === 'Materiais' && styles.footerButtonTextActive]}>Materiais</Text>
      </TouchableOpacity>
    </View>
  );
}