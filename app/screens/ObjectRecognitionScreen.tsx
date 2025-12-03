// app/screens/ObjectRecognitionScreen.tsx

import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, Animated, Easing, ActivityIndicator } from 'react-native';
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

const ANALYSIS_STEPS = [
    "Initializing neural network...",
    "Enhancing image resolution...",
    "Detecting edges and contours...",
    "Extracting features...",
    "Matching patterns in database...",
    "Verifying scientific context...",
    "Finalizing results..."
];

export default function ObjectRecognitionScreen() {
    const route = useRoute<ObjectRecognitionScreenRouteProp>();
    const navigation = useNavigation<NavigationProp>();
    const { imageUri } = route.params;

    const [error, setError] = useState<string | null>(null);
    const [currentStep, setCurrentStep] = useState(0);

    // Animations
    const scanLineAnim = useRef(new Animated.Value(0)).current;
    const pulseAnim = useRef(new Animated.Value(1)).current;
    const textFadeAnim = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        // 1. Scanning Line Animation (Up and Down loop)
        Animated.loop(
            Animated.sequence([
                Animated.timing(scanLineAnim, {
                    toValue: 1,
                    duration: 2000,
                    easing: Easing.linear,
                    useNativeDriver: true,
                }),
                Animated.timing(scanLineAnim, {
                    toValue: 0,
                    duration: 2000,
                    easing: Easing.linear,
                    useNativeDriver: true,
                }),
            ])
        ).start();

        // 2. Analysis Steps Cycler
        const stepInterval = setInterval(() => {
            // Fade out
            Animated.timing(textFadeAnim, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => {
                setCurrentStep((prev) => (prev + 1) % ANALYSIS_STEPS.length);
                // Fade in
                Animated.timing(textFadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }).start();
            });
        }, 1200); // Change text every 1.2 seconds

        // 3. Perform Detection
        const performDetection = async () => {
            if (!imageUri) return;

            // Wait at least 2.5s so the user enjoys the animation
            const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

            const [detectionResult] = await Promise.all([
                detectObjectsInImage(imageUri),
                delay(3000)
            ]);

            clearInterval(stepInterval);

            if ('error' in detectionResult) {
                setError(detectionResult.error);
            } else if (detectionResult.objects && detectionResult.objects.length > 0) {
                try {
                    const sessionId = await sessionManager.createSession(
                        imageUri,
                        detectionResult.objects,
                        detectionResult.sceneContext
                    );

                    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

                    navigation.replace('ObjectSelection', {
                        sessionId,
                        imageUri,
                        detectedObjects: detectionResult.objects,
                    });

                } catch (sessionError) {
                    console.error('❌ Error creating session:', sessionError);
                    setError('Failed to create discovery session. Please try again.');
                }
            } else {
                setError('No objects detected. Try a clearer photo.');
            }
        };

        performDetection();

        return () => clearInterval(stepInterval);
    }, [imageUri]);

    const handleRetake = () => {
        navigation.goBack();
    };

    // Interpolate scan line position
    const translateY = scanLineAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0, 350], // Approx height of the scanning area
    });

    // Error View
    if (error) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.contentCenter}>
                    <Ionicons name="alert-circle-outline" size={80} color={colors.warning} />
                    <Text style={styles.errorTitle}>Scan Failed</Text>
                    <Text style={styles.errorText}>{error}</Text>
                    <TouchableOpacity style={styles.retakeButton} onPress={handleRetake}>
                        <Ionicons name="camera-reverse" size={20} color={colors.background} />
                        <Text style={styles.retakeButtonText}>Try Again</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.content}>
                <Text style={styles.headerText}>ANALYZING TARGET...</Text>

                {/* HUD Container */}
                <View style={styles.scannerContainer}>
                    {/* The Image */}
                    <Image source={{ uri: imageUri }} style={styles.image} />

                    {/* Scan Line */}
                    <Animated.View
                        style={[
                            styles.scanLine,
                            { transform: [{ translateY }] }
                        ]}
                    />

                    {/* HUD Corners */}
                    <View style={[styles.corner, styles.topLeft]} />
                    <View style={[styles.corner, styles.topRight]} />
                    <View style={[styles.corner, styles.bottomLeft]} />
                    <View style={[styles.corner, styles.bottomRight]} />

                    {/* Dark Overlay for "Tech" feel */}
                    <View style={styles.gridOverlay} />
                </View>

                {/* Dynamic Status Text */}
                <View style={styles.statusContainer}>
                    <ActivityIndicator size="small" color={colors.primary} style={{ marginRight: 10 }} />
                    <Animated.Text style={[styles.statusText, { opacity: textFadeAnim }]}>
                        {ANALYSIS_STEPS[currentStep]}
                    </Animated.Text>
                </View>

                {/* Tip */}
                <Text style={styles.tipText}>Keep the app open while we identify objects.</Text>
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
        alignItems: 'center',
        paddingTop: 40,
    },
    contentCenter: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    headerText: {
        fontFamily: fonts.heading,
        color: colors.primary,
        fontSize: 16,
        letterSpacing: 2,
        marginBottom: 30,
    },
    scannerContainer: {
        width: 300,
        height: 350, // Taller for portrait objects
        borderRadius: 20,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(0, 191, 255, 0.3)',
        backgroundColor: '#000',
        position: 'relative',
    },
    image: {
        width: '100%',
        height: '100%',
        opacity: 0.8, // Slightly dim image to make scanner pop
    },
    scanLine: {
        position: 'absolute',
        width: '100%',
        height: 4,
        backgroundColor: colors.primary,
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 1,
        shadowRadius: 10,
        elevation: 5,
        zIndex: 10,
    },
    gridOverlay: {
        ...StyleSheet.absoluteFillObject,
        borderWidth: 1,
        borderColor: 'rgba(0, 191, 255, 0.1)',
        zIndex: 1,
    },
    corner: {
        position: 'absolute',
        width: 30,
        height: 30,
        borderColor: colors.primary,
        zIndex: 20,
    },
    topLeft: {
        top: 0,
        left: 0,
        borderTopWidth: 3,
        borderLeftWidth: 3,
        borderTopLeftRadius: 20,
    },
    topRight: {
        top: 0,
        right: 0,
        borderTopWidth: 3,
        borderRightWidth: 3,
        borderTopRightRadius: 20,
    },
    bottomLeft: {
        bottom: 0,
        left: 0,
        borderBottomWidth: 3,
        borderLeftWidth: 3,
        borderBottomLeftRadius: 20,
    },
    bottomRight: {
        bottom: 0,
        right: 0,
        borderBottomWidth: 3,
        borderRightWidth: 3,
        borderBottomRightRadius: 20,
    },
    statusContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 40,
        height: 40,
    },
    statusText: {
        fontFamily: fonts.body,
        color: colors.text,
        fontSize: 16,
    },
    tipText: {
        position: 'absolute',
        bottom: 50,
        fontFamily: fonts.body,
        color: colors.lightGray,
        fontSize: 12,
        textAlign: 'center',
    },
    errorTitle: {
        fontFamily: fonts.heading,
        color: colors.warning,
        fontSize: 24,
        marginTop: 20,
        marginBottom: 10,
    },
    errorText: {
        fontFamily: fonts.body,
        color: colors.lightGray,
        textAlign: 'center',
        marginBottom: 30,
    },
    retakeButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: colors.primary,
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 25,
    },
    retakeButtonText: {
        fontFamily: fonts.heading,
        color: colors.background,
        fontSize: 16,
    },
});