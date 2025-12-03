// app/screens/LearningContentScreen.tsx
import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Image, ScrollView, TouchableOpacity, Animated, Dimensions, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RouteProp, useRoute, useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList, AnalysisResult, SceneContext, DetectedObject } from '../navigation/types';
import { colors, fonts } from '../theme/theme';
import { useApp } from '../context/AppContext';
import { saveImagePermanently } from '../services/imageStorage';
import * as Haptics from 'expo-haptics';
import { cropImageForObject } from '../utils/imageCropper';
import { sessionManager } from '../utils/sessionManager';
import { analyzeSelectedObject } from '../services/gemini';
import FactLoader from '../components/FactLoader';

type LearningContentRouteProp = RouteProp<RootStackParamList, 'LearningContent'>;
type NavigationProp = StackNavigationProp<RootStackParamList>;

const { width } = Dimensions.get('window');

const SECTIONS = [
    { key: 'funFact', icon: 'flash', title: 'Alam mo ba?', subtitle: 'Fun Fact', color: colors.secondary },
    { key: 'the_science_in_action', icon: 'flask', title: 'The Science in Action', subtitle: 'How it works', color: colors.primary },
    { key: 'why_it_matters_to_you', icon: 'heart', title: 'Why It Matters', subtitle: 'Real-world impact', color: colors.success },
    { key: 'tryThis', icon: 'hammer', title: 'Subukan mo ito!', subtitle: 'Try this activity', color: colors.warning },
    { key: 'explore_further', icon: 'rocket', title: 'Explore Further', subtitle: 'Keep learning', color: colors.primary },
];

