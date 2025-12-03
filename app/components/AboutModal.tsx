import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts } from '../theme/theme';

type AboutModalProps = {
    visible: boolean;
    onClose: () => void;
};

export default function AboutModal({ visible, onClose }: AboutModalProps) {
    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
            <View style={styles.overlay}>
                <View style={styles.container}>
                    <View style={styles.header}>
                        <Text style={styles.title}>About SiyensyaGo</Text>
                        <TouchableOpacity onPress={onClose}>
                            <Ionicons name="close" size={24} color={colors.lightGray} />
                        </TouchableOpacity>
                    </View>

                    <ScrollView
                        style={styles.content}
                        contentContainerStyle={styles.scrollContent}
                        showsVerticalScrollIndicator={false}
                    >
                        <View style={styles.logoContainer}>
                            <View style={styles.logoPlaceholder}>
                                <Ionicons name="scan-circle-outline" size={80} color={colors.primary} />
                            </View>
                            <Text style={styles.appName}>SiyensyaGo</Text>
                            <Text style={styles.version}>Version 1.0.0</Text>
                        </View>

                        <Text style={styles.sectionTitle}>Mission</Text>
                        <Text style={styles.text}>
                            SiyensyaGo is designed to make STEM learning accessible, engaging, and fun for Filipino students.
                            By combining AI technology with gamification, we turn the world around you into an interactive science museum.
                        </Text>

                        <Text style={styles.sectionTitle}>Features</Text>
                        <View style={styles.featureRow}>
                            <Ionicons name="scan" size={20} color={colors.secondary} />
                            <Text style={styles.featureText}>AI Object Recognition</Text>
                        </View>
                        <View style={styles.featureRow}>
                            <Ionicons name="library" size={20} color={colors.secondary} />
                            <Text style={styles.featureText}>Personal STEM Museum</Text>
                        </View>
                        <View style={styles.featureRow}>
                            <Ionicons name="trophy" size={20} color={colors.secondary} />
                            <Text style={styles.featureText}>Gamified Learning</Text>
                        </View>

                        <Text style={styles.sectionTitle}>Credits</Text>
                        <Text style={styles.text}>
                            Developed by the SiyensyaGo Team.
                            Powered by Google Gemini AI and Supabase.
                        </Text>

                        <View style={styles.footer}>
                            <Text style={styles.copyright}>© 2025 SiyensyaGo. All rights reserved.</Text>
                        </View>
                    </ScrollView>
                </View>
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
        padding: 20,
    },
    container: {
        width: '100%',
        maxHeight: '80%',
        backgroundColor: '#1A1C2A',
        borderRadius: 20,
        borderWidth: 1,
        borderColor: colors.primary,
        overflow: 'hidden',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0, 191, 255, 0.1)',
    },
    title: {
        fontFamily: fonts.heading,
        fontSize: 20,
        color: colors.text,
    },
    content: {
        padding: 20,
        paddingBottom: 0,
    },
    scrollContent: {
        paddingBottom: 40,
    },
    logoContainer: {
        alignItems: 'center',
        marginBottom: 24,
    },
    logoPlaceholder: {
        marginBottom: 10,
    },
    appName: {
        fontFamily: fonts.heading,
        fontSize: 24,
        color: colors.primary,
        marginBottom: 4,
    },
    version: {
        fontFamily: fonts.body,
        fontSize: 14,
        color: colors.lightGray,
    },
    sectionTitle: {
        fontFamily: fonts.heading,
        fontSize: 16,
        color: colors.text,
        marginTop: 16,
        marginBottom: 8,
    },
    text: {
        fontFamily: fonts.body,
        fontSize: 14,
        color: colors.lightGray,
        lineHeight: 22,
    },
    featureRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginBottom: 8,
    },
    featureText: {
        fontFamily: fonts.body,
        fontSize: 14,
        color: colors.lightGray,
    },
    footer: {
        marginTop: 30,
        marginBottom: 10,
        alignItems: 'center',
    },
    copyright: {
        fontFamily: fonts.body,
        fontSize: 12,
        color: colors.lightGray,
        opacity: 0.6,
    },
});