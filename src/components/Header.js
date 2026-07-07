import React from 'react';
import { View, Text } from 'react-native';
import { styles } from '../styles/MainStyles';

export default function Header() {
  return (
    <View style={styles.header}>
      <Text style={styles.headerTitle}>Sistema de Cautelas</Text>
      <Text style={styles.headerSubtitle}>Seção de Operações</Text>
    </View>
  );
}