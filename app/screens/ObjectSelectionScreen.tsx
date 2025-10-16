// In app/screens/ObjectSelectionScreen.tsx
import React, { useState } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, Dimensions, ActivityIndicator, Alert } from 'react-native';
import { RouteProp, useRoute, useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList, DetectedObject, AnalysisResult } from '../navigation/types';
import { colors, fonts } from '../theme/theme';
import { Ionicons } from '@expo/vector-icons';
import { analyzeSelectedObject } from '../services/gemini';
import { useApp } from '../context/AppContext';
import * as Haptics from 'expo-haptics';

type ObjectSelectionRouteProp = RouteProp<RootStackParamList, 'ObjectSelection'>;
type NavigationProp = StackNavigationProp<RootStackParamList>;

const { width, height } = Dimensions.get('window');

export default function ObjectSelectionScreen() {
    const route = useRoute<ObjectSelectionRouteProp>();
    const navigation = useNavigation<NavigationProp>();
    const { user } = useApp();

    const { imageUri, detectedObjects } = route.params;
    const [selectedObject, setSelectedObject] = useState<DetectedObject | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [imageLayout, setImageLayout] = useState({ width: 0, height: 0, x: 0, y: 0 });

    const handleImageLayout = (event: any) => {
        const { width, height, x, y } = event.nativeEvent.layout;
        setImageLayout({ width, height, x, y });
    };

    const handleObjectSelect = async (object: DetectedObject) => {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setSelectedObject(object);
        setIsAnalyzing(true);

        try {
            const result = await analyzeSelectedObject(
                imageUri,
                object.name,
                object.boundingBox,
                user.gradeLevel
            );

            if ('error' in result) {
                Alert.alert('Analysis Error', result.error);
                setIsAnalyzing(false);
                setSelectedObject(null);
                return;
            }

            // Success haptic
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

            // Navigate to learning content
            const safeResult: AnalysisResult = {
                objectName: String(result.objectName || object.name),
                confidence: Number(result.confidence || 85),
                category: String(result.category || 'General'),
                funFact: String(result.funFact || 'No information available.'),
                the_science_in_action: String(result.the_science_in_action || 'No information available.'),
                why_it_matters_to_you: String(result.why_it_matters_to_you || 'No information available.'),
                tryThis: String(result.tryThis || 'No information available.'),
                explore_further: String(result.explore_further || 'No information available.'),
            };

            navigation.replace('LearningContent', { imageUri, result: safeResult });
        } catch (error) {
            console.error('Error analyzing object:', error);
            Alert.alert('Error', 'Failed to analyze object. Please try again.');
            setIsAnalyzing(false);
            setSelectedObject(null);
        }
    };

    const handleRetake = () => {
        navigation.navigate('MainTabs', { screen: 'Camera' });
    };

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={handleRetake} style={styles.backButton}>
                    <Ionicons name="close" size={28} color={colors.lightGray} />
                </TouchableOpacity>
                <View style={styles.headerCenter}>
                    <Text style={styles.headerTitle}>Select an Object</Text>
                    <Text style={styles.headerSubtitle}>Tap any object to learn about it</Text>
                </View>
                <View style={styles.placeholder} />
            </View>

            {/* Image with bounding boxes */}
            <View style={styles.imageSection}>
                <Image
                    source={{ uri: imageUri }}
                    style={styles.image}
                    resizeMode="contain"
                    onLayout={handleImageLayout}
                />

                {/* Render bounding boxes */}
                {imageLayout.width > 0 && detectedObjects.map((object, index) => {
                    const boxLeft = (object.boundingBox.x / 100) * imageLayout.width;
                    const boxTop = (object.boundingBox.y / 100) * imageLayout.height;
                    const boxWidth = (object.boundingBox.width / 100) * imageLayout.width;
                    const boxHeight = (object.boundingBox.height / 100) * imageLayout.height;

                    const isSelected = selectedObject?.name === object.name;
                    const boxColor = isSelected ? colors.secondary : colors.primary;

                    return (
                        <TouchableOpacity
                            key={index}
                            style={[
                                styles.boundingBox,
                                {
                                    left: boxLeft,
                                    top: boxTop,
                                    width: boxWidth,
                                    height: boxHeight,
                                    borderColor: boxColor,
                                    borderWidth: isSelected ? 4 : 3,
                                }
                            ]}
                            onPress={() => !isAnalyzing && handleObjectSelect(object)}
                            disabled={isAnalyzing}
                            activeOpacity={0.8}
                        >
                            {/* Label */}
                            <View style={[styles.label, { backgroundColor: boxColor }]}>
                                <Text style={styles.labelText} numberOfLines={1}>
                                    {object.name}
                                </Text>
                            </View>

                            {/* Confidence badge */}
                            <View style={[styles.confidenceBadge, { backgroundColor: boxColor }]}>
                                <Text style={styles.confidenceText}>{object.confidence}%</Text>
                            </View>

                            {/* Corner indicators */}
                            <View style={[styles.corner, styles.topLeft, { borderColor: boxColor }]} />
                            <View style={[styles.corner, styles.topRight, { borderColor: boxColor }]} />
                            <View style={[styles.corner, styles.bottomLeft, { borderColor: boxColor }]} />
                            <View style={[styles.corner, styles.bottomRight, { borderColor: boxColor }]} />
                        </TouchableOpacity>
                    );
                })}
            </View>

            {/* Bottom info panel */}
            <View style={styles.bottomPanel}>
                {isAnalyzing ? (
                    <View style={styles.analyzingContainer}>
                        <ActivityIndicator size="large" color={colors.primary} />
                        <Text style={styles.analyzingText}>
                            Analyzing "{selectedObject?.name}"...
                        </Text>
                        <Text style={styles.analyzingSubtext}>
                            Getting detailed information
                        </Text>
                    </View>
                ) : (
                    <>
                        <View style={styles.infoCard}>
                            <Ionicons name="information-circle-outline" size={24} color={colors.primary} />
                            <Text style={styles.infoText}>
                                Found {detectedObjects.length} {detectedObjects.length === 1 ? 'object' : 'objects'}. Tap any box to explore!
                            </Text>
                        </View>

                        {/* Object list */}
                        <View style={styles.objectList}>
                            {detectedObjects.map((object, index) => (
                                <TouchableOpacity
                                    key={index}
                                    style={styles.objectChip}
                                    onPress={() => handleObjectSelect(object)}
                                >
                                    <Ionicons name="cube-outline" size={16} color={colors.primary} />
                                    <Text style={styles.chipText} numberOfLines={1}>
                                        {object.name}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </>
                )}
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 15,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0, 191, 255, 0.2)',
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#1A1C2A',
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerCenter: {
        flex: 1,
        alignItems: 'center',
        paddingHorizontal: 10,
    },
    headerTitle: {
        fontFamily: fonts.heading,
        color: colors.text,
        fontSize: 18,
    },
    headerSubtitle: {
        fontFamily: fonts.body,
        color: colors.lightGray,
        fontSize: 12,
        marginTop: 2,
    },
    placeholder: {
        width: 40,
    },
    imageSection: {
        flex: 1,
        position: 'relative',
        backgroundColor: '#000',
    },
    image: {
        width: '100%',
        height: '100%',
    },
    boundingBox: {
        position: 'absolute',
        borderRadius: 8,
        overflow: 'visible',
    },
    label: {
        position: 'absolute',
        top: -28,
        left: 0,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
        maxWidth: 150,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.8,
        shadowRadius: 4,
        elevation: 5,
    },
    labelText: {
        fontFamily: fonts.heading,
        fontSize: 12,
        color: colors.background,
    },
    confidenceBadge: {
        position: 'absolute',
        bottom: -24,
        right: 0,
        paddingHorizontal: 6,
        paddingVertical: 3,
        borderRadius: 6,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.8,
        shadowRadius: 4,
        elevation: 5,
    },
    confidenceText: {
        fontFamily: fonts.heading,
        fontSize: 10,
        color: colors.background,
    },
    corner: {
        position: 'absolute',
        width: 16,
        height: 16,
        borderWidth: 3,
    },
    topLeft: {
        top: -3,
        left: -3,
        borderRightWidth: 0,
        borderBottomWidth: 0,
        borderTopLeftRadius: 8,
    },
    topRight: {
        top: -3,
        right: -3,
        borderLeftWidth: 0,
        borderBottomWidth: 0,
        borderTopRightRadius: 8,
    },
    bottomLeft: {
        bottom: -3,
        left: -3,
        borderRightWidth: 0,
        borderTopWidth: 0,
        borderBottomLeftRadius: 8,
    },
    bottomRight: {
        bottom: -3,
        right: -3,
        borderLeftWidth: 0,
        borderTopWidth: 0,
        borderBottomRightRadius: 8,
    },
    bottomPanel: {
        backgroundColor: colors.background,
        borderTopWidth: 1,
        borderTopColor: 'rgba(0, 191, 255, 0.2)',
        paddingHorizontal: 20,
        paddingVertical: 20,
        paddingBottom: 10,
    },
    analyzingContainer: {
        alignItems: 'center',
        gap: 12,
        paddingVertical: 20,
    },
    analyzingText: {
        fontFamily: fonts.heading,
        fontSize: 18,
        color: colors.primary,
        textAlign: 'center',
    },
    analyzingSubtext: {
        fontFamily: fonts.body,
        fontSize: 14,
        color: colors.lightGray,
        textAlign: 'center',
    },
    infoCard: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        backgroundColor: 'rgba(0, 191, 255, 0.1)',
        padding: 15,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(0, 191, 255, 0.3)',
        marginBottom: 15,
    },
    infoText: {
        flex: 1,
        fontFamily: fonts.body,
        fontSize: 14,
        color: colors.lightGray,
        lineHeight: 20,
    },
    objectList: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    objectChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: '#1A1C2A',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: 'rgba(0, 191, 255, 0.3)',
        maxWidth: width * 0.4,
    },
    chipText: {
        fontFamily: fonts.heading,
        fontSize: 12,
        color: colors.primary,
    },
});