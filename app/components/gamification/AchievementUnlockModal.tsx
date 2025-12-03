// app/components/gamification/AchievementUnlockModal.tsx
import React, { useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    Animated,
    Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts } from '../../theme/theme';
import { AchievementProgress } from '../../types/gamification';

type AchievementUnlockModalProps = {
    visible: boolean;
    achievement: AchievementProgress | null;
    onClose: () => void;
};

const { width } = Dimensions.get('window');

export default function AchievementUnlockModal({
    visible,
    achievement,
    onClose,
}: AchievementUnlockModalProps) {
    const scaleAnim = useRef(new Animated.Value(0)).current;
    const rotateAnim = useRef(new Animated.Value(0)).current;
    const glowAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (visible && achievement) {
            // Reset animations
            scaleAnim.setValue(0);
            rotateAnim.setValue(0);
            glowAnim.setValue(0);

            //Entrance animation
            Animated.parallel([
                Animated.spring(scaleAnim, {
                    toValue: 1,
                    tension: 50,
                    friction: 7,
                    useNativeDriver: false,
                }),
                Animated.timing(rotateAnim, {
                    toValue: 1,
                    duration: 800,
                    useNativeDriver: false,
                }),
                Animated.loop(
                    Animated.sequence([
                        Animated.timing(glowAnim, {
                            toValue: 1,
                            duration: 1000,
                            useNativeDriver: false,
                        }),
                        Animated.timing(glowAnim, {
                            toValue: 0,
                            duration: 1000,
                            useNativeDriver: false,
                        }),
                    ])
                ),
            ]).start();
        }
    }, [visible, achievement]);
    const rotation = rotateAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '360deg'],
    });

    const glowColor = glowAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [
            achievement?.color || colors.primary,
            `${achievement?.color || colors.primary}80`,
        ],
    });

    if (!achievement) return null;

    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
            <View style={styles.overlay}>
                {/* Blur Background (iOS only, graceful degradation on Android) */}
                <View style={StyleSheet.absoluteFill}>
                    <View style={styles.blurFallback} />
                </View>

                <Animated.View
                    style={[
                        styles.container,
                        {
                            transform: [{ scale: scaleAnim }],
                        },
                    ]}
                >
                    {/* Achievement Icon */}
                    <Animated.View
                        style={[
                            styles.iconContainer,
                            {
                                backgroundColor: `${achievement.color}20`,
                                borderColor: glowColor,
                                transform: [{ rotate: rotation }],
                            },
                        ]}
                    >
                        <Ionicons name={achievement.icon_name as any} size={64} color={achievement.color} />
                    </Animated.View>

                    {/* Title */}
                    <Text style={styles.title}>Achievement Unlocked!</Text>

                    {/* Achievement Name */}
                    <Text style={[styles.achievementName, { color: achievement.color }]}>
                        {achievement.name}
                    </Text>

                    {/* Description */}
                    <Text style={styles.description}>{achievement.description}</Text>

                    {/* XP Reward (if any) */}
                    <View style={styles.rewardContainer}>
                        <Ionicons name="star" size={20} color={colors.warning} />
                        <Text style={styles.rewardText}>+{achievement.requirement_value} XP</Text>
                    </View>

                    {/* Close Button */}
                    <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                        <Text style={styles.closeButtonText}>Awesome!</Text>
                    </TouchableOpacity>
                </Animated.View>
            </View>
        </Modal>
    );
}
const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    blurFallback: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(13, 15, 24, 0.95)',
    },
    container: {
        width: width - 60,
        backgroundColor: '#1A1C2A',
        borderRadius: 25,
        padding: 30,
        alignItems: 'center',
        borderWidth: 2,
        borderColor: colors.primary,
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.5,
        shadowRadius: 20,
        elevation: 10,
    },
    iconContainer: {
        width: 120,
        height: 120,
        borderRadius: 60,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 4,
        marginBottom: 20,
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.8,
        shadowRadius: 15,
    },
    title: {
        fontFamily: fonts.heading,
        fontSize: 24,
        color: colors.text,
        marginBottom: 12,
        textAlign: 'center',
    },
    achievementName: {
        fontFamily: fonts.heading,
        fontSize: 20,
        marginBottom: 12,
        textAlign: 'center',
    },
    description: {
        fontFamily: fonts.body,
        fontSize: 14,
        color: colors.lightGray,
        textAlign: 'center',
        lineHeight: 20,
        marginBottom: 20,
    },
    rewardContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: 'rgba(255, 165, 0, 0.2)',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        marginBottom: 24,
    },
    rewardText: {
        fontFamily: fonts.heading,
        fontSize: 16,
        color: colors.warning,
    },
    closeButton: {
        backgroundColor: colors.primary,
        paddingHorizontal: 40,
        paddingVertical: 14,
        borderRadius: 25,
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 5,
    },
    closeButtonText: {
        fontFamily: fonts.heading,
        fontSize: 16,
        color: colors.background,
    },
});