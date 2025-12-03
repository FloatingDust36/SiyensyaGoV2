import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts } from '../theme/theme';

type HelpSupportModalProps = {
    visible: boolean;
    onClose: () => void;
};

export default function HelpSupportModal({ visible, onClose }: HelpSupportModalProps) {
    const handleEmail = () => {
        Linking.openURL('mailto:support@siyensyago.ph');
    };

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <View style={styles.overlay}>
                <View style={styles.container}>
                    <View style={styles.header}>
                        <Text style={styles.title}>Help & Support</Text>
                        <TouchableOpacity onPress={onClose}>
                            <Ionicons name="close" size={24} color={colors.lightGray} />
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={styles.content}>
                        <Text style={styles.description}>
                            Having trouble? Here are some ways we can help you.
                        </Text>

                        <TouchableOpacity style={styles.option} onPress={handleEmail}>
                            <View style={styles.iconBox}>
                                <Ionicons name="mail" size={24} color={colors.primary} />
                            </View>
                            <View style={styles.optionText}>
                                <Text style={styles.optionTitle}>Email Support</Text>
                                <Text style={styles.optionSubtitle}>Get in touch with our team</Text>
                            </View>
                            <Ionicons name="chevron-forward" size={20} color={colors.lightGray} />
                        </TouchableOpacity>

                        <View style={styles.faqContainer}>
                            <Text style={styles.faqHeader}>Quick Tips</Text>
                            <View style={styles.faqItem}>
                                <Ionicons name="bulb-outline" size={16} color={colors.warning} style={{ marginTop: 2 }} />
                                <Text style={styles.faqText}>Ensure good lighting when scanning objects for better accuracy.</Text>
                            </View>
                            <View style={styles.faqItem}>
                                <Ionicons name="bulb-outline" size={16} color={colors.warning} style={{ marginTop: 2 }} />
                                <Text style={styles.faqText}>You can revisit your saved discoveries in the Museum tab.</Text>
                            </View>
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
        justifyContent: 'flex-end',
    },
    container: {
        backgroundColor: colors.background,
        borderTopLeftRadius: 25,
        borderTopRightRadius: 25,
        height: '70%',
        borderTopWidth: 1,
        borderColor: 'rgba(0, 191, 255, 0.2)',
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
    },
    description: {
        fontFamily: fonts.body,
        fontSize: 14,
        color: colors.lightGray,
        marginBottom: 24,
    },
    option: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#1A1C2A',
        padding: 16,
        borderRadius: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: 'rgba(0, 191, 255, 0.1)',
    },
    iconBox: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: 'rgba(0, 191, 255, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    optionText: {
        flex: 1,
    },
    optionTitle: {
        fontFamily: fonts.heading,
        fontSize: 16,
        color: colors.text,
        marginBottom: 4,
    },
    optionSubtitle: {
        fontFamily: fonts.body,
        fontSize: 12,
        color: colors.lightGray,
    },
    faqContainer: {
        marginTop: 10,
    },
    faqHeader: {
        fontFamily: fonts.heading,
        fontSize: 16,
        color: colors.text,
        marginBottom: 12,
    },
    faqItem: {
        flexDirection: 'row',
        gap: 10,
        marginBottom: 12,
        paddingRight: 10,
    },
    faqText: {
        fontFamily: fonts.body,
        fontSize: 13,
        color: colors.lightGray,
        lineHeight: 20,
    },
});