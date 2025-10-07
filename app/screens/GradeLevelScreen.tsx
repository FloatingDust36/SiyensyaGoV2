// In app/screens/GradeLevelScreen.tsx
import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/types';
import { colors, fonts } from '../theme/theme';
import { useApp } from '../context/AppContext';
import { GradeLevel } from '../context/types';

type NavigationProp = StackNavigationProp<RootStackParamList>;

const GRADE_LEVELS = [
    {
        id: 'elementary' as GradeLevel,
        title: 'Elementary',
        subtitle: 'Grades K-6',
        description: 'Simple explanations with fun visuals and basic concepts',
        icon: 'school-outline',
        color: colors.success,
    },
    {
        id: 'juniorHigh' as GradeLevel,
        title: 'Junior High School',
        subtitle: 'Grades 7-10',
        description: 'DepEd-aligned curriculum with deeper scientific concepts',
        icon: 'flask-outline',
        color: colors.primary,
    },
    {
        id: 'seniorHigh' as GradeLevel,
        title: 'Senior High School',
        subtitle: 'Grades 11-12',
        description: 'Advanced STEM concepts and career pathway connections',
        icon: 'rocket-outline',
        color: colors.secondary,
    },
];

export default function GradeLevelScreen() {
    const navigation = useNavigation<NavigationProp>();
    const { updateUser } = useApp();
    const [selectedLevel, setSelectedLevel] = useState<GradeLevel>('juniorHigh');
    const [isProcessing, setIsProcessing] = useState(false);

    const scaleAnim = React.useRef(new Animated.Value(1)).current;

    React.useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(scaleAnim, {
                    toValue: 1.05,
                    duration: 2000,
                    useNativeDriver: true,
                }),
                Animated.timing(scaleAnim, {
                    toValue: 1,
                    duration: 2000,
                    useNativeDriver: true,
                }),
            ])
        ).start();
    }, []);

    const handleContinue = async () => {
        setIsProcessing(true);
        try {
            await updateUser({ gradeLevel: selectedLevel });
            navigation.replace('MainTabs', { screen: 'Camera' });
        } catch (error) {
            console.error('Error saving grade level:', error);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleSkip = async () => {
        // Use default (Junior High)
        try {
            await updateUser({ gradeLevel: 'juniorHigh' });
            navigation.replace('MainTabs', { screen: 'Camera' });
        } catch (error) {
            console.error('Error:', error);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
                    <Ionicons name="school" size={60} color={colors.primary} />
                </Animated.View>
                <Text style={styles.title}>Choose Your Level</Text>
                <Text style={styles.subtitle}>
                    We'll personalize your learning experience based on your grade level
                </Text>
            </View>

            {/* Grade Level Cards */}
            <View style={styles.cardsContainer}>
                {GRADE_LEVELS.map((level) => (
                    <TouchableOpacity
                        key={level.id}
                        style={[
                            styles.card,
                            selectedLevel === level.id && styles.cardSelected,
                            selectedLevel === level.id && { borderColor: level.color }
                        ]}
                        onPress={() => setSelectedLevel(level.id)}
                        activeOpacity={0.7}
                    >
                        <View style={styles.cardContent}>
                            <View style={[styles.iconContainer, { backgroundColor: `${level.color}20` }]}>
                                <Ionicons name={level.icon as any} size={32} color={level.color} />
                            </View>
                            <View style={styles.cardText}>
                                <Text style={styles.cardTitle}>{level.title}</Text>
                                <Text style={styles.cardSubtitle}>{level.subtitle}</Text>
                                <Text style={styles.cardDescription}>{level.description}</Text>
                            </View>
                            <View style={styles.radioContainer}>
                                {selectedLevel === level.id ? (
                                    <View style={[styles.radioSelected, { backgroundColor: level.color }]}>
                                        <Ionicons name="checkmark" size={16} color={colors.background} />
                                    </View>
                                ) : (
                                    <View style={styles.radioUnselected} />
                                )}
                            </View>
                        </View>
                    </TouchableOpacity>
                ))}
            </View>

            {/* Info Box */}
            <View style={styles.infoBox}>
                <Ionicons name="information-circle" size={20} color={colors.primary} />
                <Text style={styles.infoText}>
                    Don't worry! You can change this anytime in your profile settings.
                </Text>
            </View>

            {/* Action Buttons */}
            <View style={styles.actions}>
                <TouchableOpacity
                    style={styles.continueButton}
                    onPress={handleContinue}
                    disabled={isProcessing}
                >
                    {isProcessing ? (
                        <Text style={styles.continueButtonText}>Setting up...</Text>
                    ) : (
                        <>
                            <Text style={styles.continueButtonText}>Continue</Text>
                            <Ionicons name="arrow-forward" size={20} color={colors.background} />
                        </>
                    )}
                </TouchableOpacity>

                <TouchableOpacity onPress={handleSkip}>
                    <Text style={styles.skipText}>Skip for now</Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
        padding: 20,
    },
    header: {
        alignItems: 'center',
        marginTop: 20,
        marginBottom: 30,
    },
    title: {
        fontFamily: fonts.heading,
        fontSize: 32,
        color: colors.text,
        marginTop: 20,
        marginBottom: 10,
    },
    subtitle: {
        fontFamily: fonts.body,
        fontSize: 16,
        color: colors.lightGray,
        textAlign: 'center',
        paddingHorizontal: 20,
        lineHeight: 24,
    },
    cardsContainer: {
        flex: 1,
        gap: 15,
    },
    card: {
        backgroundColor: '#1A1C2A',
        borderRadius: 15,
        padding: 20,
        borderWidth: 2,
        borderColor: 'rgba(0, 191, 255, 0.2)',
    },
    cardSelected: {
        borderWidth: 3,
        backgroundColor: 'rgba(0, 191, 255, 0.05)',
    },
    cardContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 15,
    },
    iconContainer: {
        width: 60,
        height: 60,
        borderRadius: 30,
        justifyContent: 'center',
        alignItems: 'center',
    },
    cardText: {
        flex: 1,
    },
    cardTitle: {
        fontFamily: fonts.heading,
        fontSize: 18,
        color: colors.text,
        marginBottom: 4,
    },
    cardSubtitle: {
        fontFamily: fonts.body,
        fontSize: 13,
        color: colors.primary,
        marginBottom: 6,
    },
    cardDescription: {
        fontFamily: fonts.body,
        fontSize: 13,
        color: colors.lightGray,
        lineHeight: 18,
    },
    radioContainer: {
        marginLeft: 10,
    },
    radioUnselected: {
        width: 24,
        height: 24,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: colors.lightGray,
    },
    radioSelected: {
        width: 24,
        height: 24,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    infoBox: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        backgroundColor: 'rgba(0, 191, 255, 0.1)',
        padding: 15,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(0, 191, 255, 0.3)',
        marginVertical: 20,
    },
    infoText: {
        flex: 1,
        fontFamily: fonts.body,
        fontSize: 13,
        color: colors.lightGray,
        lineHeight: 18,
    },
    actions: {
        gap: 15,
        paddingBottom: 20,
    },
    continueButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        backgroundColor: colors.primary,
        paddingVertical: 18,
        borderRadius: 30,
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 5,
    },
    continueButtonText: {
        fontFamily: fonts.heading,
        fontSize: 18,
        color: colors.background,
    },
    skipText: {
        fontFamily: fonts.body,
        fontSize: 16,
        color: colors.lightGray,
        textAlign: 'center',
    },
});