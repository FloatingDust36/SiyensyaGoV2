// In app/screens/ObjectSelectionScreen.tsx
import React, { useState } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, Dimensions, ActivityIndicator, Alert, ScrollView } from 'react-native';
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

    const handleBoxTap = async (object: DetectedObject) => {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setSelectedObject(object);
    };

    const handleObjectConfirm = async () => {
        if (!selectedObject) return;

        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setIsAnalyzing(true);

        try {
            const result = await analyzeSelectedObject(
                imageUri,
                selectedObject.name,
                selectedObject.boundingBox,
                user.gradeLevel
            );

            if ('error' in result) {
                Alert.alert('Analysis Error', result.error);
                setIsAnalyzing(false);
                return;
            }

            // Success haptic
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

            // Navigate to learning content
            const safeResult: AnalysisResult = {
                objectName: String(result.objectName || selectedObject.name),
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
        }
    };

    const handleRetake = () => {
        navigation.navigate('MainTabs', { screen: 'Camera' });
    };

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            {/* Compact Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={handleRetake} style={styles.backButton}>
                    <Ionicons name="close" size={24} color={colors.lightGray} />
                </TouchableOpacity>
                <View style={styles.headerCenter}>
                    <Text style={styles.headerTitle}>Select an Object</Text>
                    <Text style={styles.headerSubtitle}>Tap any box, then confirm below</Text>
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
                            onPress={() => !isAnalyzing && handleBoxTap(object)}
                            disabled={isAnalyzing}
                            activeOpacity={0.7}
                        >
                            {/* Label - positioned intelligently to avoid header overlap */}
                            <View
                                style={[
                                    styles.label,
                                    { backgroundColor: boxColor },
                                    // If box is near top, put label inside/below
                                    boxTop < 40 ? { top: 2, bottom: 'auto' } : { top: -26 }
                                ]}
                            >
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

                            {/* Selected indicator overlay */}
                            {isSelected && (
                                <View style={styles.selectedOverlay}>
                                    <Ionicons name="checkmark-circle" size={40} color={colors.secondary} />
                                </View>
                            )}
                        </TouchableOpacity>
                    );
                })}
            </View>

            {/* Bottom panel */}
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
                            <Ionicons name="information-circle-outline" size={20} color={colors.primary} />
                            <Text style={styles.infoText}>
                                Found {detectedObjects.length} {detectedObjects.length === 1 ? 'object' : 'objects'}.
                                {selectedObject ? ' Tap the button below to continue!' : ' Tap any box to select.'}
                            </Text>
                        </View>

                        {/* Object list with full names */}
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            style={styles.objectListScroll}
                            contentContainerStyle={styles.objectList}
                        >
                            {detectedObjects.map((object, index) => {
                                const isSelected = selectedObject?.name === object.name;
                                return (
                                    <TouchableOpacity
                                        key={index}
                                        style={[
                                            styles.objectChip,
                                            isSelected && styles.objectChipSelected
                                        ]}
                                        onPress={() => handleBoxTap(object)}
                                    >
                                        <Ionicons
                                            name={isSelected ? "checkmark-circle" : "cube-outline"}
                                            size={18}
                                            color={isSelected ? colors.secondary : colors.primary}
                                        />
                                        <Text
                                            style={[
                                                styles.chipText,
                                                isSelected && styles.chipTextSelected
                                            ]}
                                        >
                                            {object.name}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </ScrollView>

                        {/* Confirm button - only show when object is selected */}
                        {selectedObject && (
                            <TouchableOpacity
                                style={styles.confirmButton}
                                onPress={handleObjectConfirm}
                            >
                                <Ionicons name="arrow-forward-circle" size={24} color={colors.background} />
                                <Text style={styles.confirmButtonText}>
                                    Learn About "{selectedObject.name}"
                                </Text>
                            </TouchableOpacity>
                        )}
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
        paddingHorizontal: 12,
        paddingVertical: 5,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0, 191, 255, 0.2)',
    },
    backButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#1A1C2A',
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerCenter: {
        flex: 1,
        alignItems: 'center',
        paddingHorizontal: 8,
    },
    headerTitle: {
        fontFamily: fonts.heading,
        color: colors.text,
        fontSize: 16,
    },
    headerSubtitle: {
        fontFamily: fonts.body,
        color: colors.lightGray,
        fontSize: 11,
        marginTop: 2,
    },
    placeholder: {
        width: 36,
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
        left: 0,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
        maxWidth: 180,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.9,
        shadowRadius: 4,
        elevation: 5,
    },
    labelText: {
        fontFamily: fonts.heading,
        fontSize: 11,
        color: colors.background,
    },
    confidenceBadge: {
        position: 'absolute',
        bottom: -22,
        right: 0,
        paddingHorizontal: 6,
        paddingVertical: 3,
        borderRadius: 6,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.9,
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
    selectedOverlay: {
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: [{ translateX: -20 }, { translateY: -20 }],
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        borderRadius: 20,
        padding: 2,
    },
    bottomPanel: {
        backgroundColor: colors.background,
        borderTopWidth: 1,
        borderTopColor: 'rgba(0, 191, 255, 0.2)',
        paddingHorizontal: 16,
        paddingTop: 12,
        paddingBottom: 12,
        maxHeight: 220,
    },
    analyzingContainer: {
        alignItems: 'center',
        gap: 10,
        paddingVertical: 16,
    },
    analyzingText: {
        fontFamily: fonts.heading,
        fontSize: 16,
        color: colors.primary,
        textAlign: 'center',
    },
    analyzingSubtext: {
        fontFamily: fonts.body,
        fontSize: 13,
        color: colors.lightGray,
        textAlign: 'center',
    },
    infoCard: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        backgroundColor: 'rgba(0, 191, 255, 0.1)',
        padding: 12,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: 'rgba(0, 191, 255, 0.3)',
        marginBottom: 12,
    },
    infoText: {
        flex: 1,
        fontFamily: fonts.body,
        fontSize: 12,
        color: colors.lightGray,
        lineHeight: 18,
    },
    objectListScroll: {
        maxHeight: 45,
        marginBottom: 12,
    },
    objectList: {
        flexDirection: 'row',
        gap: 8,
        paddingRight: 16,
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
    },
    objectChipSelected: {
        backgroundColor: 'rgba(138, 43, 226, 0.2)',
        borderColor: colors.secondary,
        borderWidth: 2,
    },
    chipText: {
        fontFamily: fonts.heading,
        fontSize: 12,
        color: colors.primary,
    },
    chipTextSelected: {
        color: colors.secondary,
    },
    confirmButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        backgroundColor: colors.secondary,
        paddingVertical: 14,
        paddingHorizontal: 20,
        borderRadius: 25,
        shadowColor: colors.secondary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 8,
        elevation: 5,
    },
    confirmButtonText: {
        fontFamily: fonts.heading,
        fontSize: 14,
        color: colors.background,
        flex: 1,
        textAlign: 'center',
    },
});