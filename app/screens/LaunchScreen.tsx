// In app/screens/LaunchScreen.tsx
import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts } from '../theme/theme';

export default function LaunchScreen() {
    return (
        <SafeAreaView style={styles.container}>
            {/* Top Header */}
            <View style={styles.header}>
                <Text style={styles.headerText}>SiyensyaGo OS</Text>
                <Text style={styles.headerText}>v2.0</Text>
            </View>

            {/* Main Content */}
            <View style={styles.mainContent}>
                <Ionicons name="scan-circle-outline" size={120} color={colors.primary} />
                <Text style={styles.title}>SiyensyaGo</Text>
                <Text style={styles.subtitle}>Tuklasin ang Agham sa Paligid Mo.</Text>
            </View>

            {/* Footer / Status */}
            <View style={styles.footer}>
                <ActivityIndicator color={colors.primary} />
                <Text style={styles.footerText}>Initializing Discovery Module...</Text>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
        justifyContent: 'space-between', // Pushes header to top, footer to bottom
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingTop: 10,
    },
    headerText: {
        fontFamily: fonts.body,
        color: colors.lightGray,
        fontSize: 12,
        opacity: 0.7,
    },
    mainContent: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        gap: 10,
    },
    title: {
        fontFamily: fonts.heading,
        color: colors.text,
        fontSize: 48,
        letterSpacing: 2,
    },
    subtitle: {
        fontFamily: fonts.body,
        color: colors.primary,
        fontSize: 16,
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        paddingBottom: 40,
        gap: 10,
    },
    footerText: {
        fontFamily: fonts.body,
        color: colors.lightGray,
        fontSize: 14,
    },
});