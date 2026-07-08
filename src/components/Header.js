import React from 'react';
import { View, Text, Image } from 'react-native';
import { styles } from '../styles/MainStyles';

export default function Header() {
  return (
    <View style={styles.header}>
            {/* Imagem do Logo */}
            <Image
                source={require('../../assets/logo-cia-3de.png')} // Coloque o nome exato do seu arquivo aqui
                style={styles.headerLogo}
                resizeMode="contain"
            />
            
            {/* Textos Centrais */}
            <View>
                <Text style={styles.headerTitle}>Sistema de Cautelas</Text>
                <Text style={styles.headerSubtitle}>Seção de Operações</Text>
            </View>
    </View>
  );
}