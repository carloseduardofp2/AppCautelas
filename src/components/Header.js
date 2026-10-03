import React from 'react';
import { View, Text, Image, useWindowDimensions } from 'react-native';
import { styles } from '../styles/MainStyles';

export default function Header() {
  const pequeno = useWindowDimensions().width < 600;
  return (
    <View style={[styles.header, pequeno && { flexDirection: "row", gap: 10 }]}>
            {/* Imagem do Logo */}
            <Image
                source={require('../../assets/logo-cia-3de.png')} // Coloque o nome exato do seu arquivo aqui
                style={[styles.headerLogo, pequeno && { position: "relative", left: 0, top: 0, width: 45, height: 55 }]}
                resizeMode="contain"
            />
            
            {/* Textos Centrais */}
            <View style={pequeno ? { flex: 1 } : undefined}>
                <Text style={[styles.headerTitle, pequeno && { fontSize: 20 }]}>Sistema de Cautelas</Text>
                <Text style={[styles.headerSubtitle, pequeno && { fontSize: 15 }]}>Seção de Operações</Text>
            </View>
    </View>
  );
}