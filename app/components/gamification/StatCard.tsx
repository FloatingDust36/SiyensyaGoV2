// app/components/gamification/StatCard.tsx
import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts } from '../../theme/theme';

type StatCardProps = {
    icon: keyof typeof Ionicons.glyphMap;
    iconColor: string;
    label: string;
    value: string | number;
    subtitle?: string;
    style?: ViewStyle;
};

export default function StatCard({ icon, iconColor, label, value, subtitle, style }: StatCardProps) {
    return (
        <View style={[styles.container, style]}>
            <View style={[styles.iconContainer, { backgroundColor: `${iconColor}20` }]}>
                <Ionicons name={icon} size={28} color={iconColor} />
            </View>
            <View style={styles.content}>
                <Text style={styles.value}>{value}</Text>
                <Text style={styles.label}>{label}</Text>
                {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: '#1A1C2A',
        borderRadius: 15,
        padding: 16,
        borderWidth: 1,
        borderColor: 'rgba(0, 191, 255, 0.2)',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    iconContainer: {
        width: 56,
        height: 56,
        borderRadius: 28,
        justifyContent: 'center',
        alignItems: 'center',
    },
    content: {
        flex: 1,
    },
    value: {
        fontFamily: fonts.heading,
        fontSize: 24,
        color: colors.text,
        marginBottom: 2,
    },
    label: {
        fontFamily: fonts.body,
        fontSize: 13,
        color: colors.lightGray,
    },
    subtitle: {
        fontFamily: fonts.body,
        fontSize: 11,
        color: colors.primary,
        marginTop: 2,
    },
});