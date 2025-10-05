// In app/screens/ObjectRecognitionScreen.tsx
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Image, ActivityIndicator, Alert } from 'react-native';
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

    const [isLoading, setIsLoading] = useState(true);
    const [result, setResult] = useState<AnalysisResult | null>(null);

    useEffect(() => {
        const performAnalysis = async () => {
            if (!imageUri) return;

            const analysisResult: AnalysisResult | { error: string } = await analyzeImageWithGemini(imageUri);

            if ('error' in analysisResult) {
                Alert.alert("Analysis Failed", analysisResult.error, [
                    { text: "Try Again", onPress: () => navigation.goBack() }
                ]);
            } else {
                setResult(analysisResult);
                setIsLoading(false);

                // Automatic progression to learning content after a short delay
                setTimeout(() => {
                    navigation.replace('LearningContent', { imageUri, result: analysisResult });
                }, 1800); // Wait 1.8 seconds to allow user to read the result
            }
        };

        performAnalysis();
    }, [imageUri, navigation]);

    // Renders the initial "Analyzing..." state
    const renderLoading = () => (
        <View style={styles.statusContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.statusText}>Analyzing Image...</Text>
            <Text style={styles.subStatusText}>Identifying scientific concepts</Text>
        </View>
    );

    const renderResult = () => {
        const isConfident = (result?.confidence ?? 0) >= 90;
        return (
            <View style={styles.statusContainer}>
                <Text style={styles.foundTitle}>
                    {isConfident ? "Here's what I found!" : "Hmm, I think it's a..."}
                </Text>
                <Text style={styles.statusText}>{result?.objectName}</Text>
                <View style={styles.confidenceContainer}>
                    <Ionicons name="checkmark-circle" size={20} color={colors.success} />
                    <Text style={styles.confidenceText}>Confidence: {result?.confidence}%</Text>
                </View>
            </View>
        );
    };

    return (
        // --- FIX: Use SafeAreaView with a background color instead of ImageBackground ---
        <SafeAreaView style={styles.container}>
            <View style={styles.content}>
                {/* --- FIX: The Image is now its own component --- */}
                <Image source={{ uri: imageUri }} style={styles.image} />

                {isLoading ? renderLoading() : renderResult()}
            </View>
            <View style={styles.footer}>
                <Text style={styles.footerText}>SiyensyaGo AI</Text>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
        justifyContent: 'space-between',
    },
    content: {
        flex: 1,
        alignItems: 'center',
        padding: 20,
    },
    image: {
        width: '100%',
        height: '50%', // Give the image a defined size
        borderRadius: 15,
        marginBottom: 30,
    },
    statusContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        gap: 15
    },
    statusText: { fontFamily: fonts.heading, color: colors.primary, fontSize: 36, textAlign: 'center' },
    subStatusText: { fontFamily: fonts.body, color: colors.lightGray, fontSize: 16 },
    footer: { paddingBottom: 40, alignItems: 'center' },
    footerText: { fontFamily: fonts.body, color: colors.lightGray, fontSize: 14, opacity: 0.7 },
    foundTitle: { fontFamily: fonts.body, color: colors.text, fontSize: 18, marginBottom: 10 },
    confidenceContainer: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 },
    confidenceText: { fontFamily: fonts.heading, color: colors.success, fontSize: 16 },
});