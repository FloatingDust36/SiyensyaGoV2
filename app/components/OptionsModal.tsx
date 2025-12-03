import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts } from '../theme/theme';

type Option = {
    label: string;
    icon: keyof typeof Ionicons.glyphMap;
    onPress: () => void;
    color?: string;
};

type OptionsModalProps = {
    visible: boolean;
    title: string;
    options: Option[];
    onClose: () => void;
};

export default function OptionsModal({ visible, title, options, onClose }: OptionsModalProps) {
    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
            <View style={styles.overlay}>
                <TouchableOpacity style={styles.backdrop} onPress={onClose} />
                <View style={styles.container}>
                    <View style={styles.header}>
                        <Text style={styles.title}>{title}</Text>
                        <TouchableOpacity onPress={onClose}>
                            <Ionicons name="close" size={24} color={colors.lightGray} />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.content}>
                        {options.map((opt, index) => (
                            <TouchableOpacity
                                key={index}
                                style={styles.option}
                                onPress={() => {
                                    onClose();
                                    setTimeout(opt.onPress, 300); // Slight delay to allow modal to close
                                }}
                            >
                                <View style={[styles.iconContainer, { backgroundColor: `${opt.color || colors.primary}20` }]}>
                                    <Ionicons name={opt.icon} size={22} color={opt.color || colors.primary} />
                                </View>
                                <Text style={styles.label}>{opt.label}</Text>
                                <Ionicons name="chevron-forward" size={18} color={colors.lightGray} />
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        justifyContent: 'flex-end',
    },
    backdrop: {
        ...StyleSheet.absoluteFillObject,
    },
    container: {
        backgroundColor: '#1A1C2A',
        borderTopLeftRadius: 25,
        borderTopRightRadius: 25,
        borderTopWidth: 1,
        borderColor: colors.primary,
        paddingBottom: 40,
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
        fontSize: 18,
        color: colors.text,
    },
    content: {
        padding: 20,
        gap: 12,
    },
    option: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.03)',
        padding: 16,
        borderRadius: 16,
    },
    iconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    label: {
        flex: 1,
        fontFamily: fonts.body,
        fontSize: 16,
        color: colors.text,
    },
});