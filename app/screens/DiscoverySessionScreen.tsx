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
    Alert,
    Modal
} from 'react-native';
import { RouteProp, useRoute, useNavigation, useIsFocused } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList, DetectedObject, SceneContext, AnalysisResult } from '../navigation/types';
import { colors, fonts } from '../theme/theme';
import { Ionicons } from '@expo/vector-icons';
import { analyzeSelectedObject } from '../services/gemini';
import { useApp } from '../context/AppContext';
import * as Haptics from 'expo-haptics';
import { sessionManager } from '../utils/sessionManager';
import CustomAlertModal from '../components/CustomAlertModal';
import OptionsModal from '../components/OptionsModal';
import CustomToast from '../components/CustomToast';

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

    // Modal & Toast State
    const [learnConfirmVisible, setLearnConfirmVisible] = useState(false);
    const [optionsVisible, setOptionsVisible] = useState(false);
    const [tipsModalVisible, setTipsModalVisible] = useState(false);
    const [pendingObjectsToLearn, setPendingObjectsToLearn] = useState<DetectedObject[]>([]);
    const [showToast, setShowToast] = useState(false);
    const [toastMessage, setToastMessage] = useState('');

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
            triggerToast('Please select at least one object.');
            return;
        }

        const selectedObjectsArray = Array.from(selectedObjects)
            .map(id => detectedObjects.find(obj => obj.id === id))
            .filter(obj => obj !== undefined) as DetectedObject[];

        setPendingObjectsToLearn(selectedObjectsArray);
        setLearnConfirmVisible(true);
    };

    const onConfirmLearn = () => {
        setLearnConfirmVisible(false);
        setTimeout(() => startLearning(pendingObjectsToLearn), 300);
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

            // Cache result via useEffect in LearningContentScreen or SessionManager manually here
            // (LearningContentScreen will handle saving to cache on mount)

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

    const handleFallbackOptions = () => {
        setOptionsVisible(true);
    };

    const handleReopenExplored = async (object: DetectedObject) => {
        if (sessionId) {
            const cached = await sessionManager.getCachedResult(sessionId, object.id);
            if (cached) {
                navigation.navigate('LearningContent', {
                    sessionId,
                    objectId: object.id,
                    imageUri,
                    boundingBox: object.boundingBox,
                    result: cached
                });
                return;
            }
        }
        triggerToast('Could not retrieve session data.');
    };

    const triggerToast = (msg: string) => {
        setToastMessage(msg);
        setShowToast(true);
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

                    {/* Render Bounding Boxes */}
                    {displayedImageRect && unexploredObjects.map((object) => {
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
                            <Ionicons name="checkmark-circle" size={80} color={colors.success} />
                            <Text style={styles.emptyStateTitle}>All Objects Explored!</Text>
                            <Text style={styles.emptyStateSubtitle}>
                                You've learned about all {detectedObjects.length} objects from this photo.
                                Great job!
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
                            Tap an object to review what you learned.
                        </Text>
                        {exploredObjects.map((object) => (
                            <TouchableOpacity
                                key={object.id}
                                style={styles.exploredCard}
                                onPress={() => handleReopenExplored(object)}
                            >
                                <Ionicons name="checkmark-circle" size={20} color={colors.success} />
                                <Text style={styles.exploredObjectName}>{object.name}</Text>
                                <Ionicons name="chevron-forward" size={16} color={colors.success} style={{ marginLeft: 'auto' }} />
                            </TouchableOpacity>
                        ))}
                    </View>
                )}

                {/* Not Finding What You Want Card */}
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

            {/* --- MODALS --- */}

            <CustomAlertModal
                visible={learnConfirmVisible}
                title={pendingObjectsToLearn.length === 1 ? "Start Learning?" : "Start Batch Learning?"}
                message={pendingObjectsToLearn.length === 1
                    ? `Ready to explore "${pendingObjectsToLearn[0]?.name}"?`
                    : `You selected ${pendingObjectsToLearn.length} objects. We'll learn about them one by one!`}
                confirmText="Let's Go!"
                onClose={() => setLearnConfirmVisible(false)}
                onConfirm={onConfirmLearn}
                type="info"
            />

            <OptionsModal
                visible={optionsVisible}
                title="Not finding what you want?"
                onClose={() => setOptionsVisible(false)}
                options={[
                    {
                        label: 'Retake Photo',
                        icon: 'camera',
                        onPress: () => navigation.navigate('MainTabs', { screen: 'Camera' })
                    },
                    {
                        label: 'Scanning Tips',
                        icon: 'bulb',
                        onPress: () => setTipsModalVisible(true)
                    },
                    {
                        label: 'Describe Object',
                        icon: 'text',
                        onPress: () => triggerToast('Text description coming soon!')
                    }
                ]}
            />

            <Modal
                visible={tipsModalVisible}
                transparent
                animationType="fade"
                onRequestClose={() => setTipsModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Scanning Tips</Text>
                            <TouchableOpacity onPress={() => setTipsModalVisible(false)}>
                                <Ionicons name="close" size={24} color={colors.lightGray} />
                            </TouchableOpacity>
                        </View>
                        <ScrollView style={styles.modalBody}>
                            <View style={styles.tipItem}>
                                <Ionicons name="sunny-outline" size={24} color={colors.warning} />
                                <View style={styles.tipTextContainer}>
                                    <Text style={styles.tipTitle}>Lighting</Text>
                                    <Text style={styles.tipDesc}>Ensure the object is well-lit. Avoid strong shadows.</Text>
                                </View>
                            </View>
                            <View style={styles.tipItem}>
                                <Ionicons name="scan-outline" size={24} color={colors.primary} />
                                <View style={styles.tipTextContainer}>
                                    <Text style={styles.tipTitle}>Framing</Text>
                                    <Text style={styles.tipDesc}>Get closer! The object should fill most of the frame.</Text>
                                </View>
                            </View>
                            <View style={styles.tipItem}>
                                <Ionicons name="hand-left-outline" size={24} color={colors.secondary} />
                                <View style={styles.tipTextContainer}>
                                    <Text style={styles.tipTitle}>Stability</Text>
                                    <Text style={styles.tipDesc}>Hold your phone steady to avoid blur.</Text>
                                </View>
                            </View>
                        </ScrollView>
                        <TouchableOpacity style={styles.modalButton} onPress={() => setTipsModalVisible(false)}>
                            <Text style={styles.modalButtonText}>Got it</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            <CustomToast
                visible={showToast}
                message={toastMessage}
                onHide={() => setShowToast(false)}
                type="info"
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
    contextDescription: { fontFamily: fonts.body, color: colors.lightGray, fontSize: 14, lineHeight: 20, marginBottom: 12 },
    imageSection: { marginHorizontal: 16, marginTop: 16, borderRadius: 15, overflow: 'hidden', aspectRatio: 4 / 3, backgroundColor: '#1A1C2A', position: 'relative' },
    image: { width: '100%', height: '100%' },
    boundingBox: { position: 'absolute', borderWidth: 3, borderRadius: 8 },
    boundingBoxLabel: { position: 'absolute', left: 0, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, maxWidth: 180 },
    boundingBoxLabelText: { fontFamily: fonts.heading, fontSize: 11, color: colors.background },
    corner: { position: 'absolute', width: 16, height: 16, borderWidth: 3 },
    topLeft: { top: -3, left: -3, borderRightWidth: 0, borderBottomWidth: 0, borderTopLeftRadius: 8 },
    topRight: { top: -3, right: -3, borderLeftWidth: 0, borderBottomWidth: 0, borderTopRightRadius: 8 },
    bottomLeft: { bottom: -3, left: -3, borderRightWidth: 0, borderTopWidth: 0, borderBottomLeftRadius: 8 },
    bottomRight: { bottom: -3, right: -3, borderLeftWidth: 0, borderTopWidth: 0, borderBottomRightRadius: 8 },
    objectListSection: { padding: 16 },
    sectionTitle: { fontFamily: fonts.heading, fontSize: 20, color: colors.text, marginBottom: 4 },
    sectionSubtitle: { fontFamily: fonts.body, fontSize: 13, color: colors.lightGray, marginBottom: 16, lineHeight: 18 },
    objectCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1A1C2A', padding: 16, borderRadius: 15, marginBottom: 12, borderWidth: 2, borderColor: 'rgba(0, 191, 255, 0.2)' },
    objectCardSelected: { borderColor: colors.secondary, backgroundColor: 'rgba(138, 43, 226, 0.1)' },
    checkboxContainer: { marginRight: 12 },
    objectInfo: { flex: 1 },
    objectName: { fontFamily: fonts.heading, fontSize: 16, color: colors.text, marginBottom: 6 },
    objectMeta: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    confidenceIndicator: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, borderWidth: 1 },
    confidenceLabel: { fontFamily: fonts.heading, fontSize: 11 },
    selectionIndicator: { marginLeft: 8 },
    emptyState: { alignItems: 'center', paddingVertical: 40, paddingHorizontal: 20 },
    emptyStateTitle: { fontFamily: fonts.heading, fontSize: 24, color: colors.success, marginTop: 20, marginBottom: 8 },
    emptyStateSubtitle: { fontFamily: fonts.body, fontSize: 15, color: colors.lightGray, textAlign: 'center', lineHeight: 22, marginBottom: 24 },
    newPhotoButton: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.primary, paddingVertical: 14, paddingHorizontal: 24, borderRadius: 25 },
    newPhotoButtonText: { fontFamily: fonts.heading, fontSize: 16, color: colors.background },
    exploredSection: { padding: 16, marginTop: 16 },
    exploredHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
    exploredTitle: { fontFamily: fonts.heading, fontSize: 18, color: colors.success },
    exploredSubtitle: { fontFamily: fonts.body, fontSize: 13, color: colors.lightGray, marginBottom: 12, lineHeight: 18 },
    exploredCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: 'rgba(57, 255, 20, 0.1)', padding: 12, borderRadius: 12, marginBottom: 8, borderWidth: 1, borderColor: 'rgba(57, 255, 20, 0.3)' },
    exploredObjectName: { fontFamily: fonts.heading, fontSize: 14, color: colors.text },
    fallbackCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255, 69, 0, 0.1)', marginHorizontal: 16, padding: 16, borderRadius: 15, borderWidth: 1, borderColor: 'rgba(255, 69, 0, 0.3)', gap: 12 },
    fallbackText: { flex: 1 },
    fallbackTitle: { fontFamily: fonts.heading, fontSize: 15, color: colors.warning, marginBottom: 2 },
    fallbackSubtitle: { fontFamily: fonts.body, fontSize: 12, color: colors.lightGray },
    bottomBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.background, borderTopWidth: 1, borderTopColor: 'rgba(0, 191, 255, 0.2)', paddingHorizontal: 20, paddingVertical: 16 },
    selectedCount: { fontFamily: fonts.heading, fontSize: 14, color: colors.text },
    learnSelectedButton: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.secondary, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 25, minWidth: 160, justifyContent: 'center' },
    learnSelectedButtonDisabled: { opacity: 0.6 },
    learnSelectedText: { fontFamily: fonts.heading, fontSize: 14, color: colors.background },
    // Modal Styles
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center', padding: 20 },
    modalContent: { backgroundColor: '#1A1C2A', width: '100%', borderRadius: 20, borderWidth: 1, borderColor: colors.primary, overflow: 'hidden' },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.1)' },
    modalTitle: { fontFamily: fonts.heading, fontSize: 18, color: colors.text },
    modalBody: { padding: 20 },
    tipItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 20, gap: 15 },
    tipTextContainer: { flex: 1 },
    tipTitle: { fontFamily: fonts.heading, fontSize: 16, color: colors.text, marginBottom: 4 },
    tipDesc: { fontFamily: fonts.body, fontSize: 14, color: colors.lightGray, lineHeight: 20 },
    modalButton: { backgroundColor: colors.primary, margin: 20, padding: 15, borderRadius: 12, alignItems: 'center' },
    modalButtonText: { fontFamily: fonts.heading, fontSize: 16, color: colors.background },
});