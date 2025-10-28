// app/screens/SessionSummaryScreen.tsx
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RouteProp, useRoute, useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList } from '../navigation/types';
import { colors, fonts } from '../theme/theme';
import * as Haptics from 'expo-haptics';

type SessionSummaryRouteProp = RouteProp<RootStackParamList, 'SessionSummary'>;
type NavigationProp = StackNavigationProp<RootStackParamList>;

export default function SessionSummaryScreen() {
    const route = useRoute<SessionSummaryRouteProp>();
    const navigation = useNavigation<NavigationProp>();

    const { sessionId, exploredCount, totalCount } = route.params || {
        exploredCount: 0,
        totalCount: 0
    };

    const handleNewDiscovery = async () => {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        navigation.navigate('MainTabs', { screen: 'Camera' });
    };

    const handleViewMuseum = async () => {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        navigation.navigate('MainTabs', { screen: 'Museum' });
    };

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <ScrollView
                contentContainerStyle={styles.content}
                showsVerticalScrollIndicator={false}
            >
                {/* Success Icon */}
                <View style={styles.iconContainer}>
                    <Ionicons name="checkmark-done-circle" size={120} color={colors.success} />
                </View>

                {/* Title */}
                <Text style={styles.title}>Session Complete!</Text>
                <Text style={styles.subtitle}>
                    You've explored all objects from this photo
                </Text>

                {/* Stats Card */}
                <View style={styles.statsCard}>
                    <View style={styles.statItem}>
                        <Text style={styles.statValue}>{exploredCount}</Text>
                        <Text style={styles.statLabel}>Objects Learned</Text>
                    </View>
                    <View style={styles.statDivider} />
                    <View style={styles.statItem}>
                        <Text style={styles.statValue}>100%</Text>
                        <Text style={styles.statLabel}>Completion</Text>
                    </View>
                </View>

                {/* Encouragement */}
                <View style={styles.encouragementCard}>
                    <Ionicons name="trophy" size={32} color={colors.warning} />
                    <Text style={styles.encouragementText}>
                        Great job! You're becoming a STEM expert. Keep exploring the world around you!
                    </Text>
                </View>

                {/* Next Steps */}
                <View style={styles.nextStepsCard}>
                    <Text style={styles.nextStepsTitle}>What's Next?</Text>

                    <TouchableOpacity style={styles.actionCard} onPress={handleNewDiscovery}>
                        <View style={styles.actionIcon}>
                            <Ionicons name="camera" size={28} color={colors.primary} />
                        </View>
                        <View style={styles.actionContent}>
                            <Text style={styles.actionTitle}>Discover More</Text>
                            <Text style={styles.actionDescription}>
                                Take a new photo and explore more objects
                            </Text>
                        </View>
                        <Ionicons name="chevron-forward" size={24} color={colors.lightGray} />
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.actionCard} onPress={handleViewMuseum}>
                        <View style={styles.actionIcon}>
                            <Ionicons name="library" size={28} color={colors.secondary} />
                        </View>
                        <View style={styles.actionContent}>
                            <Text style={styles.actionTitle}>Review Your Museum</Text>
                            <Text style={styles.actionDescription}>
                                See all your saved discoveries
                            </Text>
                        </View>
                        <Ionicons name="chevron-forward" size={24} color={colors.lightGray} />
                    </TouchableOpacity>
                </View>
            </ScrollView>

            {/* Bottom Actions */}
            <View style={styles.bottomActions}>
                <TouchableOpacity
                    style={styles.primaryButton}
                    onPress={handleNewDiscovery}
                >
                    <Ionicons name="camera" size={20} color={colors.background} />
                    <Text style={styles.primaryButtonText}>Start New Discovery</Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    content: {
        padding: 20,
        alignItems: 'center',
    },
    iconContainer: {
        marginTop: 40,
        marginBottom: 20,
    },
    title: {
        fontFamily: fonts.heading,
        fontSize: 32,
        color: colors.text,
        marginBottom: 8,
    },
    subtitle: {
        fontFamily: fonts.body,
        fontSize: 16,
        color: colors.lightGray,
        textAlign: 'center',
        marginBottom: 30,
    },
    statsCard: {
        flexDirection: 'row',
        backgroundColor: '#1A1C2A',
        borderRadius: 20,
        padding: 24,
        width: '100%',
        marginBottom: 20,
        borderWidth: 1,
        borderColor: 'rgba(0, 191, 255, 0.2)',
    },
    statItem: {
        flex: 1,
        alignItems: 'center',
    },
    statValue: {
        fontFamily: fonts.heading,
        fontSize: 36,
        color: colors.success,
        marginBottom: 4,
    },
    statLabel: {
        fontFamily: fonts.body,
        fontSize: 13,
        color: colors.lightGray,
    },
    statDivider: {
        width: 1,
        backgroundColor: 'rgba(0, 191, 255, 0.2)',
        marginHorizontal: 20,
    },
    encouragementCard: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
        backgroundColor: 'rgba(255, 165, 0, 0.1)',
        padding: 20,
        borderRadius: 15,
        width: '100%',
        marginBottom: 24,
        borderWidth: 1,
        borderColor: 'rgba(255, 165, 0, 0.3)',
    },
    encouragementText: {
        flex: 1,
        fontFamily: fonts.body,
        fontSize: 14,
        color: colors.text,
        lineHeight: 20,
    },
    nextStepsCard: {
        width: '100%',
        marginBottom: 20,
    },
    nextStepsTitle: {
        fontFamily: fonts.heading,
        fontSize: 20,
        color: colors.text,
        marginBottom: 16,
    },
    actionCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#1A1C2A',
        padding: 16,
        borderRadius: 15,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: 'rgba(0, 191, 255, 0.2)',
    },
    actionIcon: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: 'rgba(0, 191, 255, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    actionContent: {
        flex: 1,
    },
    actionTitle: {
        fontFamily: fonts.heading,
        fontSize: 16,
        color: colors.text,
        marginBottom: 4,
    },
    actionDescription: {
        fontFamily: fonts.body,
        fontSize: 13,
        color: colors.lightGray,
        lineHeight: 18,
    },
    bottomActions: {
        padding: 20,
        paddingBottom: 10,
        borderTopWidth: 1,
        borderTopColor: 'rgba(0, 191, 255, 0.2)',
    },
    primaryButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        backgroundColor: colors.primary,
        paddingVertical: 16,
        borderRadius: 30,
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 5,
    },
    primaryButtonText: {
        fontFamily: fonts.heading,
        fontSize: 16,
        color: colors.background,
    },
});