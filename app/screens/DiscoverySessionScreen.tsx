// app/screens/DiscoverySessionScreen.tsx
import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Image,
    TouchableOpacity,
    ScrollView,
    ActivityIndicator,
    Alert,
    Dimensions
} from 'react-native';
import { RouteProp, useRoute, useNavigation, useIsFocused } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList, DetectedObject, SceneContext } from '../navigation/types';
import { colors, fonts } from '../theme/theme';
import { Ionicons } from '@expo/vector-icons';
import { analyzeSelectedObject } from '../services/gemini';
import { useApp } from '../context/AppContext';
import * as Haptics from 'expo-haptics';
import { sessionManager } from '../utils/sessionManager';

type DiscoverySessionRouteProp = RouteProp<RootStackParamList, 'ObjectSelection'>;
type NavigationProp = StackNavigationProp<RootStackParamList>;

const { width } = Dimensions.get('window');

// Helper function to calculate actual image dimensions within the container
function calculateActualImageLayout(
    containerWidth: number,
    containerHeight: number,
    imageWidth: number,
    imageHeight: number
): { actualWidth: number; actualHeight: number; offsetX: number; offsetY: number } {

    const containerAspect = containerWidth / containerHeight;
    const imageAspect = imageWidth / imageHeight;

    let actualWidth: number;
    let actualHeight: number;
    let offsetX = 0;
    let offsetY = 0;

    if (imageAspect > containerAspect) {
        // Image is wider - fits to width, letterbox top/bottom
        actualWidth = containerWidth;
        actualHeight = containerWidth / imageAspect;
        offsetY = (containerHeight - actualHeight) / 2;
    } else {
        // Image is taller - fits to height, letterbox left/right
        actualHeight = containerHeight;
        actualWidth = containerHeight * imageAspect;
        offsetX = (containerWidth - actualWidth) / 2;
    }

    return { actualWidth, actualHeight, offsetX, offsetY };
}

