// app/screens/LaunchScreen.tsx
import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing, Image, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, fonts } from '../theme/theme';

const { width } = Dimensions.get('window');

export default function LaunchScreen() {
    const rocketAnim = useRef(new Animated.Value(0)).current; // Float Y
    const opacityAnim = useRef(new Animated.Value(0)).current; // Text Fade

    // Ripple Animations
    const ripple1 = useRef(new Animated.Value(0)).current;
    const ripple2 = useRef(new Animated.Value(0)).current;
    const ripple3 = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        // 1. Text Fade In
        Animated.timing(opacityAnim, {
            toValue: 1,
            duration: 800,
            delay: 300,
            useNativeDriver: true,
        }).start();

        // 2. Rocket Hover (Floating)
        Animated.loop(
            Animated.sequence([
                Animated.timing(rocketAnim, {
                    toValue: -20,
                    duration: 1500,
                    easing: Easing.inOut(Easing.ease),
                    useNativeDriver: true,
                }),
                Animated.timing(rocketAnim, {
                    toValue: 0,
                    duration: 1500,
                    easing: Easing.inOut(Easing.ease),
                    useNativeDriver: true,
                }),
            ])
        ).start();

        // 3. Ripple Effect (Staggered)
        const createRipple = (anim: Animated.Value, delay: number) => {
            return Animated.loop(
                Animated.sequence([
                    Animated.delay(delay),
                    Animated.parallel([
                        Animated.timing(anim, {
                            toValue: 1,
                            duration: 2000,
                            easing: Easing.out(Easing.ease),
                            useNativeDriver: true,
                        }),
                        Animated.timing(anim, {
                            toValue: 0, // Reset purely for loop logic, opacity handles visual reset
                            duration: 0,
                            useNativeDriver: true,
                        })
                    ])
                ])
            );
        };

        createRipple(ripple1, 0).start();
        createRipple(ripple2, 600).start();
        createRipple(ripple3, 1200).start();

    }, []);

    // Helper to interpolate ripple styles
    const getRippleStyle = (anim: Animated.Value) => ({
        transform: [
            { scale: anim.interpolate({ inputRange: [0, 1], outputRange: [0.5, 2.5] }) }
        ],
        opacity: anim.interpolate({ inputRange: [0, 1], outputRange: [0.6, 0] }),
    });

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.content}>
                {/* Background Ripples */}
                <View style={styles.rippleContainer}>
                    <Animated.View style={[styles.ripple, getRippleStyle(ripple1)]} />
                    <Animated.View style={[styles.ripple, getRippleStyle(ripple2)]} />
                    <Animated.View style={[styles.ripple, getRippleStyle(ripple3)]} />
                </View>

                {/* Rocket Logo */}
                <Animated.View
                    style={{
                        transform: [{ translateY: rocketAnim }]
                    }}
                >
                    <Image
                        source={require('../../assets/adaptive-icon.png')}
                        style={styles.logo}
                        resizeMode="contain"
                    />
                </Animated.View>

                {/* App Title */}
                <Animated.View style={{ opacity: opacityAnim, alignItems: 'center', marginTop: 40 }}>
                    <Text style={styles.title}>SiyensyaGo</Text>
                    <Text style={styles.subtitle}>Tuklasin ang Agham.</Text>
                </Animated.View>
            </View>

            <View style={styles.footer}>
                <Text style={styles.footerText}>Initializing AI Core...</Text>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background, // Deep Space Blue
        justifyContent: 'center',
        alignItems: 'center',
    },
    content: {
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 50,
        width: '100%',
        height: 400, // Fixed height container for centering
    },
    rippleContainer: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: -1,
    },
    ripple: {
        position: 'absolute',
        width: 200,
        height: 200,
        borderRadius: 100,
        borderWidth: 2,
        borderColor: colors.primary,
        backgroundColor: 'rgba(0, 191, 255, 0.1)',
    },
    logo: {
        width: 280, // Increased size as requested
        height: 280,
        zIndex: 10,
    },
    title: {
        fontFamily: fonts.heading,
        fontSize: 48,
        color: colors.text,
        letterSpacing: 1.5,
        textShadowColor: colors.primary,
        textShadowOffset: { width: 0, height: 0 },
        textShadowRadius: 20,
    },
    subtitle: {
        fontFamily: fonts.body,
        fontSize: 18,
        color: colors.secondary,
        marginTop: 8,
        letterSpacing: 2,
    },
    footer: {
        position: 'absolute',
        bottom: 50,
    },
    footerText: {
        fontFamily: fonts.body,
        color: colors.lightGray,
        fontSize: 12,
        opacity: 0.8,
    },
});