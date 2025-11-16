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
import { RootStackParamList, DetectedObject } from '../navigation/types';
import { colors, fonts } from '../theme/theme';
import { Ionicons } from '@expo/vector-icons';
import { analyzeSelectedObject } from '../services/gemini';
import { useApp } from '../context/AppContext';
import * as Haptics from 'expo-haptics';
import { sessionManager } from '../utils/sessionManager';

type DiscoverySessionRouteProp = RouteProp<RootStackParamList, 'ObjectSelection'>;
type NavigationProp = StackNavigationProp<RootStackParamList>;

const { width } = Dimensions.get('window');

export default function DiscoverySessionScreen() {
    const route = useRoute<DiscoverySessionRouteProp>();
    const navigation = useNavigation<NavigationProp>();
    const isFocused = useIsFocused();
    const { user } = useApp();

    const { imageUri, detectedObjects } = route.params;

    // Session state
    const [sessionId, setSessionId] = useState<string | undefined>(undefined);
    const [sceneContext, setSceneContext] = useState<any>(null);
    const [exploredObjectIds, setExploredObjectIds] = useState<string[]>([]);

    // Multi-select state
    const [selectedObjects, setSelectedObjects] = useState<Set<string>>(new Set());
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [currentlyAnalyzing, setCurrentlyAnalyzing] = useState<string | null>(null);

    // Image layout for bounding box positioning
    const [imageLayout, setImageLayout] = useState({ width: 0, height: 0 });

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
        setImageLayout({ width, height });
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
     * Quick learn - single object immediate learning
     */
    const handleQuickLearn = async (object: DetectedObject) => {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setIsAnalyzing(true);
        setCurrentlyAnalyzing(object.id);

        try {
            const result = await analyzeSelectedObject(
                imageUri,
                object.name,
                object.boundingBox,
                user.gradeLevel,
                sceneContext
            );

            if ('error' in result) {
                Alert.alert('Analysis Error', result.error);
                setIsAnalyzing(false);
                setCurrentlyAnalyzing(null);
                return;
            }

            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

            // Navigate to learning content with session info
            navigation.navigate('LearningContent', {
                sessionId: sessionId || undefined,
                objectId: object.id,
                imageUri,
                boundingBox: object.boundingBox,
                result: {
                    objectName: String(result.objectName || object.name),
                    confidence: Number(result.confidence || object.confidence),
                    category: String(result.category || 'General'),
                    funFact: String(result.funFact || ''),
                    the_science_in_action: String(result.the_science_in_action || ''),
                    why_it_matters_to_you: String(result.why_it_matters_to_you || ''),
                    tryThis: String(result.tryThis || ''),
                    explore_further: String(result.explore_further || '')
                }
            });
        } catch (error) {
            console.error('Error analyzing object:', error);
            Alert.alert('Error', 'Failed to analyze object. Please try again.');
        } finally {
            setIsAnalyzing(false);
            setCurrentlyAnalyzing(null);
        }
    };

    /**
     * Batch learning - analyze multiple selected objects
     */
    const handleBatchLearn = () => {
        if (selectedObjects.size === 0) {
            Alert.alert('No Objects Selected', 'Please select at least one object to learn about.');
            return;
        }

        Alert.alert(
            'Batch Learning',
            `You selected ${selectedObjects.size} objects. We'll learn about them one by one!`,
            [
                {
                    text: 'Start Learning',
                    onPress: () => {
                        const firstObjectId = Array.from(selectedObjects)[0];
                        const firstObject = detectedObjects.find(obj => obj.id === firstObjectId);
                        if (firstObject) {
                            handleQuickLearn(firstObject);
                        }
                    }
                },
                { text: 'Cancel', style: 'cancel' }
            ]
        );
    };

    /**
     * Handle "Not finding what you want?" fallback
     */
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

    /**
     * Get confidence color coding
     */
    const getConfidenceColor = (confidence: number): string => {
        if (confidence >= 85) return colors.success;
        if (confidence >= 70) return colors.primary;
        return colors.warning;
    };

    const handleClose = () => {
        navigation.navigate('MainTabs', { screen: 'Camera' });
    };

    // Filter unexplored objects
    const unexploredObjects = detectedObjects.filter(obj => !exploredObjectIds.includes(obj.id));
    const exploredObjects = detectedObjects.filter(obj => exploredObjectIds.includes(obj.id));

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

                {/* Image Preview */}
                <View style={styles.imageSection}>
                    <Image
                        source={{ uri: imageUri }}
                        style={styles.image}
                        resizeMode="contain"
                        onLayout={handleImageLayout}
                    />
                </View>

                {/* Object List */}
                <View style={styles.objectListSection}>
                    <Text style={styles.sectionTitle}>Detected Objects</Text>
                    {unexploredObjects.length > 0 && (
                        <Text style={styles.sectionSubtitle}>
                            Tap to learn immediately, or select multiple for batch learning
                        </Text>
                    )}

                    {unexploredObjects.length === 0 && exploredObjects.length > 0 ? (
                        // Empty state - all objects explored (SUCCESS!)
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
                        // True empty state - no objects detected at all (EDGE CASE)
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
                        // Regular object list - show unexplored objects
                        unexploredObjects.map((object) => {
                            const isSelected = selectedObjects.has(object.id);
                            const confidenceColor = getConfidenceColor(object.confidence);
                            const isAnalyzingThis = currentlyAnalyzing === object.id;

                            return (
                                <View
                                    key={object.id}
                                    style={[
                                        styles.objectCard,
                                        isSelected && styles.objectCardSelected,
                                        isAnalyzingThis && styles.objectCardAnalyzing
                                    ]}
                                >
                                    {/* Checkbox for multi-select */}
                                    <TouchableOpacity
                                        style={styles.checkboxContainer}
                                        onPress={() => toggleObjectSelection(object.id)}
                                        disabled={isAnalyzing}
                                    >
                                        {isSelected ? (
                                            <Ionicons name="checkbox" size={24} color={colors.secondary} />
                                        ) : (
                                            <Ionicons name="square-outline" size={24} color={colors.lightGray} />
                                        )}
                                    </TouchableOpacity>

                                    {/* Object Info */}
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

                                    {/* Quick Learn Button */}
                                    <TouchableOpacity
                                        style={[styles.learnButton, { backgroundColor: confidenceColor }]}
                                        onPress={() => handleQuickLearn(object)}
                                        disabled={isAnalyzing}
                                    >
                                        {isAnalyzingThis ? (
                                            <ActivityIndicator size="small" color={colors.background} />
                                        ) : (
                                            <>
                                                <Text style={styles.learnButtonText}>Learn</Text>
                                                <Ionicons name="arrow-forward" size={16} color={colors.background} />
                                            </>
                                        )}
                                    </TouchableOpacity>
                                </View>
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
                        style={styles.batchLearnButton}
                        onPress={handleBatchLearn}
                        disabled={isAnalyzing}
                    >
                        <Ionicons name="layers" size={20} color={colors.background} />
                        <Text style={styles.batchLearnText}>
                            Learn Selected
                        </Text>
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
    },
    image: {
        width: '100%',
        height: '100%',
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
    objectCardAnalyzing: {
        opacity: 0.6,
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
    learnButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 20,
    },
    learnButtonText: {
        fontFamily: fonts.heading,
        fontSize: 13,
        color: colors.background,
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
    batchLearnButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: colors.secondary,
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 25,
    },
    batchLearnText: {
        fontFamily: fonts.heading,
        fontSize: 14,
        color: colors.background,
    },
});