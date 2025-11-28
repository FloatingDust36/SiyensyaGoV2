// app/components/gamification/ProgressBar.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, fonts } from '../../theme/theme';

type ProgressBarProps = {
    progress: number; // 0-100
    color?: string;
    height?: number;
    showLabel?: boolean;
    label?: string;
};

export default function ProgressBar({
    progress,
    color = colors.primary,
    height = 8,
    showLabel = false,
    label
}: ProgressBarProps) {
    const clampedProgress = Math.min(Math.max(progress, 0), 100);

    return (
        <View style={styles.container}>
            {showLabel && (
                <View style={styles.labelContainer}>
                    <Text style={styles.label}>{label || 'Progress'}</Text>
                    <Text style={styles.percentage}>{Math.round(clampedProgress)}%</Text>
                </View>
            )}
            <View style={[styles.track, { height }]}>
                <View
                    style={[
                        styles.fill,
                        {
                            width: `${clampedProgress}%`,
                            backgroundColor: color,
                            height
                        }
                    ]}
                />
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        width: '100%',
    },
    labelContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 6,
    },
    label: {
        fontFamily: fonts.body,
        fontSize: 12,
        color: colors.lightGray,
    },
    percentage: {
        fontFamily: fonts.heading,
        fontSize: 12,
        color: colors.primary,
    },
    track: {
        width: '100%',
        backgroundColor: '#1A1C2A',
        borderRadius: 4,
        overflow: 'hidden',
    },
    fill: {
        borderRadius: 4,
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.5,
        shadowRadius: 4,
    },
});