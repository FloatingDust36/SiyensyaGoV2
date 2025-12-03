import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Animated } from 'react-native';
import { colors, fonts } from '../theme/theme';
import { Ionicons } from '@expo/vector-icons';

const FACTS = [
    "Honey never spoils. Archaeologists found 3,000-year-old honey in tombs!",
    "A bolt of lightning has enough energy to toast 100,000 slices of bread.",
    "Bananas are slightly radioactive because of potassium-40.",
    "Octopuses have three hearts and blue blood.",
    "Hot water can freeze faster than cold water. It's called the Mpemba effect.",
    "The Philippines has over 7,600 islands!",
    "Bamboo can grow up to 91 cm (35 inches) in a single day!",
    "Your brain generates enough electricity to power a small light bulb.",
    "Wombat poop is cube-shaped to stop it from rolling away.",
    "The Eiffel Tower can be 15 cm taller during the summer due to thermal expansion."
];

type FactLoaderProps = {
    message?: string;
};

export default function FactLoader({ message = "Analyzing..." }: FactLoaderProps) {
    const [factIndex, setFactIndex] = useState(0);
    const fadeAnim = React.useRef(new Animated.Value(1)).current;

    useEffect(() => {
        const interval = setInterval(() => {
            // Fade out
            Animated.timing(fadeAnim, {
                toValue: 0,
                duration: 500,
                useNativeDriver: true,
            }).start(() => {
                // Change fact
                setFactIndex((prev) => (prev + 1) % FACTS.length);
                // Fade in
                Animated.timing(fadeAnim, {
                    toValue: 1,
                    duration: 500,
                    useNativeDriver: true,
                }).start();
            });
        }, 4000); // Change fact every 4 seconds

        return () => clearInterval(interval);
    }, []);

    return (
        <View style={styles.container}>
            <View style={styles.content}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={styles.loadingText}>{message}</Text>

                <View style={styles.divider} />

                <View style={styles.factContainer}>
                    <Ionicons name="bulb" size={24} color={colors.warning} style={styles.icon} />
                    <Text style={styles.factLabel}>DID YOU KNOW?</Text>
                </View>

                <Animated.Text style={[styles.factText, { opacity: fadeAnim }]}>
                    "{FACTS[factIndex]}"
                </Animated.Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        ...StyleSheet.absoluteFillObject, // Covers the whole screen
        backgroundColor: 'rgba(13, 15, 24, 0.95)', // Dark semi-transparent background
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000,
        padding: 20,
    },
    content: {
        width: '100%',
        alignItems: 'center',
    },
    loadingText: {
        fontFamily: fonts.heading,
        fontSize: 18,
        color: colors.primary,
        marginTop: 15,
        marginBottom: 20,
    },
    divider: {
        width: 60,
        height: 2,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        marginBottom: 20,
    },
    factContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
        gap: 8,
    },
    icon: {
        marginBottom: 2,
    },
    factLabel: {
        fontFamily: fonts.heading,
        fontSize: 14,
        color: colors.warning,
        letterSpacing: 2,
    },
    factText: {
        fontFamily: fonts.body,
        fontSize: 16,
        color: colors.text,
        textAlign: 'center',
        lineHeight: 24,
        minHeight: 80,
    },
});