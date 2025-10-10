// In app/screens/LearningContentScreen.tsx
import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Image, ScrollView, TouchableOpacity, Animated, Dimensions, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RouteProp, useRoute, useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList, AnalysisResult } from '../navigation/types';
import { colors, fonts } from '../theme/theme';
import { useApp } from '../context/AppContext';
import { saveImagePermanently } from '../services/imageStorage';
import * as Haptics from 'expo-haptics';

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

    const { addDiscovery, removeDiscovery, getDiscoveryById } = useApp();
    const [isSaved, setIsSaved] = useState(false);
    const [isFromMuseum, setIsFromMuseum] = useState(false);

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

    useEffect(() => {
        // Check if this is from Museum (has discoveryId)
        const discoveryId = route.params?.discoveryId;
        if (discoveryId) {
            setIsFromMuseum(true);
            setIsSaved(true);
        }
    }, [route.params]);

    const changeSection = (newIndex: number) => {
        // Slide and fade animation
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 0,
                duration: 150,
                useNativeDriver: true
            }),
            Animated.timing(slideAnim, {
                toValue: newIndex > currentSection ? -20 : 20,
                duration: 150,
                useNativeDriver: true
            }),
        ]).start(() => {
            setCurrentSection(newIndex);
            scrollViewRef.current?.scrollTo({ y: 0, animated: false });

            Animated.parallel([
                Animated.timing(fadeAnim, {
                    toValue: 1,
                    duration: 300,
                    useNativeDriver: true
                }),
                Animated.timing(slideAnim, {
                    toValue: 0,
                    duration: 300,
                    useNativeDriver: true
                }),
            ]).start();
        });
    };

    const handleNext = () => currentSection < SECTIONS.length - 1 && changeSection(currentSection + 1);
    const handlePrevious = () => currentSection > 0 && changeSection(currentSection - 1);
    const handleDotPress = (index: number) => changeSection(index);

    const handleScanAnother = () => navigation.navigate('MainTabs', { screen: 'Camera' });
    const handleAddToMuseum = async () => {
        if (isFromMuseum) {
            // Delete from museum
            Alert.alert(
                'Delete Discovery',
                `Remove "${result.objectName}" from your Museum?`,
                [
                    { text: 'Cancel', style: 'cancel' },
                    {
                        text: 'Delete',
                        style: 'destructive',
                        onPress: async () => {
                            try {
                                const discoveryId = route.params?.discoveryId;
                                if (discoveryId) {
                                    await removeDiscovery(discoveryId);
                                    Alert.alert('Deleted', 'Discovery removed from Museum');
                                    navigation.navigate('MainTabs', { screen: 'Museum' });
                                }
                            } catch (error) {
                                Alert.alert('Error', 'Failed to delete discovery');
                            }
                        }
                    }
                ]
            );
            return;
        }

        if (isSaved) {
            navigation.navigate('MainTabs', { screen: 'Museum' });
            return;
        }

        try {
            // Save image permanently before adding discovery
            const permanentImageUri = await saveImagePermanently(imageUri);

            await addDiscovery({
                objectName: result.objectName,
                confidence: result.confidence,
                category: (result.category || 'General').toLowerCase(),
                imageUri: permanentImageUri, // Use permanent URI
                funFact: result.funFact,
                the_science_in_action: result.the_science_in_action,
                why_it_matters_to_you: result.why_it_matters_to_you,
                tryThis: result.tryThis,
                explore_further: result.explore_further,
            });

            // Success haptic
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

            setIsSaved(true);
            Alert.alert(
                'Saved!',
                `"${result.objectName}" has been added to your Museum!`,
                [
                    { text: 'View Museum', onPress: () => navigation.navigate('MainTabs', { screen: 'Museum' }) },
                    { text: 'Continue Learning', style: 'cancel' }
                ]
            );
        } catch (error) {
            Alert.alert('Error', 'Failed to save discovery. Please try again.');
            console.error('Save error:', error);
        }
    };

    const section = SECTIONS[currentSection];
    const rawContent = result[section.key as keyof AnalysisResult];
    let content = 'No content available.';

    if (rawContent !== undefined && rawContent !== null) {
        if (typeof rawContent === 'string') {
            content = rawContent;
        } else if (typeof rawContent === 'number') {
            content = String(rawContent);
        }
    }

    const progress = ((currentSection + 1) / SECTIONS.length) * 100;

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            {/* Enhanced Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeButton}>
                    <Ionicons name="close" size={28} color={colors.lightGray} />
                </TouchableOpacity>

                <View style={styles.headerCenter}>
                    <Text style={styles.objectName} numberOfLines={1}>
                        {result.objectName}
                    </Text>
                    <Text style={styles.progressText}>
                        Section {currentSection + 1} of {SECTIONS.length}
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

            {/* Enhanced Progress Bar with Glow */}
            <View style={styles.progressBarContainer}>
                <Animated.View
                    style={[
                        styles.progressBar,
                        {
                            width: `${progress}%`,
                            backgroundColor: section.color,
                        }
                    ]}
                />
            </View>

            {/* Main Content */}
            <ScrollView
                ref={scrollViewRef}
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Compact Image */}
                <View style={styles.imageContainer}>
                    <Image source={{ uri: imageUri }} style={styles.image} />
                    <View style={styles.imageOverlay}>
                        <View style={[styles.confidenceBadge, { backgroundColor: section.color }]}>
                            <Text style={styles.confidenceText}>{result.confidence}%</Text>
                        </View>
                    </View>
                </View>

                {/* Animated Content Card */}
                <Animated.View
                    style={[
                        styles.contentCard,
                        {
                            opacity: fadeAnim,
                            transform: [{ translateX: slideAnim }]
                        }
                    ]}
                >
                    {/* Section Header with Colored Accent */}
                    <View style={styles.sectionHeader}>
                        <View style={[styles.iconContainer, { backgroundColor: `${section.color}20` }]}>
                            <Ionicons name={section.icon as any} size={32} color={section.color} />
                        </View>
                        <View style={styles.sectionTitleContainer}>
                            <Text style={[styles.sectionTitle, { color: section.color }]}>
                                {section.title}
                            </Text>
                            <Text style={styles.sectionSubtitle}>{section.subtitle}</Text>
                        </View>
                    </View>

                    {/* Content Text with Better Typography */}
                    <Text style={styles.contentText}>{content}</Text>

                    {/* Reading Time Estimate */}
                    <View style={styles.readingInfo}>
                        <Ionicons name="time-outline" size={16} color={colors.lightGray} />
                        <Text style={styles.readingTime}>
                            ~{Math.ceil(content.split(' ').length / 200)} min read
                        </Text>
                    </View>
                </Animated.View>

                {/* Interactive Progress Dots */}
                <View style={styles.dotsContainer}>
                    {SECTIONS.map((sec, index) => (
                        <TouchableOpacity
                            key={index}
                            onPress={() => handleDotPress(index)}
                            activeOpacity={0.7}
                            style={styles.dotTouchable}
                        >
                            <View
                                style={[
                                    styles.dot,
                                    index === currentSection && styles.dotActive,
                                    index === currentSection && { backgroundColor: section.color },
                                    index < currentSection && styles.dotCompleted,
                                ]}
                            >
                                {index < currentSection && (
                                    <Ionicons name="checkmark" size={8} color={colors.background} />
                                )}
                            </View>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Section Preview Cards */}
                <View style={styles.previewContainer}>
                    <Text style={styles.previewTitle}>Up Next:</Text>
                    {currentSection < SECTIONS.length - 1 && (
                        <TouchableOpacity
                            style={styles.previewCard}
                            onPress={handleNext}
                        >
                            <View style={[styles.previewIcon, { backgroundColor: `${SECTIONS[currentSection + 1].color}20` }]}>
                                <Ionicons
                                    name={SECTIONS[currentSection + 1].icon as any}
                                    size={20}
                                    color={SECTIONS[currentSection + 1].color}
                                />
                            </View>
                            <View style={styles.previewText}>
                                <Text style={styles.previewCardTitle}>
                                    {SECTIONS[currentSection + 1].title}
                                </Text>
                                <Text style={styles.previewCardSubtitle}>
                                    {SECTIONS[currentSection + 1].subtitle}
                                </Text>
                            </View>
                            <Ionicons name="chevron-forward" size={20} color={colors.lightGray} />
                        </TouchableOpacity>
                    )}
                </View>
            </ScrollView>

            {/* Enhanced Bottom Navigation */}
            <SafeAreaView style={styles.bottomNav} edges={['bottom']}>
                {currentSection === SECTIONS.length - 1 ? (
                    <View style={styles.finalButtons}>
                        <TouchableOpacity style={styles.secondaryButton} onPress={handleScanAnother}>
                            <Ionicons name="camera-outline" size={18} color={colors.primary} />
                            <Text style={styles.secondaryButtonText}>Scan Again</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.primaryButton, isFromMuseum && styles.deleteButton]}
                            onPress={handleAddToMuseum}
                        >
                            <Ionicons
                                name={isFromMuseum ? "trash" : (isSaved ? "checkmark" : "bookmark")}
                                size={18}
                                color={colors.background}
                            />
                            <Text style={styles.primaryButtonText}>
                                {isFromMuseum ? 'Delete from Museum' : (isSaved ? 'Saved! View Museum' : 'Save to Museum')}
                            </Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <View style={styles.navigationButtons}>
                        <TouchableOpacity
                            style={[styles.navButton, currentSection === 0 && styles.navButtonDisabled]}
                            onPress={handlePrevious}
                            disabled={currentSection === 0}
                        >
                            <Ionicons
                                name="chevron-back"
                                size={20}
                                color={currentSection === 0 ? colors.lightGray : colors.primary}
                            />
                            <Text style={[
                                styles.navButtonText,
                                currentSection === 0 && styles.navButtonTextDisabled
                            ]}>
                                Previous
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.nextButton, { backgroundColor: section.color }]}
                            onPress={handleNext}
                        >
                            <Text style={styles.nextButtonText}>Next Section</Text>
                            <Ionicons name="chevron-forward" size={20} color={colors.background} />
                        </TouchableOpacity>
                    </View>
                )}
            </SafeAreaView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 15,
        paddingVertical: 12,
    },
    closeButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#1A1C2A',
        justifyContent: 'center',
        alignItems: 'center',
    },
    bookmarkButton: {
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
    objectName: {
        fontFamily: fonts.heading,
        color: colors.text,
        fontSize: 18,
        textAlign: 'center',
    },
    progressText: {
        fontFamily: fonts.body,
        color: colors.lightGray,
        fontSize: 11,
        marginTop: 2,
    },
    progressBarContainer: {
        height: 3,
        backgroundColor: '#1A1C2A',
    },
    progressBar: {
        height: '100%',
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.6,
        shadowRadius: 4,
        elevation: 3,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        padding: 20,
        paddingBottom: 30,
    },
    imageContainer: {
        width: '100%',
        height: 180,
        borderRadius: 15,
        marginBottom: 20,
        overflow: 'hidden',
        position: 'relative',
    },
    image: {
        width: '100%',
        height: '100%',
    },
    imageOverlay: {
        position: 'absolute',
        top: 10,
        right: 10,
    },
    confidenceBadge: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
    },
    confidenceText: {
        fontFamily: fonts.heading,
        fontSize: 12,
        color: colors.background,
    },
    contentCard: {
        backgroundColor: '#1A1C2A',
        borderRadius: 20,
        padding: 24,
        borderWidth: 1,
        borderColor: 'rgba(0, 191, 255, 0.15)',
        minHeight: 250,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
        marginBottom: 24,
        paddingBottom: 20,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0, 191, 255, 0.1)',
    },
    iconContainer: {
        width: 60,
        height: 60,
        borderRadius: 30,
        justifyContent: 'center',
        alignItems: 'center',
    },
    sectionTitleContainer: {
        flex: 1,
    },
    sectionTitle: {
        fontFamily: fonts.heading,
        fontSize: 22,
        marginBottom: 4,
    },
    sectionSubtitle: {
        fontFamily: fonts.body,
        color: colors.lightGray,
        fontSize: 13,
    },
    contentText: {
        fontFamily: fonts.body,
        color: colors.text,
        fontSize: 16,
        lineHeight: 28,
        marginBottom: 16,
    },
    readingInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginTop: 8,
    },
    readingTime: {
        fontFamily: fonts.body,
        color: colors.lightGray,
        fontSize: 12,
    },
    dotsContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 10,
        marginTop: 30,
        marginBottom: 20,
    },
    dotTouchable: {
        padding: 4,
    },
    dot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: '#1A1C2A',
        justifyContent: 'center',
        alignItems: 'center',
    },
    dotActive: {
        width: 28,
        height: 10,
        borderRadius: 5,
    },
    dotCompleted: {
        backgroundColor: colors.success,
    },
    previewContainer: {
        marginTop: 10,
    },
    previewTitle: {
        fontFamily: fonts.heading,
        color: colors.lightGray,
        fontSize: 14,
        marginBottom: 12,
    },
    previewCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#1A1C2A',
        padding: 16,
        borderRadius: 15,
        gap: 12,
        borderWidth: 1,
        borderColor: 'rgba(0, 191, 255, 0.2)',
    },
    previewIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    previewText: {
        flex: 1,
    },
    previewCardTitle: {
        fontFamily: fonts.heading,
        color: colors.text,
        fontSize: 14,
    },
    previewCardSubtitle: {
        fontFamily: fonts.body,
        color: colors.lightGray,
        fontSize: 11,
        marginTop: 2,
    },
    bottomNav: {
        backgroundColor: colors.background,
        borderTopColor: 'rgba(0, 191, 255, 0.2)',
        borderTopWidth: 1,
        paddingHorizontal: 20,
        paddingTop: 15,
    },
    navigationButtons: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingBottom: 10,
    },
    navButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        padding: 10,
        borderRadius: 12,
    },
    navButtonDisabled: {
        opacity: 0.3,
    },
    navButtonText: {
        fontFamily: fonts.heading,
        color: colors.primary,
        fontSize: 14
    },
    navButtonTextDisabled: {
        color: colors.lightGray,
    },
    nextButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingVertical: 14,
        paddingHorizontal: 24,
        borderRadius: 25,
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 5,
    },
    nextButtonText: {
        fontFamily: fonts.heading,
        color: colors.background,
        fontSize: 15
    },
    finalButtons: {
        flexDirection: 'row',
        gap: 12,
        paddingBottom: 10,
    },
    secondaryButton: {
        flex: 1,
        maxWidth: '48%',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingVertical: 16,
        paddingHorizontal: 8,
        borderRadius: 25,
        borderWidth: 2,
        borderColor: colors.primary,
    },
    secondaryButtonText: {
        fontFamily: fonts.heading,
        color: colors.primary,
        fontSize: 12,
    },
    primaryButton: {
        flex: 1,
        maxWidth: '48%',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingVertical: 16,
        paddingHorizontal: 8,
        borderRadius: 25,
        backgroundColor: colors.primary,
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 5,
    },
    primaryButtonText: {
        fontFamily: fonts.heading,
        color: colors.background,
        fontSize: 12,
    },
    deleteButton: {
        backgroundColor: colors.warning,
        shadowColor: colors.warning,
    },
});