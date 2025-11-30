// In app/screens/LaunchScreen.tsx
import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Animated } from 'react-native'; // ADDED: Animated
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts } from '../theme/theme';

export default function LaunchScreen({ navigation }: any) {
    const pulseAnim = React.useRef(new Animated.Value(1)).current;
    const rotateAnim = React.useRef(new Animated.Value(0)).current;
    const particleAnims = React.useRef(
        Array.from({ length: 8 }, () => ({
            x: new Animated.Value(0),
            y: new Animated.Value(0),
            opacity: new Animated.Value(0),
        }))
    ).current;

    useEffect(() => {
        // Pulse animation for the icon
        Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, {
                    toValue: 1.15,
                    duration: 1500,
                    useNativeDriver: true,
                }),
                Animated.timing(pulseAnim, {
                    toValue: 1,
                    duration: 1500,
                    useNativeDriver: true,
                }),
            ])
        ).start();

        // Rotation animation for the icon
        Animated.loop(
            Animated.timing(rotateAnim, {
                toValue: 1,
                duration: 8000,
                useNativeDriver: true,
            })
        ).start();

        // Particle animations
        particleAnims.forEach((particle, index) => {
            const angle = (index / particleAnims.length) * Math.PI * 2;
            const distance = 80;

            Animated.loop(
                Animated.sequence([
                    Animated.parallel([
                        Animated.timing(particle.x, {
                            toValue: Math.cos(angle) * distance,
                            duration: 2000,
                            useNativeDriver: true,
                        }),
                        Animated.timing(particle.y, {
                            toValue: Math.sin(angle) * distance,
                            duration: 2000,
                            useNativeDriver: true,
                        }),
                        Animated.timing(particle.opacity, {
                            toValue: 1,
                            duration: 1000,
                            useNativeDriver: true,
                        }),
                    ]),
                    Animated.parallel([
                        Animated.timing(particle.x, {
                            toValue: 0,
                            duration: 2000,
                            useNativeDriver: true,
                        }),
                        Animated.timing(particle.y, {
                            toValue: 0,
                            duration: 2000,
                            useNativeDriver: true,
                        }),
                        Animated.timing(particle.opacity, {
                            toValue: 0,
                            duration: 1000,
                            useNativeDriver: true,
                        }),
                    ]),
                ])
            ).start();
        });
    }, []);

    const spin = rotateAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '360deg'],
    });

    return (
        <SafeAreaView style={styles.container}>
            {/* Main Content */}
            <View style={styles.mainContent}>
                <View style={styles.particleContainer}>
                    {particleAnims.map((particle, index) => (
                        <Animated.View
                            key={index}
                            style={[
                                styles.particle,
                                {
                                    transform: [
                                        { translateX: particle.x },
                                        { translateY: particle.y },
                                    ],
                                    opacity: particle.opacity,
                                },
                            ]}
                        />
                    ))}
                </View>

                <Animated.View
                    style={{
                        transform: [{ scale: pulseAnim }, { rotate: spin }],
                    }}
                >
                    <Ionicons name="scan-circle-outline" size={120} color={colors.primary} />
                </Animated.View>

                <Text style={styles.title}>SiyensyaGo</Text>
                <Text style={styles.subtitle}>Tuklasin ang Agham sa Paligid Mo.</Text>
            </View>

            <View style={styles.footer}>
                <ActivityIndicator color={colors.primary} />
                <Text style={styles.footerText}>Initializing Discovery Module...</Text>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
        justifyContent: 'center',
    },
    mainContent: {
        justifyContent: 'center',
        alignItems: 'center',
        gap: 10,
        marginBottom: 100,
    },
    particleContainer: {
        position: 'absolute',
        width: 200,
        height: 200,
        justifyContent: 'center',
        alignItems: 'center',
    },
    particle: {
        position: 'absolute',
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: colors.primary,
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.8,
        shadowRadius: 4,
        elevation: 5,
    },
    title: {
        fontFamily: fonts.heading,
        color: colors.text,
        fontSize: 48,
        letterSpacing: 2,
    },
    subtitle: {
        fontFamily: fonts.body,
        color: colors.primary,
        fontSize: 16,
    },
    footer: {
        position: 'absolute',
        bottom: 40,
        left: 0,
        right: 0,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 10,
    },
    footerText: {
        fontFamily: fonts.body,
        color: colors.lightGray,
        fontSize: 14,
    },
});