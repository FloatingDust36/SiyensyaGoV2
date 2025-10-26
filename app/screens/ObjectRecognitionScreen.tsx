// app/screens/ObjectRecognitionScreen.tsx

import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, Image, ActivityIndicator, TouchableOpacity, Animated } from 'react-native';
import { RouteProp, useRoute, useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/types';
import { colors, fonts } from '../theme/theme';
import { detectObjectsInImage } from '../services/gemini';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { sessionManager } from '../utils/sessionManager';

type ObjectRecognitionScreenRouteProp = RouteProp<RootStackParamList, 'ObjectRecognition'>;
type NavigationProp = StackNavigationProp<RootStackParamList>;

export default function ObjectRecognitionScreen() {
    const route = useRoute<ObjectRecognitionScreenRouteProp>();
    const navigation = useNavigation<NavigationProp>();
    const { imageUri } = route.params;

    const [isDetecting, setIsDetecting] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Animation refs
    const scanLineAnim = useRef(new Animated.Value(0)).current;
    const pulseAnim = useRef(new Animated.Value(1)).current;
    const rotateAnim = useRef(new Animated.Value(0)).current;
    const particleAnims = useRef(
        Array.from({ length: 6 }, () => ({
            x: new Animated.Value(0),
            y: new Animated.Value(0),
            opacity: new Animated.Value(0),
            scale: new Animated.Value(0),
        }))
    ).current;

    // Start animations
    useEffect(() => {
        // Progress bar
        Animated.loop(
            Animated.sequence([
                Animated.timing(scanLineAnim, {
                    toValue: 1,
                    duration: 2000,
                    useNativeDriver: false,
                }),
                Animated.timing(scanLineAnim, {
                    toValue: 0,
                    duration: 0,
                    useNativeDriver: false,
                }),
            ])
        ).start();

        // Pulse animation
        Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, {
                    toValue: 1.15,
                    duration: 1000,
                    useNativeDriver: true,
                }),
                Animated.timing(pulseAnim, {
                    toValue: 1,
                    duration: 1000,
                    useNativeDriver: true,
                }),
            ])
        ).start();

        // Rotation
        Animated.loop(
            Animated.timing(rotateAnim, {
                toValue: 1,
                duration: 3000,
                useNativeDriver: true,
            })
        ).start();

        // Particle animations
        particleAnims.forEach((particle, index) => {
            const angle = (index / particleAnims.length) * Math.PI * 2;
            const distance = 60;

            Animated.loop(
                Animated.sequence([
                    Animated.parallel([
                        Animated.timing(particle.x, {
                            toValue: Math.cos(angle) * distance,
                            duration: 1500,
                            useNativeDriver: true,
                        }),
                        Animated.timing(particle.y, {
                            toValue: Math.sin(angle) * distance,
                            duration: 1500,
                            useNativeDriver: true,
                        }),
                        Animated.timing(particle.opacity, {
                            toValue: 0.8,
                            duration: 750,
                            useNativeDriver: true,
                        }),
                        Animated.timing(particle.scale, {
                            toValue: 1,
                            duration: 750,
                            useNativeDriver: true,
                        }),
                    ]),
                    Animated.parallel([
                        Animated.timing(particle.opacity, {
                            toValue: 0,
                            duration: 750,
                            useNativeDriver: true,
                        }),
                        Animated.timing(particle.scale, {
                            toValue: 0,
                            duration: 750,
                            useNativeDriver: true,
                        }),
                    ]),
                ])
            ).start();
        });

        // Detection with Session Creation
        const performDetection = async () => {
            if (!imageUri) return;

            const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

            const [detectionResult] = await Promise.all([
                detectObjectsInImage(imageUri),
                delay(1500) // Minimum display time for UX
            ]);

            if ('error' in detectionResult) {
                setError(detectionResult.error);
            } else if (detectionResult.objects && detectionResult.objects.length > 0) {
                // Create Session with detected objects and scene context
                try {
                    const sessionId = await sessionManager.createSession(
                        imageUri,
                        detectionResult.objects,
                        detectionResult.sceneContext // Optional scene context
                    );

                    console.log(`✓ Created session ${sessionId} with ${detectionResult.objects.length} objects`);

                    // Log scene context if available
                    if (detectionResult.sceneContext) {
                        console.log(`📍 Scene: ${detectionResult.sceneContext.location}`);
                    }

                    // Success haptic
                    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

                    // NAVIGATE TO OBJECTSELECTION WITH SESSION DATA=
                    navigation.replace('ObjectSelection', {
                        sessionId,
                        imageUri,
                        detectedObjects: detectionResult.objects,
                    });

                } catch (sessionError) {
                    console.error('Error creating session:', sessionError);
                    // Even if session creation fails, still navigate
                    // (fallback to sessionless mode)
                    navigation.replace('ObjectSelection', {
                        imageUri,
                        detectedObjects: detectionResult.objects,
                    });
                }
            } else {
                setError('No objects detected in the image. Please try again with a clearer photo.');
            }
            setIsDetecting(false);
        };

        performDetection();
    }, [imageUri]);

    const progressWidth = scanLineAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['0%', '100%'],
    });

    const spin = rotateAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '360deg'],
    });

    const handleRetake = () => {
        navigation.goBack();
    };

    // Error State
    if (error) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={[styles.content, { justifyContent: 'center' }]}>
                    <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
                        <Ionicons name="alert-circle-outline" size={100} color={colors.warning} />
                    </Animated.View>
                    <Text style={styles.errorTitle}>Detection Failed</Text>
                    <Text style={styles.errorText}>{error}</Text>

                    <View style={styles.errorSuggestions}>
                        <Text style={styles.suggestionTitle}>Try these solutions:</Text>
                        <View style={styles.suggestionItem}>
                            <Ionicons name="checkmark-circle-outline" size={20} color={colors.primary} />
                            <Text style={styles.suggestionText}>Ensure good lighting</Text>
                        </View>
                        <View style={styles.suggestionItem}>
                            <Ionicons name="checkmark-circle-outline" size={20} color={colors.primary} />
                            <Text style={styles.suggestionText}>Focus on clear objects</Text>
                        </View>
                        <View style={styles.suggestionItem}>
                            <Ionicons name="checkmark-circle-outline" size={20} color={colors.primary} />
                            <Text style={styles.suggestionText}>Avoid blurry photos</Text>
                        </View>
                    </View>

                    <TouchableOpacity style={styles.retakeButton} onPress={handleRetake}>
                        <Ionicons name="camera-outline" size={24} color={colors.background} />
                        <Text style={styles.retakeButtonText}>Try Again</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    // Loading State
    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.content}>
                <View style={styles.imageContainer}>
                    <Image source={{ uri: imageUri }} style={styles.image} />
                </View>

                <View style={styles.statusContainer}>
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
                                            { scale: particle.scale },
                                        ],
                                        opacity: particle.opacity,
                                    },
                                ]}
                            />
                        ))}

                        <Animated.View style={{ transform: [{ rotate: spin }] }}>
                            <Ionicons name="scan-circle-outline" size={60} color={colors.primary} />
                        </Animated.View>
                    </View>

                    <Text style={styles.statusText}>Detecting Objects...</Text>
                    <Text style={styles.subStatusText}>Analyzing your photo with AI</Text>

                    <View style={styles.progressBarContainer}>
                        <Animated.View style={[styles.progressBar, { width: progressWidth }]} />
                    </View>
                </View>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    content: {
        flex: 1,
        justifyContent: 'flex-start',
        alignItems: 'center',
        padding: 20,
        paddingTop: 10,
    },
    imageContainer: {
        width: '90%',
        aspectRatio: 1,
        borderRadius: 20,
        marginBottom: 10,
        marginTop: 10,
        overflow: 'hidden',
    },
    image: {
        width: '100%',
        height: '100%',
        borderRadius: 20,
        borderWidth: 4,
        borderColor: colors.primary,
    },
    statusContainer: {
        alignItems: 'center',
        gap: 8,
        marginBottom: 20,
    },
    particleContainer: {
        width: 120,
        height: 120,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 10,
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
    statusText: {
        fontFamily: fonts.heading,
        color: colors.primary,
        fontSize: 28,
    },
    subStatusText: {
        fontFamily: fonts.body,
        color: colors.lightGray,
        fontSize: 16,
    },
    progressBarContainer: {
        width: 200,
        height: 4,
        backgroundColor: '#1A1C2A',
        borderRadius: 2,
        overflow: 'hidden',
        marginTop: 10,
    },
    progressBar: {
        height: '100%',
        backgroundColor: colors.primary,
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.8,
        shadowRadius: 4,
        elevation: 3,
    },
    errorTitle: {
        fontFamily: fonts.heading,
        color: colors.warning,
        fontSize: 28,
        marginTop: 20,
        marginBottom: 10,
    },
    errorText: {
        fontFamily: fonts.body,
        color: colors.lightGray,
        fontSize: 16,
        textAlign: 'center',
        paddingHorizontal: 20,
        marginBottom: 30,
    },
    errorSuggestions: {
        backgroundColor: '#1A1C2A',
        borderRadius: 15,
        padding: 20,
        width: '100%',
        marginBottom: 20,
        borderWidth: 1,
        borderColor: 'rgba(255, 69, 0, 0.3)',
    },
    suggestionTitle: {
        fontFamily: fonts.heading,
        color: colors.primary,
        fontSize: 16,
        marginBottom: 15,
    },
    suggestionItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginBottom: 10,
    },
    suggestionText: {
        fontFamily: fonts.body,
        color: colors.lightGray,
        fontSize: 14,
    },
    retakeButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingVertical: 18,
        paddingHorizontal: 40,
        borderRadius: 30,
        backgroundColor: colors.primary,
        marginTop: 10,
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 5,
    },
    retakeButtonText: {
        fontFamily: fonts.heading,
        color: colors.background,
        fontSize: 18,
    },
});