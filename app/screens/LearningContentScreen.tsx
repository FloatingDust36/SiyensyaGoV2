// In app/screens/LearningContentScreen.tsx
import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, Image, ScrollView, TouchableOpacity, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RouteProp, useRoute, useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList, AnalysisResult } from '../navigation/types';
import { colors, fonts } from '../theme/theme';

type LearningContentRouteProp = RouteProp<RootStackParamList, 'LearningContent'>;
type NavigationProp = StackNavigationProp<RootStackParamList>;

// Optimized order: Hook with fun fact → Core concept → Practical relevance → Hands-on → Exploration
const SECTIONS = [
    { key: 'funFact', icon: 'bulb-outline', title: 'Alam mo ba?', subtitle: 'Fun Fact' },
    { key: 'the_science_in_action', icon: 'flask-outline', title: 'The Science in Action', subtitle: 'How it works' },
    { key: 'why_it_matters_to_you', icon: 'earth-outline', title: 'Why It Matters', subtitle: 'Real-world impact' },
    { key: 'tryThis', icon: 'construct-outline', title: 'Subukan mo ito!', subtitle: 'Try this activity' },
    { key: 'explore_further', icon: 'help-circle-outline', title: 'Explore Further', subtitle: 'Keep learning' },
];

export default function LearningContentScreen() {
    const route = useRoute<LearningContentRouteProp>();
    const navigation = useNavigation<NavigationProp>();
    const { imageUri, result } = route.params;

    const [currentSection, setCurrentSection] = useState(0);
    const fadeAnim = useRef(new Animated.Value(1)).current;

    const changeSection = (newIndex: number) => {
        Animated.timing(fadeAnim, { toValue: 0, duration: 150, useNativeDriver: true }).start(() => {
            setCurrentSection(newIndex);
            Animated.timing(fadeAnim, { toValue: 1, duration: 250, useNativeDriver: true }).start();
        });
    };

    const handleNext = () => currentSection < SECTIONS.length - 1 && changeSection(currentSection + 1);
    const handlePrevious = () => currentSection > 0 && changeSection(currentSection - 1);

    const handleScanAnother = () => navigation.navigate('MainTabs', { screen: 'Camera' });
    const handleAddToMuseum = () => {
        // TODO: Implement actual museum save functionality
        alert(`"${result.objectName}" saved to your Museum!`);
        navigation.navigate('MainTabs', { screen: 'Museum' });
    };

    const section = SECTIONS[currentSection];
    const rawContent = result[section.key as keyof AnalysisResult];
    const content = (typeof rawContent === 'string' || typeof rawContent === 'number')
        ? String(rawContent)
        : 'No content available.';
    const progress = ((currentSection + 1) / SECTIONS.length) * 100;

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerButton}>
                    <Ionicons name="close" size={28} color={colors.lightGray} />
                </TouchableOpacity>
                <View style={styles.headerCenter}>
                    <Text style={styles.objectName} numberOfLines={1}>{result.objectName}</Text>
                    <Text style={styles.progressText}>{currentSection + 1} of {SECTIONS.length}</Text>
                </View>
                <View style={styles.headerButton} /> {/* Spacer */}
            </View>

            {/* Progress Bar */}
            <View style={styles.progressBarContainer}>
                <Animated.View style={[styles.progressBar, { width: `${progress}%` }]} />
            </View>

            {/* Main Content */}
            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                <Image source={{ uri: imageUri }} style={styles.image} />

                <Animated.View style={[styles.contentCard, { opacity: fadeAnim }]}>
                    <View style={styles.sectionHeader}>
                        <View style={styles.iconContainer}>
                            <Ionicons name={section.icon as any} size={28} color={colors.primary} />
                        </View>
                        <View style={styles.sectionTitleContainer}>
                            <Text style={styles.sectionTitle}>{section.title}</Text>
                            <Text style={styles.sectionSubtitle}>{section.subtitle}</Text>
                        </View>
                    </View>
                    <Text style={styles.contentText}>{content}</Text>
                </Animated.View>

                {/* Progress Dots */}
                <View style={styles.dotsContainer}>
                    {SECTIONS.map((_, index) => (
                        <View
                            key={index}
                            style={[
                                styles.dot,
                                index === currentSection && styles.dotActive,
                            ]}
                        />
                    ))}
                </View>
            </ScrollView>

            {/* Bottom Navigation */}
            <SafeAreaView style={styles.bottomNav} edges={['bottom']}>
                {currentSection === SECTIONS.length - 1 ? (
                    <View style={styles.buttonContainer}>
                        <TouchableOpacity style={styles.secondaryButton} onPress={handleScanAnother}>
                            <Ionicons name="camera-outline" size={24} color={colors.primary} />
                            <Text style={styles.secondaryButtonText}>Scan Another</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.primaryButton} onPress={handleAddToMuseum}>
                            <Ionicons name="bookmark" size={24} color={colors.background} />
                            <Text style={styles.primaryButtonText}>Save to Museum</Text>
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
                                size={24}
                                color={currentSection === 0 ? colors.lightGray : colors.primary}
                            />
                            <Text style={[
                                styles.navButtonText,
                                currentSection === 0 && styles.navButtonTextDisabled
                            ]}>
                                Previous
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
                            <Text style={styles.nextButtonText}>Next</Text>
                            <Ionicons name="chevron-forward" size={24} color={colors.background} />
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
    headerButton: {
        width: 40,
        alignItems: 'flex-start',
    },
    headerCenter: {
        flex: 1,
        alignItems: 'center',
    },
    objectName: {
        fontFamily: fonts.heading,
        color: colors.text,
        fontSize: 20,
        textAlign: 'center',
    },
    progressText: {
        fontFamily: fonts.body,
        color: colors.lightGray,
        fontSize: 12,
        marginTop: 2,
    },
    progressBarContainer: {
        height: 4,
        backgroundColor: '#1A1C2A',
    },
    progressBar: {
        height: '100%',
        backgroundColor: colors.primary,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        padding: 20,
        paddingBottom: 30,
    },
    image: {
        width: '100%',
        aspectRatio: 1.2,
        borderRadius: 15,
        marginBottom: 20,
    },
    contentCard: {
        backgroundColor: '#1A1C2A',
        borderRadius: 15,
        padding: 20,
        borderWidth: 1,
        borderColor: 'rgba(0, 191, 255, 0.15)',
        minHeight: 200,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 15,
        marginBottom: 20,
        paddingBottom: 15,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0, 191, 255, 0.1)',
    },
    iconContainer: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: 'rgba(0, 191, 255, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    sectionTitleContainer: {
        flex: 1,
    },
    sectionTitle: {
        fontFamily: fonts.heading,
        color: colors.primary,
        fontSize: 20,
    },
    sectionSubtitle: {
        fontFamily: fonts.body,
        color: colors.lightGray,
        fontSize: 13,
        marginTop: 2,
    },
    contentText: {
        fontFamily: fonts.body,
        color: colors.text,
        fontSize: 16,
        lineHeight: 26,
    },
    dotsContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 8,
        marginTop: 25,
    },
    dot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#1A1C2A',
    },
    dotActive: {
        backgroundColor: colors.primary,
        width: 24,
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
        gap: 5,
        padding: 10
    },
    navButtonDisabled: {
        opacity: 0.3,
    },
    navButtonText: {
        fontFamily: fonts.heading,
        color: colors.primary,
        fontSize: 16
    },
    navButtonTextDisabled: {
        color: colors.lightGray,
    },
    nextButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: colors.primary,
        paddingVertical: 12,
        paddingHorizontal: 25,
        borderRadius: 30,
    },
    nextButtonText: {
        fontFamily: fonts.heading,
        color: colors.background,
        fontSize: 16
    },
    buttonContainer: {
        flexDirection: 'row',
        gap: 12,
        paddingBottom: 10,
    },
    secondaryButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 16,
        borderRadius: 30,
        borderWidth: 2,
        borderColor: colors.primary,
    },
    secondaryButtonText: {
        fontFamily: fonts.heading,
        color: colors.primary,
        fontSize: 10,
    },
    primaryButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 16,
        borderRadius: 30,
        backgroundColor: colors.primary,
    },
    primaryButtonText: {
        fontFamily: fonts.heading,
        color: colors.background,
        fontSize: 10,
    },
});