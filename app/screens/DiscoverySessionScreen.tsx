// app/screens/DiscoverySessionScreen.tsx
import React, { useState, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Image,
    TouchableOpacity,
    ScrollView,
    ActivityIndicator,
    Alert
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
import OptionsModal from '../components/OptionsModal'; // Import the new modal

type DiscoverySessionRouteProp = RouteProp<RootStackParamList, 'ObjectSelection'>;
type NavigationProp = StackNavigationProp<RootStackParamList>;

export default function DiscoverySessionScreen() {
    const route = useRoute<DiscoverySessionRouteProp>();
    const navigation = useNavigation<NavigationProp>();
    const isFocused = useIsFocused();
    const { user } = useApp();

    const { imageUri, detectedObjects } = route.params;

    const [sessionId, setSessionId] = useState<string | undefined>(undefined);
    const [sceneContext, setSceneContext] = useState<SceneContext | null>(null);
    const [exploredObjectIds, setExploredObjectIds] = useState<string[]>([]);
    const [selectedObjects, setSelectedObjects] = useState<Set<string>>(new Set());
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [optionsVisible, setOptionsVisible] = useState(false); // Modal state

    // Layout State
    const [imageContainerLayout, setImageContainerLayout] = useState({ width: 0, height: 0 });
    const [originalImageSize, setOriginalImageSize] = useState({ width: 0, height: 0 });

    // Get Image Size
    React.useEffect(() => {
        Image.getSize(
            imageUri,
            (width, height) => setOriginalImageSize({ width, height }),
            (error) => console.error('Error getting image size:', error)
        );
    }, [imageUri]);

    // Calculate Displayed Image Rect
    const displayedImageRect = useMemo(() => {
        if (imageContainerLayout.width === 0 || originalImageSize.width === 0) return null;

        const viewRatio = imageContainerLayout.width / imageContainerLayout.height;
        const imgRatio = originalImageSize.width / originalImageSize.height;

        let scale, displayWidth, displayHeight, xOffset, yOffset;

        if (imgRatio > viewRatio) {
            scale = imageContainerLayout.width / originalImageSize.width;
            displayWidth = imageContainerLayout.width;
            displayHeight = originalImageSize.height * scale;
            xOffset = 0;
            yOffset = (imageContainerLayout.height - displayHeight) / 2;
        } else {
            scale = imageContainerLayout.height / originalImageSize.height;
            displayWidth = originalImageSize.width * scale;
            displayHeight = imageContainerLayout.height;
            xOffset = (imageContainerLayout.width - displayWidth) / 2;
            yOffset = 0;
        }

        return { scale, displayWidth, displayHeight, xOffset, yOffset };
    }, [imageContainerLayout, originalImageSize]);

    // Load session
    React.useEffect(() => {
        const loadSession = async () => {
            const paramSessionId = route.params?.sessionId;
            if (paramSessionId) {
                setSessionId(paramSessionId);
                try {
                    const session = await sessionManager.getSession(paramSessionId);
                    if (session) {
                        if (session.context) setSceneContext(session.context);
                        setExploredObjectIds(session.exploredObjectIds || []);
                    }
                } catch (error) {
                    console.error('Error loading session:', error);
                }
            }
        };
        loadSession();
    }, [imageUri, route.params?.sessionId, isFocused]);

    const toggleObjectSelection = async (objectId: string) => {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setSelectedObjects(prev => {
            const newSet = new Set(prev);
            if (newSet.has(objectId)) newSet.delete(objectId);
            else newSet.add(objectId);
            return newSet;
        });
    };

    const handleLearnSelected = async () => {
        if (selectedObjects.size === 0) {
            Alert.alert('No Objects Selected', 'Please select at least one object to learn about.');
            return;
        }

        const selectedObjectsArray = Array.from(selectedObjects)
            .map(id => detectedObjects.find(obj => obj.id === id))
            .filter(obj => obj !== undefined) as DetectedObject[];

        const messageTitle = selectedObjectsArray.length === 1 ? 'Start Learning' : 'Batch Learning';
        const messageBody = selectedObjectsArray.length === 1
            ? `Ready to explore "${selectedObjectsArray[0].name}"?`
            : `You selected ${selectedObjectsArray.length} objects. We'll learn about them one by one!`;

        // We can replace this Alert with a custom modal in a future increment if desired
        Alert.alert(messageTitle, messageBody, [
            { text: 'Start', onPress: () => startLearning(selectedObjectsArray) },
            { text: 'Cancel', style: 'cancel' }
        ]);
    };

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
            Alert.alert('Error', 'Failed to start learning.');
        } finally {
            setIsAnalyzing(false);
        }
    };

    const getConfidenceColor = (confidence: number): string => {
        if (confidence >= 85) return colors.success;
        if (confidence >= 70) return colors.primary;
        return colors.warning;
    };

    const handleClose = () => navigation.navigate('MainTabs', { screen: 'Camera' });

    const unexploredObjects = detectedObjects.filter(obj => !exploredObjectIds.includes(obj.id));
    const exploredObjects = detectedObjects.filter(obj => exploredObjectIds.includes(obj.id));

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <View style={styles.header}>
                <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
                    <Ionicons name="close" size={24} color={colors.lightGray} />
                </TouchableOpacity>
                <View style={styles.headerCenter}>
                    <Text style={styles.headerTitle}>Discovery Session</Text>
                    <Text style={styles.headerSubtitle}>
                        {detectedObjects.length} objects detected
                    </Text>
                </View>
                {/* Help Button Removed. Placeholder for alignment. */}
                <View style={{ width: 40 }} />
            </View>

            <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
                {sceneContext && (
                    <View style={styles.contextCard}>
                        <View style={styles.contextHeader}>
                            <Ionicons name="location" size={20} color={colors.primary} />
                            <Text style={styles.contextTitle}>
                                {sceneContext.location?.charAt(0).toUpperCase() + sceneContext.location?.slice(1).replace('_', ' ')}
                            </Text>
                        </View>
                        <Text style={styles.contextDescription}>{sceneContext.description}</Text>
                    </View>
                )}

                <View style={styles.imageSection}>
                    <Image
                        source={{ uri: imageUri }}
                        style={styles.image}
                        resizeMode="contain"
                        onLayout={(e) => setImageContainerLayout(e.nativeEvent.layout)}
                    />

                    {/* Render Bounding Boxes for ALL selected items (explored or not) */}
                    {displayedImageRect && detectedObjects.map((object) => {
                        const isSelected = selectedObjects.has(object.id);
                        if (!isSelected) return null;

                        const boxLeft = displayedImageRect.xOffset + (object.boundingBox.x / 100 * displayedImageRect.displayWidth);
                        const boxTop = displayedImageRect.yOffset + (object.boundingBox.y / 100 * displayedImageRect.displayHeight);
                        const boxWidth = (object.boundingBox.width / 100 * displayedImageRect.displayWidth);
                        const boxHeight = (object.boundingBox.height / 100 * displayedImageRect.displayHeight);

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
                                {/* Corners omitted for brevity/cleaner look, simple box is fine */}
                            </View>
                        );
                    })}
                </View>

                {/* Object List */}
                <View style={styles.objectListSection}>
                    <Text style={styles.sectionTitle}>Detected Objects</Text>
                    <Text style={styles.sectionSubtitle}>
                        Tap to select objects to learn about.
                    </Text>

                    {/* List ALL objects: Unexplored first, then Explored */}
                    {unexploredObjects.map((object) => {
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
                                    <Text style={[styles.confidenceLabel, { color: confidenceColor }]}>
                                        {object.confidence}% match
                                    </Text>
                                </View>
                            </TouchableOpacity>
                        );
                    })}

                    {/* Separator for Explored Items if any exist */}
                    {exploredObjects.length > 0 && (
                        <View style={styles.exploredSection}>
                            <View style={styles.exploredHeader}>
                                <Ionicons name="checkmark-circle" size={20} color={colors.success} />
                                <Text style={styles.exploredTitle}>Already Explored</Text>
                            </View>

                            {exploredObjects.map((object) => {
                                const isSelected = selectedObjects.has(object.id);
                                return (
                                    <TouchableOpacity
                                        key={object.id}
                                        style={[
                                            styles.objectCard,
                                            { borderColor: colors.success, opacity: 0.9 },
                                            isSelected && styles.objectCardSelected
                                        ]}
                                        onPress={() => toggleObjectSelection(object.id)}
                                        disabled={isAnalyzing}
                                    >
                                        <View style={styles.checkboxContainer}>
                                            {isSelected ? (
                                                <Ionicons name="checkbox" size={24} color={colors.secondary} />
                                            ) : (
                                                <Ionicons name="reload-circle" size={24} color={colors.success} />
                                            )}
                                        </View>
                                        <View style={styles.objectInfo}>
                                            <Text style={styles.objectName}>{object.name}</Text>
                                            <Text style={[styles.confidenceLabel, { color: colors.success }]}>
                                                Tap to revisit
                                            </Text>
                                        </View>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    )}
                </View>

                {/* Not Finding What You Want Card */}
                <TouchableOpacity style={styles.fallbackCard} onPress={() => setOptionsVisible(true)}>
                    <Ionicons name="search-outline" size={24} color={colors.warning} />
                    <View style={styles.fallbackText}>
                        <Text style={styles.fallbackTitle}>Not finding what you want?</Text>
                        <Text style={styles.fallbackSubtitle}>Tap for more options</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color={colors.lightGray} />
                </TouchableOpacity>

                <View style={{ height: 100 }} />
            </ScrollView>

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
                                <Text style={styles.learnSelectedText}>Learn Selected</Text>
                            </>
                        )}
                    </TouchableOpacity>
                </View>
            )}

            {/* Options Modal */}
            <OptionsModal
                visible={optionsVisible}
                title="More Options"
                onClose={() => setOptionsVisible(false)}
                options={[
                    {
                        label: 'Retake Photo',
                        icon: 'camera-outline',
                        onPress: () => navigation.navigate('MainTabs', { screen: 'Camera' })
                    },
                    {
                        label: 'Describe Object (Coming Soon)',
                        icon: 'text-outline',
                        color: colors.lightGray,
                        onPress: () => Alert.alert('Coming Soon', 'This feature is under development.')
                    },
                    {
                        label: 'Browse Categories (Coming Soon)',
                        icon: 'grid-outline',
                        color: colors.lightGray,
                        onPress: () => Alert.alert('Coming Soon', 'This feature is under development.')
                    },
                ]}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 15, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(0, 191, 255, 0.2)' },
    closeButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#1A1C2A', justifyContent: 'center', alignItems: 'center' },
    headerCenter: { flex: 1, alignItems: 'center', paddingHorizontal: 10 },
    headerTitle: { fontFamily: fonts.heading, color: colors.text, fontSize: 18 },
    headerSubtitle: { fontFamily: fonts.body, color: colors.lightGray, fontSize: 12, marginTop: 2 },
    scrollView: { flex: 1 },
    contextCard: { backgroundColor: 'rgba(0, 191, 255, 0.1)', marginHorizontal: 16, marginTop: 16, padding: 16, borderRadius: 15, borderWidth: 1, borderColor: 'rgba(0, 191, 255, 0.3)' },
    contextHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
    contextTitle: { fontFamily: fonts.heading, color: colors.primary, fontSize: 16 },
    contextDescription: { fontFamily: fonts.body, color: colors.lightGray, fontSize: 14, lineHeight: 20 },
    imageSection: { marginHorizontal: 16, marginTop: 16, borderRadius: 15, overflow: 'hidden', aspectRatio: 4 / 3, backgroundColor: '#1A1C2A', position: 'relative' },
    image: { width: '100%', height: '100%' },
    boundingBox: { position: 'absolute', borderWidth: 3, borderRadius: 8 },
    boundingBoxLabel: { position: 'absolute', left: 0, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, maxWidth: 180 },
    boundingBoxLabelText: { fontFamily: fonts.heading, fontSize: 11, color: colors.background },
    objectListSection: { padding: 16 },
    sectionTitle: { fontFamily: fonts.heading, fontSize: 20, color: colors.text, marginBottom: 4 },
    sectionSubtitle: { fontFamily: fonts.body, fontSize: 13, color: colors.lightGray, marginBottom: 16 },
    objectCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1A1C2A', padding: 16, borderRadius: 15, marginBottom: 12, borderWidth: 2, borderColor: 'rgba(0, 191, 255, 0.2)' },
    objectCardSelected: { borderColor: colors.secondary, backgroundColor: 'rgba(138, 43, 226, 0.1)' },
    checkboxContainer: { marginRight: 12 },
    objectInfo: { flex: 1 },
    objectName: { fontFamily: fonts.heading, fontSize: 16, color: colors.text, marginBottom: 4 },
    confidenceLabel: { fontFamily: fonts.heading, fontSize: 11 },
    exploredSection: { marginTop: 20 },
    exploredHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
    exploredTitle: { fontFamily: fonts.heading, fontSize: 18, color: colors.success },
    fallbackCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255, 69, 0, 0.1)', marginHorizontal: 16, padding: 16, borderRadius: 15, borderWidth: 1, borderColor: 'rgba(255, 69, 0, 0.3)', gap: 12 },
    fallbackText: { flex: 1 },
    fallbackTitle: { fontFamily: fonts.heading, fontSize: 15, color: colors.warning, marginBottom: 2 },
    fallbackSubtitle: { fontFamily: fonts.body, fontSize: 12, color: colors.lightGray },
    bottomBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.background, borderTopWidth: 1, borderTopColor: 'rgba(0, 191, 255, 0.2)', paddingHorizontal: 20, paddingVertical: 16 },
    selectedCount: { fontFamily: fonts.heading, fontSize: 14, color: colors.text },
    learnSelectedButton: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.secondary, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 25, minWidth: 160, justifyContent: 'center' },
    learnSelectedButtonDisabled: { opacity: 0.6 },
    learnSelectedText: { fontFamily: fonts.heading, fontSize: 14, color: colors.background },
});