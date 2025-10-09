// In app/screens/ObjectRecognitionScreen.tsx
import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, Image, ActivityIndicator, TouchableOpacity, Animated } from 'react-native';
import { RouteProp, useRoute, useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList, AnalysisResult } from '../navigation/types';
import { colors, fonts } from '../theme/theme';
import { analyzeImageWithGemini } from '../services/gemini';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../context/AppContext';

type ObjectRecognitionScreenRouteProp = RouteProp<RootStackParamList, 'ObjectRecognition'>;
type NavigationProp = StackNavigationProp<RootStackParamList>;

export default function ObjectRecognitionScreen() {
    const route = useRoute<ObjectRecognitionScreenRouteProp>();
    const navigation = useNavigation<NavigationProp>();
    const { imageUri } = route.params;
    const { user } = useApp();

    const [isAnalyzing, setIsAnalyzing] = useState(true);
    const [result, setResult] = useState<AnalysisResult | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [loadingMessage, setLoadingMessage] = useState('Initializing AI scanner...');

    const scanProgress = useRef(new Animated.Value(0)).current;
    const pulseAnim = useRef(new Animated.Value(1)).current;
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const scaleAnim = useRef(new Animated.Value(0.8)).current;
    const rotateAnim = useRef(new Animated.Value(0)).current;

    // Particle animations
    const particleAnims = useRef(
        Array.from({ length: 6 }, () => ({
            x: new Animated.Value(0),
            y: new Animated.Value(0),
            opacity: new Animated.Value(0),
            scale: new Animated.Value(0),
        }))
    ).current;

    useEffect(() => {
        if (isAnalyzing) {
            const messages = [
                'Initializing AI scanner...',
                'Analyzing image patterns...',
                'Detecting object features...',
                'Processing visual data...',
                'Identifying object type...',
                'Calculating confidence score...',
                'Almost there...'
            ];

            let currentIndex = 0;
            const messageInterval = setInterval(() => {
                currentIndex = (currentIndex + 1) % messages.length;
                setLoadingMessage(messages[currentIndex]);
            }, 2000); // Change message every 2 seconds

            return () => clearInterval(messageInterval);
        }
    }, [isAnalyzing]);

    useEffect(() => {
        // Start analyzing animations
        if (isAnalyzing) {
            // Progress bar animation
            Animated.loop(
                Animated.sequence([
                    Animated.timing(scanProgress, {
                        toValue: 1,
                        duration: 2000,
                        useNativeDriver: false,
                    }),
                    Animated.timing(scanProgress, {
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

            // Rotation animation
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
        }

        const performAnalysis = async () => {
            if (!imageUri) return;

            const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

            const [analysisResult] = await Promise.all([
                analyzeImageWithGemini(imageUri, user.gradeLevel),
                delay(1500)
            ]);

            if ('error' in analysisResult) {
                setError(analysisResult.error);
            } else {
                setResult(analysisResult as AnalysisResult);

                // Fade in result animation
                Animated.parallel([
                    Animated.timing(fadeAnim, {
                        toValue: 1,
                        duration: 500,
                        useNativeDriver: true,
                    }),
                    Animated.spring(scaleAnim, {
                        toValue: 1,
                        tension: 50,
                        friction: 7,
                        useNativeDriver: true,
                    }),
                ]).start();
            }
            setIsAnalyzing(false);
        };

        performAnalysis();
    }, [imageUri]);

    // Animation interpolations
    const progressWidth = scanProgress.interpolate({
        inputRange: [0, 1],
        outputRange: ['0%', '100%'],
    });

    const spin = rotateAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '360deg'],
    });

    const handleConfirm = () => {
        if (result) {
            const safeResult: AnalysisResult = {
                objectName: String(result.objectName || 'Unknown Object'),
                confidence: Number(result.confidence || 0),
                category: String(result.category || 'No information available.'),
                funFact: String(result.funFact || 'No information available.'),
                the_science_in_action: String(result.the_science_in_action || 'No information available.'),
                why_it_matters_to_you: String(result.why_it_matters_to_you || 'No information available.'),
                tryThis: String(result.tryThis || 'No information available.'),
                explore_further: String(result.explore_further || 'No information available.'),
            };
            navigation.replace('LearningContent', { imageUri, result: safeResult });
        }
    };

    const handleRetake = () => {
        navigation.goBack();
    };

    // Error State
    if (error) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={[styles.content, { justifyContent: 'center' }]}>
                    {/* Animated error icon */}
                    <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
                        <Ionicons name="alert-circle-outline" size={100} color={colors.warning} />
                    </Animated.View>
                    <Text style={styles.errorTitle}>Analysis Failed</Text>
                    <Text style={styles.errorText}>{error}</Text>

                    {/* Error suggestions */}
                    <View style={styles.errorSuggestions}>
                        <Text style={styles.suggestionTitle}>Try these solutions:</Text>
                        <View style={styles.suggestionItem}>
                            <Ionicons name="checkmark-circle-outline" size={20} color={colors.primary} />
                            <Text style={styles.suggestionText}>Ensure good lighting</Text>
                        </View>
                        <View style={styles.suggestionItem}>
                            <Ionicons name="checkmark-circle-outline" size={20} color={colors.primary} />
                            <Text style={styles.suggestionText}>Hold camera steady</Text>
                        </View>
                        <View style={styles.suggestionItem}>
                            <Ionicons name="checkmark-circle-outline" size={20} color={colors.primary} />
                            <Text style={styles.suggestionText}>Get closer to object</Text>
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

    // Main View
    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.content}>
                {/* Image with border and glow */}
                <View style={styles.imageContainer}>
                    <Image source={{ uri: imageUri }} style={styles.image} />
                </View>

                {isAnalyzing ? (
                    <View style={styles.statusContainer}>
                        {/* Particle effects around loading indicator */}
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

                            {/* Animated loading indicator */}
                            <Animated.View style={{ transform: [{ rotate: spin }] }}>
                                <Ionicons name="scan-circle-outline" size={60} color={colors.primary} />
                            </Animated.View>
                        </View>

                        <Text style={styles.statusText}>Analyzing...</Text>
                        <Text style={styles.subStatusText}>{loadingMessage}</Text>

                        {/* Progress bar */}
                        <View style={styles.progressBarContainer}>
                            <Animated.View style={[styles.progressBar, { width: progressWidth }]} />
                        </View>
                    </View>
                ) : (
                    // Result with fade-in animation
                    <Animated.View
                        style={[
                            styles.statusContainer,
                            {
                                opacity: fadeAnim,
                                transform: [{ scale: scaleAnim }]
                            }
                        ]}
                    >
                        {/* Success icon with confidence indicator */}
                        <View style={styles.resultIconContainer}>
                            <Ionicons
                                name={(result?.confidence ?? 0) >= 75 ? "checkmark-circle" : "help-circle"}
                                size={60}
                                color={(result?.confidence ?? 0) >= 75 ? colors.success : colors.warning}
                            />
                            {/* Confidence ring */}
                            <View style={styles.confidenceRing}>
                                <Text style={styles.confidencePercentage}>{result?.confidence}%</Text>
                            </View>
                        </View>

                        <Text style={styles.promptText}>
                            {(result?.confidence ?? 0) >= 75 ? "I found:" : "I think this is:"}
                        </Text>
                        <Text style={styles.objectName}>{result?.objectName}</Text>

                        {/* Enhanced confidence display */}
                        <View style={styles.confidenceContainer}>
                            <View style={styles.confidenceBadge}>
                                <Ionicons
                                    name={(result?.confidence ?? 0) >= 75 ? "shield-checkmark" : "information-circle"}
                                    size={20}
                                    color={(result?.confidence ?? 0) >= 75 ? colors.success : colors.warning}
                                />
                                <Text style={[
                                    styles.confidenceText,
                                    { color: (result?.confidence ?? 0) >= 75 ? colors.success : colors.warning }
                                ]}>
                                    {(result?.confidence ?? 0) >= 75 ? 'High Confidence' : 'Moderate Confidence'}
                                </Text>
                            </View>
                        </View>

                    </Animated.View>
                )}
            </View>

            {!isAnalyzing && (
                <View style={styles.footer}>
                    <Text style={styles.confirmPrompt}>Is this correct?</Text>
                    <View style={styles.buttonContainer}>
                        <TouchableOpacity style={styles.noButton} onPress={handleRetake}>
                            <Ionicons name="close" size={24} color={colors.warning} />
                            <Text style={styles.noButtonText}>No, Retake</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.yesButton} onPress={handleConfirm}>
                            <Ionicons name="checkmark" size={24} color={colors.background} />
                            <Text style={styles.yesButtonText}>Yes, Continue</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            )}
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
        position: 'relative',
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
    resultIconContainer: {
        position: 'relative',
        marginBottom: 10,
    },
    confidenceRing: {
        position: 'absolute',
        bottom: -5,
        right: -5,
        width: 35,
        height: 35,
        borderRadius: 17.5,
        backgroundColor: colors.background,
        borderWidth: 2,
        borderColor: colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
    },
    confidencePercentage: {
        fontFamily: fonts.heading,
        fontSize: 10,
        color: colors.primary,
    },
    promptText: {
        fontFamily: fonts.body,
        color: colors.lightGray,
        fontSize: 18,
    },
    objectName: {
        fontFamily: fonts.heading,
        color: colors.text,
        fontSize: 32,
        textAlign: 'center',
        marginVertical: 5,
    },
    confidenceContainer: {
        marginTop: 10,
    },
    confidenceBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: 'rgba(0, 191, 255, 0.1)',
        paddingHorizontal: 15,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: 'rgba(0, 191, 255, 0.3)',
    },
    confidenceText: {
        fontFamily: fonts.heading,
        fontSize: 14,
    },
    footer: {
        paddingHorizontal: 20,
        paddingBottom: 40,
    },
    confirmPrompt: {
        fontFamily: fonts.heading,
        color: colors.primary,
        fontSize: 18,
        textAlign: 'center',
        marginBottom: 15,
    },
    buttonContainer: {
        flexDirection: 'row',
        gap: 15,
    },
    noButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        paddingVertical: 18,
        borderRadius: 30,
        borderWidth: 2,
        borderColor: colors.warning,
    },
    noButtonText: {
        fontFamily: fonts.heading,
        color: colors.warning,
        fontSize: 12,
    },
    yesButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        paddingVertical: 18,
        borderRadius: 30,
        backgroundColor: colors.primary,
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 5,
    },
    yesButtonText: {
        fontFamily: fonts.heading,
        color: colors.background,
        fontSize: 12,
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