export default function LearningContentScreen() {
    const route = useRoute<LearningContentRouteProp>();
    const navigation = useNavigation<NavigationProp>();

    // Context & Actions
    const { startLearningSession, endLearningSession, addDiscovery, removeDiscovery, user } = useApp();

    // 1. SEPARATE SESSION IDs
    // objectSessionId: The local session grouping detected objects (from Camera/Recognition)
    const [objectSessionId, setObjectSessionId] = useState<string | null>(null);
    // trackingSessionId: The database session for Gamification/XP tracking
    const [trackingSessionId, setTrackingSessionId] = useState<string | null>(null);

    const [sceneContext, setSceneContext] = useState<SceneContext | null>(null);
    const [hasMoreObjects, setHasMoreObjects] = useState(false);
    const [remainingCount, setRemainingCount] = useState(0);
    const [isLoadingSession, setIsLoadingSession] = useState(true);
    const [exploredObjectIds, setExploredObjectIds] = useState<string[]>([]);

    // Image cropping states
    const [croppedImageUri, setCroppedImageUri] = useState<string | null>(null);
    const [isLoadingCrop, setIsLoadingCrop] = useState(false);

    const [isSaved, setIsSaved] = useState(false);
    const [isFromMuseum, setIsFromMuseum] = useState(false);

    // Batch learning states
    const [batchQueue, setBatchQueue] = useState<DetectedObject[]>([]);
    const [currentBatchIndex, setCurrentBatchIndex] = useState(0);
    const [isInBatchMode, setIsInBatchMode] = useState(false);
    const [isLoadingNextObject, setIsLoadingNextObject] = useState(false);

    const imageUri = route.params?.imageUri || '';
    const result = route.params?.result || {
        objectName: 'Unknown Object',
        confidence: 0,
        category: 'No information available.',
        funFact: 'No information available.',
        the_science_in_action: 'No information available.',
        why_it_matters_to_you: 'No information available.',
        tryThis: 'No information available.',
        explore_further: 'No information available.',
    };

    const [currentSection, setCurrentSection] = useState(0);
    const fadeAnim = useRef(new Animated.Value(1)).current;
    const slideAnim = useRef(new Animated.Value(0)).current;
    const scrollViewRef = useRef<ScrollView>(null);

    // EFFECT: Handle Gamification Tracking Session
    useEffect(() => {
        const initTracking = async () => {
            const id = await startLearningSession('single_discovery');
            setTrackingSessionId(id);
        };

        initTracking();

        return () => {
            // Cleanup handled by separate effect
        };
    }, []);

    // EFFECT: End Gamification session on unmount
    useEffect(() => {
        return () => {
            if (trackingSessionId) {
                endLearningSession(1, result.category);
            }
        };
    }, [trackingSessionId]);

    // EFFECT: Check if from Museum
    useEffect(() => {
        const discoveryId = route.params?.discoveryId;
        if (discoveryId) {
            setIsFromMuseum(true);
            setIsSaved(true);
        }
    }, [route.params]);

    // EFFECT: Crop Image
    useEffect(() => {
        const cropImage = async () => {
            const boundingBox = route.params?.boundingBox;
            if (boundingBox && imageUri && result.objectName) {
                setIsLoadingCrop(true);
                try {
                    const cropped = await cropImageForObject(
                        imageUri,
                        boundingBox,
                        result.objectName
                    );
                    setCroppedImageUri(cropped);
                } catch (error) {
                    console.error('Error cropping image:', error);
                    setCroppedImageUri(imageUri);
                } finally {
                    setIsLoadingCrop(false);
                }
            } else {
                setCroppedImageUri(imageUri);
            }
        };

        cropImage();
    }, [imageUri, route.params?.boundingBox, result.objectName]);

    // EFFECT: Load Object Session & Batch Mode
    useEffect(() => {
        const loadObjectSession = async () => {
            const sid = route.params?.sessionId;

            // Initialize batch mode
            if (route.params?.batchQueue && route.params?.currentBatchIndex !== undefined) {
                setBatchQueue(route.params.batchQueue);
                setCurrentBatchIndex(route.params.currentBatchIndex);
                setIsInBatchMode(true);
            }

            if (sid) {
                setObjectSessionId(sid);

                try {
                    const session = await sessionManager.getSession(sid);
                    if (session) {
                        if (session.context) {
                            setSceneContext(session.context);
                        }
                        setExploredObjectIds(session.exploredObjectIds || []);

                        const hasMore = session.exploredObjectIds.length < session.detectedObjects.length;
                        setHasMoreObjects(hasMore);

                        if (hasMore) {
                            const unexplored = session.detectedObjects.length - session.exploredObjectIds.length;
                            setRemainingCount(unexplored);
                        }
                    }
                } catch (error) {
                    console.error('Error loading object session:', error);
                }
            }
            setIsLoadingSession(false);
        };

        loadObjectSession();
    }, [route.params?.sessionId, route.params?.batchQueue, route.params?.currentBatchIndex]);

    // Auto-mark as explored
    useEffect(() => {
        const markAsExplored = async () => {
            const sid = route.params?.sessionId;
            const objId = route.params?.objectId;

            if (sid && objId) {
                try {
                    const session = await sessionManager.getSession(sid);

                    if (session && !session.exploredObjectIds.includes(objId)) {
                        console.log(`Marking ${objId} explored in ${sid}`);
                        await sessionManager.markObjectAsExplored(sid, objId);

                        const updatedSession = await sessionManager.getSession(sid);
                        if (updatedSession) {
                            const hasMore = updatedSession.exploredObjectIds.length < updatedSession.detectedObjects.length;
                            setHasMoreObjects(hasMore);
                            setExploredObjectIds(updatedSession.exploredObjectIds);

                            if (hasMore) {
                                setRemainingCount(updatedSession.detectedObjects.length - updatedSession.exploredObjectIds.length);
                            }
                        }
                    }
                } catch (error) {
                    console.error('Error auto-marking as explored:', error);
                }
            }
        };

        const timer = setTimeout(markAsExplored, 1000);
        return () => clearTimeout(timer);
    }, [route.params?.sessionId, route.params?.objectId]);

    const changeSection = (newIndex: number) => {
        Animated.parallel([
            Animated.timing(fadeAnim, { toValue: 0, duration: 150, useNativeDriver: true }),
            Animated.timing(slideAnim, { toValue: newIndex > currentSection ? -20 : 20, duration: 150, useNativeDriver: true }),
        ]).start(() => {
            setCurrentSection(newIndex);
            scrollViewRef.current?.scrollTo({ y: 0, animated: false });

            Animated.parallel([
                Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
                Animated.timing(slideAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
            ]).start();
        });
    };

    const handleNext = () => currentSection < SECTIONS.length - 1 && changeSection(currentSection + 1);
    const handlePrevious = () => currentSection > 0 && changeSection(currentSection - 1);
    const handleDotPress = (index: number) => changeSection(index);

    const handleScanAnother = () => navigation.navigate('MainTabs', { screen: 'Camera' });

    // NAVIGATION: Handle Back / Next Batch Object
    const handleBackToSession = async () => {
        if (isInBatchMode && batchQueue.length > 0) {
            const nextIndex = currentBatchIndex + 1;

            if (nextIndex < batchQueue.length) {
                await navigateToNextBatchObject(nextIndex);
            } else {
                Alert.alert(
                    'Batch Complete! 🎉',
                    `You've learned about all ${batchQueue.length} selected objects!`,
                    [
                        { text: 'Back to Session', onPress: () => exitBatchMode() }
                    ]
                );
            }
        } else if (objectSessionId) {
            try {
                const session = await sessionManager.getSession(objectSessionId);

                if (session) {
                    const allExplored = session.exploredObjectIds.length >= session.detectedObjects.length;

                    if (allExplored) {
                        navigation.replace('SessionSummary', {
                            sessionId: objectSessionId,
                            exploredCount: session.exploredObjectIds.length,
                            totalCount: session.detectedObjects.length
                        });
                    } else {
                        navigation.navigate('ObjectSelection', {
                            sessionId: objectSessionId,
                            imageUri: session.fullImageUri,
                            detectedObjects: session.detectedObjects,
                        });
                    }
                } else {
                    console.warn("Session not found (standard), redirecting to Camera");
                    navigation.navigate('MainTabs', { screen: 'Camera' });
                }
            } catch (error) {
                console.error("Error navigating back:", error);
                navigation.navigate('MainTabs', { screen: 'Camera' });
            }
        } else {
            navigation.navigate('MainTabs', { screen: 'Camera' });
        }
    };

    const navigateToNextBatchObject = async (nextIndex: number) => {
        const nextObject = batchQueue[nextIndex];
        setIsLoadingNextObject(true);

        try {
            const result = await analyzeSelectedObject(
                imageUri,
                nextObject.name,
                nextObject.boundingBox,
                user.gradeLevel,
                sceneContext ?? undefined
            );

            if ('error' in result) {
                Alert.alert('Analysis Error', result.error);
                setIsLoadingNextObject(false);
                return;
            }

            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

            navigation.replace('LearningContent', {
                sessionId: objectSessionId || undefined,
                objectId: nextObject.id,
                imageUri,
                boundingBox: nextObject.boundingBox,
                result: {
                    objectName: String(result.objectName || nextObject.name),
                    confidence: Number(result.confidence || nextObject.confidence),
                    category: String(result.category || 'General'),
                    funFact: String(result.funFact || ''),
                    the_science_in_action: String(result.the_science_in_action || ''),
                    why_it_matters_to_you: String(result.why_it_matters_to_you || ''),
                    tryThis: String(result.tryThis || ''),
                    explore_further: String(result.explore_further || '')
                },
                batchQueue: batchQueue,
                currentBatchIndex: nextIndex
            });
        } catch (error) {
            console.error('Error analyzing next object:', error);
            Alert.alert('Error', 'Failed to analyze next object. Returning to session.');
            exitBatchMode();
        } finally {
            setIsLoadingNextObject(false);
        }
    };

    const exitBatchMode = async () => {
        if (objectSessionId) {
            const session = await sessionManager.getSession(objectSessionId);
            if (session) {
                navigation.navigate('ObjectSelection', {
                    sessionId: objectSessionId,
                    imageUri: session.fullImageUri,
                    detectedObjects: session.detectedObjects,
                });
            } else {
                navigation.navigate('MainTabs', { screen: 'Camera' });
            }
        } else {
            navigation.navigate('MainTabs', { screen: 'Camera' });
        }
    };

    const handleAddToMuseum = async () => {
        if (isFromMuseum) {
            Alert.alert('Delete Discovery', `Remove "${result.objectName}"?`, [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            const discoveryId = route.params?.discoveryId;
                            if (discoveryId) {
                                await removeDiscovery(discoveryId);
                                navigation.navigate('MainTabs', { screen: 'Museum' });
                            }
                        } catch (error) {
                            Alert.alert('Error', 'Failed to delete discovery');
                        }
                    }
                }
            ]);
            return;
        }

        if (isSaved) {
            navigation.navigate('MainTabs', { screen: 'Museum' });
            return;
        }

        // OPTIMISTIC SAVE
        try {
            // Immediate Visual Feedback
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            setIsSaved(true);

            // Heavy lifting
            const permanentImageUri = await saveImagePermanently(imageUri);

            // Background Cloud Sync (Not awaited)
            addDiscovery({
                objectName: result.objectName,
                confidence: result.confidence,
                category: (result.category || 'General').toLowerCase(),
                imageUri: croppedImageUri || permanentImageUri,
                fullImageUri: imageUri,
                boundingBox: route.params?.boundingBox,
                sessionId: objectSessionId || undefined,
                funFact: result.funFact,
                the_science_in_action: result.the_science_in_action,
                why_it_matters_to_you: result.why_it_matters_to_you,
                tryThis: result.tryThis,
                explore_further: result.explore_further,
            }).catch(err => {
                console.error("Background sync failed:", err);
            });

            // Update Local Session
            if (objectSessionId) {
                sessionManager.getSession(objectSessionId).then(updatedSession => {
                    if (updatedSession) {
                        const hasMore = updatedSession.exploredObjectIds.length < updatedSession.detectedObjects.length;
                        setHasMoreObjects(hasMore);
                        if (hasMore) {
                            setRemainingCount(updatedSession.detectedObjects.length - updatedSession.exploredObjectIds.length);
                        }
                    }
                });
            }

            Alert.alert('Saved!', `"${result.objectName}" has been added to your Museum!`, [{ text: 'OK' }]);

        } catch (error) {
            setIsSaved(false);
            Alert.alert('Error', 'Failed to save locally.');
            console.error('Save error:', error);
        }
    };

    const section = SECTIONS[currentSection];
    const rawContent = result[section.key as keyof AnalysisResult];
    let content = 'No content available.';

    if (rawContent !== undefined && rawContent !== null) {
        if (typeof rawContent === 'string') content = rawContent;
        else if (typeof rawContent === 'number') content = String(rawContent);
    }

    const progress = ((currentSection + 1) / SECTIONS.length) * 100;

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeButton}>
                    <Ionicons name="close" size={28} color={colors.lightGray} />
                </TouchableOpacity>

                <View style={styles.headerCenter}>
                    <Text style={styles.objectName} numberOfLines={1}>{result.objectName}</Text>
                    <Text style={styles.progressText}>
                        {isInBatchMode
                            ? `Object ${currentBatchIndex + 1}/${batchQueue.length} • Section ${currentSection + 1}/${SECTIONS.length}`
                            : `Section ${currentSection + 1} of ${SECTIONS.length}`
                        }
                    </Text>
                </View>

                <TouchableOpacity onPress={handleAddToMuseum} style={styles.bookmarkButton}>
                    <Ionicons
                        name={isFromMuseum ? "trash-outline" : (isSaved ? "bookmark" : "bookmark-outline")}
                        size={26}
                        color={isFromMuseum ? colors.warning : (isSaved ? colors.success : colors.primary)}
                    />
                </TouchableOpacity>
            </View>

            {/* Progress Bar */}
            <View style={styles.progressBarContainer}>
                <Animated.View style={[styles.progressBar, { width: `${progress}%`, backgroundColor: section.color }]} />
            </View>

            <ScrollView
                ref={scrollViewRef}
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Session Info Banner */}
                {isInBatchMode && !isFromMuseum ? (
                    <View style={[styles.sessionBanner, { backgroundColor: 'rgba(138, 43, 226, 0.1)', borderColor: 'rgba(138, 43, 226, 0.3)' }]}>
                        <Ionicons name="layers" size={20} color={colors.secondary} />
                        <Text style={[styles.sessionBannerText, { color: colors.secondary }]}>
                            Batch Learning: {currentBatchIndex + 1} of {batchQueue.length} objects
                        </Text>
                    </View>
                ) : hasMoreObjects && !isFromMuseum ? (
                    <View style={styles.sessionBanner}>
                        <Ionicons name="information-circle" size={20} color={colors.primary} />
                        <Text style={styles.sessionBannerText}>
                            {remainingCount} more {remainingCount === 1 ? 'object' : 'objects'} from this photo waiting to be explored!
                        </Text>
                    </View>
                ) : null}

                <View style={styles.imageContainer}>
                    <Image source={{ uri: croppedImageUri || imageUri }} style={styles.image} resizeMode="contain" />
                    {isLoadingCrop && (
                        <View style={styles.cropLoadingOverlay}>
                            <ActivityIndicator size="small" color={colors.primary} />
                        </View>
                    )}
                    <View style={styles.imageOverlay}>
                        <View style={[styles.confidenceBadge, { backgroundColor: section.color }]}>
                            <Text style={styles.confidenceText}>{result.confidence}%</Text>
                        </View>
                    </View>
                </View>

                {/* Content Card */}
                <Animated.View style={[styles.contentCard, { opacity: fadeAnim, transform: [{ translateX: slideAnim }] }]}>
                    <View style={styles.sectionHeader}>
                        <View style={[styles.iconContainer, { backgroundColor: `${section.color}20` }]}>
                            <Ionicons name={section.icon as any} size={32} color={section.color} />
                        </View>
                        <View style={styles.sectionTitleContainer}>
                            <Text style={[styles.sectionTitle, { color: section.color }]}>{section.title}</Text>
                            <Text style={styles.sectionSubtitle}>{section.subtitle}</Text>
                        </View>
                    </View>

                    <Text style={styles.contentText}>{content}</Text>

                    <View style={styles.readingInfo}>
                        <Ionicons name="time-outline" size={16} color={colors.lightGray} />
                        <Text style={styles.readingTime}>~{Math.ceil(content.split(' ').length / 200)} min read</Text>
                    </View>
                </Animated.View>

                {/* Dots */}
                <View style={styles.dotsContainer}>
                    {SECTIONS.map((sec, index) => (
                        <TouchableOpacity key={index} onPress={() => handleDotPress(index)} activeOpacity={0.7} style={styles.dotTouchable}>
                            <View style={[
                                styles.dot,
                                index === currentSection && styles.dotActive,
                                index === currentSection && { backgroundColor: section.color },
                                index < currentSection && styles.dotCompleted,
                            ]}>
                                {index < currentSection && <Ionicons name="checkmark" size={8} color={colors.background} />}
                            </View>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Next Section Preview */}
                <View style={styles.previewContainer}>
                    <Text style={styles.previewTitle}>Up Next:</Text>
                    {currentSection < SECTIONS.length - 1 && (
                        <TouchableOpacity style={styles.previewCard} onPress={handleNext}>
                            <View style={[styles.previewIcon, { backgroundColor: `${SECTIONS[currentSection + 1].color}20` }]}>
                                <Ionicons name={SECTIONS[currentSection + 1].icon as any} size={20} color={SECTIONS[currentSection + 1].color} />
                            </View>
                            <View style={styles.previewText}>
                                <Text style={styles.previewCardTitle}>{SECTIONS[currentSection + 1].title}</Text>
                                <Text style={styles.previewCardSubtitle}>{SECTIONS[currentSection + 1].subtitle}</Text>
                            </View>
                            <Ionicons name="chevron-forward" size={20} color={colors.lightGray} />
                        </TouchableOpacity>
                    )}
                </View>
            </ScrollView>

            {/* Bottom Nav */}
            <SafeAreaView style={styles.bottomNav} edges={['bottom']}>
                {currentSection === SECTIONS.length - 1 ? (
                    <View style={styles.finalButtons}>
                        {objectSessionId && !isFromMuseum ? (
                            <>
                                <TouchableOpacity style={styles.secondaryButtonEqual} onPress={handleScanAnother}>
                                    <Ionicons name="camera-outline" size={18} color={colors.primary} />
                                    <Text style={styles.secondaryButtonText}>New Photo</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={[styles.primaryButtonEqual]}
                                    onPress={handleBackToSession}
                                    disabled={isLoadingNextObject}
                                >
                                    {isInBatchMode ? (
                                        <>
                                            <Text style={styles.primaryButtonText}>
                                                {currentBatchIndex + 1 < batchQueue.length ? 'Next Object' : 'Complete Batch'}
                                            </Text>
                                            <Ionicons name="arrow-forward" size={18} color={colors.background} />
                                        </>
                                    ) : (
                                        <>
                                            <Ionicons name="arrow-back" size={18} color={colors.background} />
                                            <Text style={styles.primaryButtonText}>Back to Session</Text>
                                        </>
                                    )}
                                </TouchableOpacity>
                            </>
                        ) : (
                            <>
                                <TouchableOpacity style={styles.secondaryButtonEqual} onPress={handleScanAnother}>
                                    <Ionicons name="camera-outline" size={18} color={colors.primary} />
                                    <Text style={styles.secondaryButtonText}>Scan Again</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={[styles.primaryButtonEqual, isFromMuseum && styles.deleteButton]} onPress={handleAddToMuseum}>
                                    <Ionicons name={isFromMuseum ? "trash" : (isSaved ? "checkmark" : "bookmark")} size={18} color={colors.background} />
                                    <Text style={styles.primaryButtonText}>{isFromMuseum ? 'Delete' : (isSaved ? 'Saved!' : 'Save')}</Text>
                                </TouchableOpacity>
                            </>
                        )}
                    </View>
                ) : (
                    <View style={styles.navigationButtons}>
                        <TouchableOpacity
                            style={[styles.navButton, currentSection === 0 && styles.navButtonDisabled]}
                            onPress={handlePrevious}
                            disabled={currentSection === 0}
                        >
                            <Ionicons name="chevron-back" size={20} color={currentSection === 0 ? colors.lightGray : colors.primary} />
                            <Text style={[styles.navButtonText, currentSection === 0 && styles.navButtonTextDisabled]}>Previous</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={[styles.nextButton, { backgroundColor: section.color }]} onPress={handleNext}>
                            <Text style={styles.nextButtonText}>Next Section</Text>
                            <Ionicons name="chevron-forward" size={20} color={colors.background} />
                        </TouchableOpacity>
                    </View>
                )}
            </SafeAreaView>

            {/* Overlay for Batch Loading */}
            {isLoadingNextObject && (
                <FactLoader message="Analyzing next object..." />
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 15, paddingVertical: 12 },
    closeButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#1A1C2A', justifyContent: 'center', alignItems: 'center' },
    bookmarkButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#1A1C2A', justifyContent: 'center', alignItems: 'center' },
    headerCenter: { flex: 1, alignItems: 'center', paddingHorizontal: 10 },
    objectName: { fontFamily: fonts.heading, color: colors.text, fontSize: 18, textAlign: 'center' },
    progressText: { fontFamily: fonts.body, color: colors.lightGray, fontSize: 11, marginTop: 2 },
    progressBarContainer: { height: 3, backgroundColor: '#1A1C2A' },
    progressBar: { height: '100%', shadowColor: colors.primary, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.6, shadowRadius: 4, elevation: 3 },
    scrollView: { flex: 1 },
    scrollContent: { padding: 20, paddingBottom: 30 },
    sessionBanner: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: 'rgba(0, 191, 255, 0.1)', paddingHorizontal: 16, paddingVertical: 12, marginBottom: 16, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(0, 191, 255, 0.3)' },
    sessionBannerText: { flex: 1, fontFamily: fonts.body, fontSize: 13, color: colors.primary, lineHeight: 18 },
    imageContainer: { width: '100%', height: 180, borderRadius: 15, marginBottom: 20, overflow: 'hidden', position: 'relative', backgroundColor: '#1A1C2A' },
    image: { width: '100%', height: '100%' },
    cropLoadingOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.3)', justifyContent: 'center', alignItems: 'center' },
    imageOverlay: { position: 'absolute', top: 10, right: 10 },
    confidenceBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, flexDirection: 'row', alignItems: 'center', gap: 5 },
    confidenceText: { fontFamily: fonts.heading, fontSize: 12, color: colors.background },
    contentCard: { backgroundColor: '#1A1C2A', borderRadius: 20, padding: 24, borderWidth: 1, borderColor: 'rgba(0, 191, 255, 0.15)', minHeight: 250 },
    sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 24, paddingBottom: 20, borderBottomWidth: 1, borderBottomColor: 'rgba(0, 191, 255, 0.1)' },
    iconContainer: { width: 60, height: 60, borderRadius: 30, justifyContent: 'center', alignItems: 'center' },
    sectionTitleContainer: { flex: 1 },
    sectionTitle: { fontFamily: fonts.heading, fontSize: 22, marginBottom: 4 },
    sectionSubtitle: { fontFamily: fonts.body, color: colors.lightGray, fontSize: 13 },
    contentText: { fontFamily: fonts.body, color: colors.text, fontSize: 16, lineHeight: 28, marginBottom: 16 },
    readingInfo: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
    readingTime: { fontFamily: fonts.body, color: colors.lightGray, fontSize: 12 },
    dotsContainer: { flexDirection: 'row', justifyContent: 'center', gap: 10, marginTop: 30, marginBottom: 20 },
    dotTouchable: { padding: 4 },
    dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#1A1C2A', justifyContent: 'center', alignItems: 'center' },
    dotActive: { width: 28, height: 10, borderRadius: 5 },
    dotCompleted: { backgroundColor: colors.success },
    previewContainer: { marginTop: 10 },
    previewTitle: { fontFamily: fonts.heading, color: colors.lightGray, fontSize: 14, marginBottom: 12 },
    previewCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1A1C2A', padding: 16, borderRadius: 15, gap: 12, borderWidth: 1, borderColor: 'rgba(0, 191, 255, 0.2)' },
    previewIcon: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
    previewText: { flex: 1 },
    previewCardTitle: { fontFamily: fonts.heading, color: colors.text, fontSize: 14 },
    previewCardSubtitle: { fontFamily: fonts.body, color: colors.lightGray, fontSize: 11, marginTop: 2 },
    bottomNav: { backgroundColor: colors.background, borderTopColor: 'rgba(0, 191, 255, 0.2)', borderTopWidth: 1, paddingHorizontal: 20, paddingTop: 15 },
    navigationButtons: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 10 },
    navButton: { flexDirection: 'row', alignItems: 'center', gap: 6, padding: 10, borderRadius: 12 },
    navButtonDisabled: { opacity: 0.3 },
    navButtonText: { fontFamily: fonts.heading, color: colors.primary, fontSize: 14 },
    navButtonTextDisabled: { color: colors.lightGray },
    nextButton: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 14, paddingHorizontal: 24, borderRadius: 25, shadowColor: colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 5 },
    nextButtonText: { fontFamily: fonts.heading, color: colors.background, fontSize: 15 },
    finalButtons: { flexDirection: 'row', gap: 12, paddingBottom: 10 },
    secondaryButtonEqual: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 16, borderRadius: 25, borderWidth: 2, borderColor: colors.primary },
    primaryButtonEqual: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 16, borderRadius: 25, backgroundColor: colors.primary, shadowColor: colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 5 },
    secondaryButtonText: { fontFamily: fonts.heading, color: colors.primary, fontSize: 12 },
    primaryButtonText: { fontFamily: fonts.heading, color: colors.background, fontSize: 12 },
    deleteButton: { backgroundColor: colors.warning, shadowColor: colors.warning },
});