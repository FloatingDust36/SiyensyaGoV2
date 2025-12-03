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
                <Ionicons name={icon} size={24} color={iconColor} />
            </View>
            <View style={styles.content}>
                <Text style={styles.value} numberOfLines={1} adjustsFontSizeToFit>
                    {value}
                </Text>
                <Text style={styles.label} numberOfLines={1} adjustsFontSizeToFit>
                    {label}
                </Text>
                {subtitle && (
                    <Text style={styles.subtitle} numberOfLines={1}>
                        {subtitle}
                    </Text>
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: '#1A1C2A',
        borderRadius: 15,
        padding: 12,
        borderWidth: 1,
        borderColor: 'rgba(0, 191, 255, 0.2)',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        minHeight: 80,
    },
    iconContainer: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
    },
    content: {
        flex: 1,
        justifyContent: 'center',
    },
    value: {
        fontFamily: fonts.heading,
        fontSize: 20,
        color: colors.text,
        marginBottom: 2,
    },
    label: {
        fontFamily: fonts.body,
        fontSize: 12,
        color: colors.lightGray,
    },
    subtitle: {
        fontFamily: fonts.body,
        fontSize: 10,
        color: colors.primary,
        marginTop: 2,
    },
});