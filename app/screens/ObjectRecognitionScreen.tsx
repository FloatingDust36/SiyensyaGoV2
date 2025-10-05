// In app/screens/ObjectRecognitionScreen.tsx
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Image, ActivityIndicator, TouchableOpacity } from 'react-native';
import { RouteProp, useRoute, useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList, AnalysisResult } from '../navigation/types';
import { colors, fonts } from '../theme/theme';
import { analyzeImageWithGemini } from '../services/gemini';
import { Ionicons } from '@expo/vector-icons';

type ObjectRecognitionScreenRouteProp = RouteProp<RootStackParamList, 'ObjectRecognition'>;
type NavigationProp = StackNavigationProp<RootStackParamList>;

export default function ObjectRecognitionScreen() {
    const route = useRoute<ObjectRecognitionScreenRouteProp>();
    const navigation = useNavigation<NavigationProp>();
    const { imageUri } = route.params;

    const [isAnalyzing, setIsAnalyzing] = useState(true);
    const [result, setResult] = useState<AnalysisResult | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const performAnalysis = async () => {
            if (!imageUri) return;

            // --- REFINEMENT: Ensure a minimum loading time without unnecessary delay ---
            const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

            // Run the API call and a minimum delay in parallel
            const [analysisResult] = await Promise.all([
                analyzeImageWithGemini(imageUri),
                delay(1500) // Minimum 1.5 seconds loading time
            ]);

            if ('error' in analysisResult) {
                setError(analysisResult.error);
            } else {
                setResult(analysisResult as AnalysisResult);
            }
            setIsAnalyzing(false);
        };

        performAnalysis();
    }, [imageUri]);

    const handleConfirm = () => {
        if (result) {
            // Ensure all required properties exist
            const safeResult: AnalysisResult = {
                objectName: String(result.objectName || 'Unknown Object'),
                confidence: Number(result.confidence || 0),
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
                    <Ionicons name="alert-circle-outline" size={80} color={colors.warning} />
                    <Text style={styles.errorTitle}>Analysis Failed</Text>
                    <Text style={styles.errorText}>{error}</Text>
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
                <Image source={{ uri: imageUri }} style={styles.image} />

                {isAnalyzing ? (
                    <View style={styles.statusContainer}>
                        <ActivityIndicator size="large" color={colors.primary} />
                        <Text style={styles.statusText}>Analyzing...</Text>
                        <Text style={styles.subStatusText}>Connecting to SiyensyaGo AI</Text>
                    </View>
                ) : (
                    <View style={styles.statusContainer}>
                        <Text style={styles.promptText}>{(result?.confidence ?? 0) >= 75 ? "I found:" : "I think this is:"}</Text>
                        <Text style={styles.objectName}>{result?.objectName}</Text>
                        <View style={styles.confidenceContainer}>
                            <Ionicons name={(result?.confidence ?? 0) >= 75 ? "checkmark-circle" : "help-circle"} size={24} color={(result?.confidence ?? 0) >= 75 ? colors.success : colors.warning} />
                            <Text style={[styles.confidenceText, { color: (result?.confidence ?? 0) >= 75 ? colors.success : colors.warning }]}>
                                {result?.confidence}% confident
                            </Text>
                        </View>
                    </View>
                )}
            </View>

            {!isAnalyzing && (
                <View style={styles.footer}>
                    <Text style={styles.confirmPrompt}>Is this correct?</Text>
                    <View style={styles.buttonContainer}>
                        <TouchableOpacity style={styles.noButton} onPress={handleRetake}>
                            <Ionicons name="close" size={24} color={colors.warning} />
                            <Text style={styles.noButtonText}>No</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.yesButton} onPress={handleConfirm}>
                            <Ionicons name="checkmark" size={24} color={colors.background} />
                            <Text style={styles.yesButtonText}>Yes!</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            )}
        </SafeAreaView>
    );
}

// --- REFINED STYLES ---
const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    content: {
        flex: 1,
        justifyContent: 'center', // This centers the content vertically
        alignItems: 'center',
        padding: 20,
    },
    image: {
        width: '90%', // Use a percentage for responsiveness
        aspectRatio: 1, // Keep it square
        borderRadius: 20,
        marginBottom: 40, // Add space between image and text
        borderWidth: 3, // Add the border
        borderColor: 'rgba(0, 191, 255, 0.5)', // Thematic border color
    },
    statusContainer: {
        alignItems: 'center',
        gap: 10,
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
    promptText: {
        fontFamily: fonts.body,
        color: colors.lightGray,
        fontSize: 18,
    },
    objectName: {
        fontFamily: fonts.heading,
        color: colors.text,
        fontSize: 30,
        textAlign: 'center',
        marginVertical: 5,
    },
    confidenceContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginTop: 5,
    },
    confidenceText: {
        fontFamily: fonts.heading,
        fontSize: 16,
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
        fontSize: 18,
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
    },
    yesButtonText: {
        fontFamily: fonts.heading,
        color: colors.background,
        fontSize: 18,
    },
    // Error state styles
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
    },
    retakeButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingVertical: 18,
        paddingHorizontal: 40,
        borderRadius: 30,
        backgroundColor: colors.primary,
        marginTop: 30,
    },
    retakeButtonText: {
        fontFamily: fonts.heading,
        color: colors.background,
        fontSize: 18,
    },
});