export default function DiscoverySessionScreen() {
    const route = useRoute<DiscoverySessionRouteProp>();
    const navigation = useNavigation<NavigationProp>();
    const isFocused = useIsFocused();
    const { user } = useApp();

    const { imageUri, detectedObjects } = route.params;

    // Session state
    const [sessionId, setSessionId] = useState<string | undefined>(undefined);
    const [sceneContext, setSceneContext] = useState<SceneContext | null>(null);
    const [exploredObjectIds, setExploredObjectIds] = useState<string[]>([]);

    // Multi-select state
    const [selectedObjects, setSelectedObjects] = useState<Set<string>>(new Set());
    const [isAnalyzing, setIsAnalyzing] = useState(false);

    // Image layout for bounding box positioning
    const [imageContainerLayout, setImageContainerLayout] = useState({ width: 0, height: 0 });
    const [originalImageSize, setOriginalImageSize] = useState({ width: 0, height: 0 });

    // Load original image dimensions
    React.useEffect(() => {
        Image.getSize(
            imageUri,
            (width, height) => {
                console.log(`📐 Original image size: ${width}x${height}`);
                setOriginalImageSize({ width, height });
            },
            (error) => {
                console.error('Error getting image size:', error);
            }
        );
    }, [imageUri]);

    // Load session and scene context
    React.useEffect(() => {
        const loadSession = async () => {
            const paramSessionId = route.params?.sessionId;

            if (paramSessionId) {
                setSessionId(paramSessionId);

                try {
                    const session = await sessionManager.getSession(paramSessionId);
                    if (session) {
                        if (session.context) {
                            setSceneContext(session.context);
                            console.log(`✓ Loaded scene context: ${session.context.location}`);
                        }
                        setExploredObjectIds(session.exploredObjectIds || []);
                        console.log(`✓ Session loaded: ${session.exploredObjectIds.length}/${session.detectedObjects.length} explored`);
                    } else {
                        console.warn('⚠️ Session not found:', paramSessionId);
                    }
                } catch (error) {
                    console.error('Error loading session:', error);
                }
            } else {
                console.log('ℹ️ No session ID provided - standalone mode');
            }
        };

        loadSession();
    }, [imageUri, route.params?.sessionId, isFocused]);

    const handleImageLayout = (event: any) => {
        const { width, height } = event.nativeEvent.layout;
        setImageContainerLayout({ width, height });
        console.log(`📐 Image container display size: ${width}x${height}`);
    };

    // Calculate actual visible image dimensions and offsets
    const getActualImageLayout = () => {
        if (imageContainerLayout.width === 0 || originalImageSize.width === 0) {
            return null;
        }

        return calculateActualImageLayout(
            imageContainerLayout.width,
            imageContainerLayout.height,
            originalImageSize.width,
            originalImageSize.height
        );
    };

    /**
     * Toggle object selection (for multi-select mode)
     */
    const toggleObjectSelection = async (objectId: string) => {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

        setSelectedObjects(prev => {
            const newSet = new Set(prev);
            if (newSet.has(objectId)) {
                newSet.delete(objectId);
            } else {
                newSet.add(objectId);
            }
            return newSet;
        });
    };

    /**
     * UNIFIED LEARNING HANDLER - Works for both single and batch
     */
    const handleLearnSelected = async () => {
        if (selectedObjects.size === 0) {
            Alert.alert('No Objects Selected', 'Please select at least one object to learn about.');
            return;
        }

        const selectedObjectsArray = Array.from(selectedObjects)
            .map(id => detectedObjects.find(obj => obj.id === id))
            .filter(obj => obj !== undefined) as DetectedObject[];

        const messageTitle = selectedObjectsArray.length === 1
            ? 'Start Learning'
            : 'Batch Learning';

        const messageBody = selectedObjectsArray.length === 1
            ? `Ready to explore "${selectedObjectsArray[0].name}"?`
            : `You selected ${selectedObjectsArray.length} objects. We'll learn about them one by one!\n\n✨ Auto-navigation enabled - you'll automatically move to the next object after finishing each one.`;

        Alert.alert(
            messageTitle,
            messageBody,
            [
                {
                    text: 'Start',
                    onPress: () => startLearning(selectedObjectsArray)
                },
                { text: 'Cancel', style: 'cancel' }
            ]
        );
    };

    /**
     * Start learning flow (handles both single and batch)
     */
    const startLearning = async (objectsQueue: DetectedObject[]) => {
        setIsAnalyzing(true);

        try {
            const result = await analyzeSelectedObject(
                imageUri,
                objectsQueue[0].name,
                objectsQueue[0].boundingBox,
                user.gradeLevel,
                sceneContext ?? undefined
            );

            if ('error' in result) {
                Alert.alert('Analysis Error', result.error);
                setIsAnalyzing(false);
                return;
            }

            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

            navigation.navigate('LearningContent', {
                sessionId: sessionId || undefined,
                objectId: objectsQueue[0].id,
                imageUri,
                boundingBox: objectsQueue[0].boundingBox,
                result: {
                    objectName: String(result.objectName || objectsQueue[0].name),
                    confidence: Number(result.confidence || objectsQueue[0].confidence),
                    category: String(result.category || 'General'),
                    funFact: String(result.funFact || ''),
                    the_science_in_action: String(result.the_science_in_action || ''),
                    why_it_matters_to_you: String(result.why_it_matters_to_you || ''),
                    tryThis: String(result.tryThis || ''),
                    explore_further: String(result.explore_further || '')
                },
                ...(objectsQueue.length > 1 && {
                    batchQueue: objectsQueue,
                    currentBatchIndex: 0
                })
            });

            setSelectedObjects(new Set());
        } catch (error) {
            console.error('Error starting learning:', error);
            Alert.alert('Error', 'Failed to start learning. Please try again.');
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handleFallbackOptions = () => {
        Alert.alert(
            'Not finding what you want?',
            'Choose an option:',
            [
                {
                    text: 'Retake Photo',
                    onPress: () => navigation.navigate('MainTabs', { screen: 'Camera' })
                },
                {
                    text: 'Describe Object',
                    onPress: () => {
                        Alert.alert('Coming Soon', 'Text-based object search will be available soon!');
                    }
                },
                {
                    text: 'Browse Categories',
                    onPress: () => {
                        Alert.alert('Coming Soon', 'Category browser will be available soon!');
                    }
                },
                { text: 'Cancel', style: 'cancel' }
            ]
        );
    };

    const getConfidenceColor = (confidence: number): string => {
        if (confidence >= 85) return colors.success;
        if (confidence >= 70) return colors.primary;
        return colors.warning;
    };

    const handleClose = () => {
        navigation.navigate('MainTabs', { screen: 'Camera' });
    };

    const unexploredObjects = detectedObjects.filter(obj => !exploredObjectIds.includes(obj.id));
    const exploredObjects = detectedObjects.filter(obj => exploredObjectIds.includes(obj.id));

    // Calculate actual image layout for bounding boxes
    const actualImageLayout = getActualImageLayout();

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
                    <Ionicons name="close" size={24} color={colors.lightGray} />
                </TouchableOpacity>

                <View style={styles.headerCenter}>
                    <Text style={styles.headerTitle}>Discovery Session</Text>
                    <Text style={styles.headerSubtitle}>
                        {exploredObjectIds.length > 0
                            ? `${unexploredObjects.length} unexplored ${unexploredObjects.length === 1 ? 'object' : 'objects'}`
                            : `Found ${detectedObjects.length} ${detectedObjects.length === 1 ? 'object' : 'objects'}`
                        }
                    </Text>
                </View>

                <TouchableOpacity onPress={handleFallbackOptions} style={styles.helpButton}>
                    <Ionicons name="help-circle-outline" size={24} color={colors.primary} />
                </TouchableOpacity>
            </View>

            <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
                {/* Scene Context Card */}
                {sceneContext && (
                    <View style={styles.contextCard}>
                        <View style={styles.contextHeader}>
                            <Ionicons name="location" size={20} color={colors.primary} />
                            <Text style={styles.contextTitle}>
                                {sceneContext.location?.charAt(0).toUpperCase() + sceneContext.location?.slice(1).replace('_', ' ')}
                            </Text>
                        </View>
                        <Text style={styles.contextDescription}>{sceneContext.description}</Text>

                        {sceneContext.relatedConcepts && sceneContext.relatedConcepts.length > 0 && (
                            <View style={styles.conceptTags}>
                                {sceneContext.relatedConcepts.map((concept: string, index: number) => (
                                    <View key={index} style={styles.conceptTag}>
                                        <Text style={styles.conceptTagText}>{concept}</Text>
                                    </View>
                                ))}
                            </View>
                        )}
                    </View>
                )}

                {/* Image Preview with Bounding Boxes */}
                <View style={styles.imageSection}>
                    <Image
                        source={{ uri: imageUri }}
                        style={styles.image}
                        resizeMode="contain"
                        onLayout={handleImageLayout}
                    />

                    {/* Render bounding boxes for SELECTED objects only */}
                    {actualImageLayout && unexploredObjects.map((object) => {
                        const isSelected = selectedObjects.has(object.id);

                        if (!isSelected) return null;

                        // Calculate bounding box position on the ACTUAL visible image
                        const boxLeft = actualImageLayout.offsetX + (object.boundingBox.x / 100) * actualImageLayout.actualWidth;
                        const boxTop = actualImageLayout.offsetY + (object.boundingBox.y / 100) * actualImageLayout.actualHeight;
                        const boxWidth = (object.boundingBox.width / 100) * actualImageLayout.actualWidth;
                        const boxHeight = (object.boundingBox.height / 100) * actualImageLayout.actualHeight;

                        console.log(`📦 Bounding box for ${object.name}:`, {
                            container: imageContainerLayout,
                            actualImage: actualImageLayout,
                            percentages: object.boundingBox,
                            calculated: { boxLeft, boxTop, boxWidth, boxHeight }
                        });

                        const confidenceColor = getConfidenceColor(object.confidence);

                        return (
                            <View
                                key={`bbox-${object.id}`}
                                style={[
                                    styles.boundingBox,
                                    {
                                        left: boxLeft,
                                        top: boxTop,
                                        width: boxWidth,
                                        height: boxHeight,
                                        borderColor: confidenceColor,
                                    }
                                ]}
                            >
                                <View
                                    style={[
                                        styles.boundingBoxLabel,
                                        { backgroundColor: confidenceColor },
                                        boxTop < 30 ? { top: 2 } : { top: -26 }
                                    ]}
                                >
                                    <Text style={styles.boundingBoxLabelText} numberOfLines={1}>
                                        {object.name}
                                    </Text>
                                </View>

                                <View style={[styles.corner, styles.topLeft, { borderColor: confidenceColor }]} />
                                <View style={[styles.corner, styles.topRight, { borderColor: confidenceColor }]} />
                                <View style={[styles.corner, styles.bottomLeft, { borderColor: confidenceColor }]} />
                                <View style={[styles.corner, styles.bottomRight, { borderColor: confidenceColor }]} />
                            </View>
                        );
                    })}
                </View>

                {/* Object List */}
                <View style={styles.objectListSection}>
                    <Text style={styles.sectionTitle}>Detected Objects</Text>
                    {unexploredObjects.length > 0 && (
                        <Text style={styles.sectionSubtitle}>
                            Select objects to learn about (tap to see bounding box)
                        </Text>
                    )}

                    {unexploredObjects.length === 0 && exploredObjects.length > 0 ? (
                        <View style={styles.emptyState}>
                            <Ionicons name="checkmark-done-circle" size={80} color={colors.success} />
                            <Text style={styles.emptyStateTitle}>All Objects Explored!</Text>
                            <Text style={styles.emptyStateSubtitle}>
                                You've learned about all {detectedObjects.length} objects from this photo.
                                Great job! 🎉
                            </Text>
                            <TouchableOpacity
                                style={styles.newPhotoButton}
                                onPress={() => {
                                    if (sessionId) {
                                        navigation.replace('SessionSummary', {
                                            sessionId,
                                            exploredCount: detectedObjects.length,
                                            totalCount: detectedObjects.length
                                        });
                                    } else {
                                        navigation.navigate('MainTabs', { screen: 'Camera' });
                                    }
                                }}
                            >
                                <Ionicons name="trophy" size={20} color={colors.background} />
                                <Text style={styles.newPhotoButtonText}>View Summary</Text>
                            </TouchableOpacity>
                        </View>
                    ) : unexploredObjects.length === 0 ? (
                        <View style={styles.emptyState}>
                            <Ionicons name="search-outline" size={80} color={colors.lightGray} />
                            <Text style={styles.emptyStateTitle}>No Objects Detected</Text>
                            <Text style={styles.emptyStateSubtitle}>
                                Try taking a clearer photo with better lighting.
                            </Text>
                            <TouchableOpacity
                                style={styles.newPhotoButton}
                                onPress={() => navigation.navigate('MainTabs', { screen: 'Camera' })}
                            >
                                <Ionicons name="camera" size={20} color={colors.background} />
                                <Text style={styles.newPhotoButtonText}>Try Again</Text>
                            </TouchableOpacity>
                        </View>
                    ) : (
                        unexploredObjects.map((object) => {
                            const isSelected = selectedObjects.has(object.id);
                            const confidenceColor = getConfidenceColor(object.confidence);

                            return (
                                <TouchableOpacity
                                    key={object.id}
                                    style={[
                                        styles.objectCard,
                                        isSelected && styles.objectCardSelected
                                    ]}
                                    onPress={() => toggleObjectSelection(object.id)}
                                    disabled={isAnalyzing}
                                    activeOpacity={0.7}
                                >
                                    <View style={styles.checkboxContainer}>
                                        {isSelected ? (
                                            <Ionicons name="checkbox" size={24} color={colors.secondary} />
                                        ) : (
                                            <Ionicons name="square-outline" size={24} color={colors.lightGray} />
                                        )}
                                    </View>

                                    <View style={styles.objectInfo}>
                                        <Text style={styles.objectName}>{object.name}</Text>
                                        <View style={styles.objectMeta}>
                                            <View
                                                style={[
                                                    styles.confidenceIndicator,
                                                    {
                                                        backgroundColor: `${confidenceColor}20`,
                                                        borderColor: confidenceColor
                                                    }
                                                ]}
                                            >
                                                <Text style={[styles.confidenceLabel, { color: confidenceColor }]}>
                                                    {object.confidence}% confident
                                                </Text>
                                            </View>
                                        </View>
                                    </View>

                                    {isSelected && (
                                        <View style={styles.selectionIndicator}>
                                            <Ionicons name="checkmark-circle" size={20} color={colors.secondary} />
                                        </View>
                                    )}
                                </TouchableOpacity>
                            );
                        })
                    )}
                </View>

                {/* Already Explored Section */}
                {exploredObjects.length > 0 && (
                    <View style={styles.exploredSection}>
                        <View style={styles.exploredHeader}>
                            <Ionicons name="checkmark-circle" size={20} color={colors.success} />
                            <Text style={styles.exploredTitle}>
                                Already Explored ({exploredObjects.length})
                            </Text>
                        </View>
                        <Text style={styles.exploredSubtitle}>
                            Great job! You've learned about these objects from this photo.
                        </Text>
                        {exploredObjects.map((object) => (
                            <View key={object.id} style={styles.exploredCard}>
                                <Ionicons name="checkmark-circle" size={20} color={colors.success} />
                                <Text style={styles.exploredObjectName}>{object.name}</Text>
                            </View>
                        ))}
                    </View>
                )}

                {/* Not Finding What You Want? */}
                <TouchableOpacity style={styles.fallbackCard} onPress={handleFallbackOptions}>
                    <Ionicons name="search-outline" size={24} color={colors.warning} />
                    <View style={styles.fallbackText}>
                        <Text style={styles.fallbackTitle}>Not finding what you want?</Text>
                        <Text style={styles.fallbackSubtitle}>Try describing it or browse categories</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color={colors.lightGray} />
                </TouchableOpacity>

                <View style={{ height: 100 }} />
            </ScrollView>

            {/* Bottom Action Bar */}
            {selectedObjects.size > 0 && (
                <View style={styles.bottomBar}>
                    <Text style={styles.selectedCount}>
                        {selectedObjects.size} {selectedObjects.size === 1 ? 'object' : 'objects'} selected
                    </Text>
                    <TouchableOpacity
                        style={[styles.learnSelectedButton, isAnalyzing && styles.learnSelectedButtonDisabled]}
                        onPress={handleLearnSelected}
                        disabled={isAnalyzing}
                    >
                        {isAnalyzing ? (
                            <ActivityIndicator size="small" color={colors.background} />
                        ) : (
                            <>
                                <Ionicons name="school" size={20} color={colors.background} />
                                <Text style={styles.learnSelectedText}>
                                    Learn Selected
                                </Text>
                            </>
                        )}
                    </TouchableOpacity>
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
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 15,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0, 191, 255, 0.2)',
    },
    closeButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#1A1C2A',
        justifyContent: 'center',
        alignItems: 'center',
    },
    helpButton: {
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
    scrollView: {
        flex: 1,
    },
    contextCard: {
        backgroundColor: 'rgba(0, 191, 255, 0.1)',
        marginHorizontal: 16,
        marginTop: 16,
        padding: 16,
        borderRadius: 15,
        borderWidth: 1,
        borderColor: 'rgba(0, 191, 255, 0.3)',
    },
    contextHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 8,
    },
    contextTitle: {
        fontFamily: fonts.heading,
        color: colors.primary,
        fontSize: 16,
    },
    contextDescription: {
        fontFamily: fonts.body,
        color: colors.lightGray,
        fontSize: 14,
        lineHeight: 20,
        marginBottom: 12,
    },
    conceptTags: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    conceptTag: {
        backgroundColor: 'rgba(0, 191, 255, 0.2)',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(0, 191, 255, 0.4)',
    },
    conceptTagText: {
        fontFamily: fonts.heading,
        fontSize: 11,
        color: colors.primary,
    },
    imageSection: {
        marginHorizontal: 16,
        marginTop: 16,
        borderRadius: 15,
        overflow: 'hidden',
        aspectRatio: 4 / 3,
        backgroundColor: '#1A1C2A',
        position: 'relative',
    },
    image: {
        width: '100%',
        height: '100%',
    },
    boundingBox: {
        position: 'absolute',
        borderWidth: 3,
        borderRadius: 8,
    },
    boundingBoxLabel: {
        position: 'absolute',
        left: 0,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
        maxWidth: 180,
    },
    boundingBoxLabelText: {
        fontFamily: fonts.heading,
        fontSize: 11,
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
    objectListSection: {
        padding: 16,
    },
    sectionTitle: {
        fontFamily: fonts.heading,
        fontSize: 20,
        color: colors.text,
        marginBottom: 4,
    },
    sectionSubtitle: {
        fontFamily: fonts.body,
        fontSize: 13,
        color: colors.lightGray,
        marginBottom: 16,
        lineHeight: 18,
    },
    objectCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#1A1C2A',
        padding: 16,
        borderRadius: 15,
        marginBottom: 12,
        borderWidth: 2,
        borderColor: 'rgba(0, 191, 255, 0.2)',
    },
    objectCardSelected: {
        borderColor: colors.secondary,
        backgroundColor: 'rgba(138, 43, 226, 0.1)',
    },
    checkboxContainer: {
        marginRight: 12,
    },
    objectInfo: {
        flex: 1,
    },
    objectName: {
        fontFamily: fonts.heading,
        fontSize: 16,
        color: colors.text,
        marginBottom: 6,
    },
    objectMeta: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    confidenceIndicator: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
        borderWidth: 1,
    },
    confidenceLabel: {
        fontFamily: fonts.heading,
        fontSize: 11,
    },
    selectionIndicator: {
        marginLeft: 8,
    },
    emptyState: {
        alignItems: 'center',
        paddingVertical: 40,
        paddingHorizontal: 20,
    },
    emptyStateTitle: {
        fontFamily: fonts.heading,
        fontSize: 24,
        color: colors.success,
        marginTop: 20,
        marginBottom: 8,
    },
    emptyStateSubtitle: {
        fontFamily: fonts.body,
        fontSize: 15,
        color: colors.lightGray,
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: 24,
    },
    newPhotoButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        backgroundColor: colors.primary,
        paddingVertical: 14,
        paddingHorizontal: 24,
        borderRadius: 25,
    },
    newPhotoButtonText: {
        fontFamily: fonts.heading,
        fontSize: 16,
        color: colors.background,
    },
    exploredSection: {
        padding: 16,
        marginTop: 16,
    },
    exploredHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 8,
    },
    exploredTitle: {
        fontFamily: fonts.heading,
        fontSize: 18,
        color: colors.success,
    },
    exploredSubtitle: {
        fontFamily: fonts.body,
        fontSize: 13,
        color: colors.lightGray,
        marginBottom: 12,
        lineHeight: 18,
    },
    exploredCard: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        backgroundColor: 'rgba(57, 255, 20, 0.1)',
        padding: 12,
        borderRadius: 12,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: 'rgba(57, 255, 20, 0.3)',
    },
    exploredObjectName: {
        fontFamily: fonts.heading,
        fontSize: 14,
        color: colors.text,
    },
    fallbackCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 69, 0, 0.1)',
        marginHorizontal: 16,
        padding: 16,
        borderRadius: 15,
        borderWidth: 1,
        borderColor: 'rgba(255, 69, 0, 0.3)',
        gap: 12,
    },
    fallbackText: {
        flex: 1,
    },
    fallbackTitle: {
        fontFamily: fonts.heading,
        fontSize: 15,
        color: colors.warning,
        marginBottom: 2,
    },
    fallbackSubtitle: {
        fontFamily: fonts.body,
        fontSize: 12,
        color: colors.lightGray,
    },
    bottomBar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: colors.background,
        borderTopWidth: 1,
        borderTopColor: 'rgba(0, 191, 255, 0.2)',
        paddingHorizontal: 20,
        paddingVertical: 16,
    },
    selectedCount: {
        fontFamily: fonts.heading,
        fontSize: 14,
        color: colors.text,
    },
    learnSelectedButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: colors.secondary,
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 25,
        minWidth: 160,
        justifyContent: 'center',
    },
    learnSelectedButtonDisabled: {
        opacity: 0.6,
    },
    learnSelectedText: {
        fontFamily: fonts.heading,
        fontSize: 14,
        color: colors.background,
    },
});