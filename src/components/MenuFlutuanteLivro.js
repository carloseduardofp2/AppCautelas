import React, { useState, useRef } from 'react';
import { View, Text, TouchableOpacity, Animated } from 'react-native';
import { styles } from '../styles/MainStyles';

// Botão flutuante "+" da aba Livro que expande em um mini-menu (speed dial)
// com as ações de Nova Cautela, Exportar PDF e Excluir Todas.
export default function MenuFlutuanteLivro({ onNovaCautela, onExportarPDF, onExcluirTodas }) {
    const [modalMenuVisivel, setModalMenuVisivel] = useState(false);
    const fadeAnim = useRef(new Animated.Value(0)).current;

    function toggleMenu() {
        const isOpening = !modalMenuVisivel;
        setModalMenuVisivel(isOpening);

        Animated.spring(fadeAnim, {
            toValue: isOpening ? 1 : 0,
            friction: 6,
            tension: 70,
            useNativeDriver: true,
        }).start();
    }

    return (
        <>
            <Animated.View
                pointerEvents={modalMenuVisivel ? 'auto' : 'none'}
                style={[
                    styles.menuFlutuanteContainer,
                    {
                        bottom: 170,
                        opacity: fadeAnim,
                        transform: [
                            {
                                translateY: fadeAnim.interpolate({
                                    inputRange: [0, 1],
                                    outputRange: [120, 0]
                                })
                            },
                            {
                                translateX: fadeAnim.interpolate({
                                    inputRange: [0, 1],
                                    outputRange: [50, 0]
                                })
                            },
                            { scale: fadeAnim }
                        ],
                        zIndex: 1,
                    }
                ]}
            >
                {modalMenuVisivel && (
                    <TouchableOpacity
                        style={{ position: 'absolute', top: -2000, bottom: -2000, left: -2000, right: -2000, zIndex: -1 }}
                        onPress={toggleMenu}
                    />
                )}

                <View style={styles.fabItemContainer}>
                    <Text style={styles.fabLabel}>Nova Cautela</Text>
                    <TouchableOpacity style={styles.miniFab} onPress={() => { toggleMenu(); onNovaCautela(); }}>
                        <Text style={styles.miniFabIcon}>➕</Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.fabItemContainer}>
                    <Text style={styles.fabLabel}>Exportar PDF</Text>
                    <TouchableOpacity style={styles.miniFab} onPress={() => { toggleMenu(); onExportarPDF(); }}>
                        <Text style={styles.miniFabIcon}>📄</Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.fabItemContainer}>
                    <Text style={styles.fabLabel}>Excluir Todas</Text>
                    <TouchableOpacity style={[styles.miniFab, { backgroundColor: '#7f1d1d' }]} onPress={() => { toggleMenu(); onExcluirTodas(); }}>
                        <Text style={styles.miniFabIcon}>🗑️</Text>
                    </TouchableOpacity>
                </View>
            </Animated.View>

            {/* BOTÃO PRINCIPAL ANIMADO (+ VIRA X) */}
            <Animated.View
                style={[
                    styles.botaoFlutuanteBase,
                    {
                        right: 25,
                        zIndex: 10,
                        transform: [
                            {
                                rotate: fadeAnim.interpolate({
                                    inputRange: [0, 1],
                                    outputRange: ['0deg', '45deg']
                                })
                            }
                        ],
                        backgroundColor: fadeAnim.interpolate({
                            inputRange: [0, 1],
                            outputRange: ['#D4A25F', '#7f1d1d']
                        })
                    }
                ]}
            >
                <TouchableOpacity
                    style={{ width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' }}
                    onPress={toggleMenu}
                    activeOpacity={0.8}
                >
                    <Text style={styles.botaoFlutuanteTexto}>+</Text>
                </TouchableOpacity>
            </Animated.View>
        </>
    );
}