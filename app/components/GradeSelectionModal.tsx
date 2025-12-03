import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts } from '../theme/theme';
import { GradeLevel } from '../context/types';

type GradeSelectionModalProps = {
    visible: boolean;
    currentGrade: GradeLevel;
    onSelect: (grade: GradeLevel) => void;
    onClose: () => void;
};

const GRADES: { id: GradeLevel; label: string; icon: string; color: string }[] = [
    { id: 'elementary', label: 'Elementary (K-6)', icon: 'school', color: colors.success },
    { id: 'juniorHigh', label: 'Junior High (7-10)', icon: 'flask', color: colors.primary },
    { id: 'seniorHigh', label: 'Senior High (11-12)', icon: 'rocket', color: colors.secondary },
];

export default function GradeSelectionModal({ visible, currentGrade, onSelect, onClose }: GradeSelectionModalProps) {
    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
            <View style={styles.overlay}>
                <View style={styles.container}>
                    <View style={styles.header}>
                        <Text style={styles.title}>Select Grade Level</Text>
                        <TouchableOpacity onPress={onClose}>
                            <Ionicons name="close" size={24} color={colors.lightGray} />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.content}>
                        {GRADES.map((grade) => (
                            <TouchableOpacity
                                key={grade.id}
                                style={[
                                    styles.option,
                                    currentGrade === grade.id && styles.optionSelected
                                ]}
                                onPress={() => {
                                    onSelect(grade.id);
                                    onClose();
                                }}
                            >
                                <View style={[styles.iconContainer, { backgroundColor: `${grade.color}20` }]}>
                                    <Ionicons name={grade.icon as any} size={24} color={grade.color} />
                                </View>
                                <Text style={[
                                    styles.optionText,
                                    currentGrade === grade.id && styles.optionTextSelected
                                ]}>
                                    {grade.label}
                                </Text>
                                {currentGrade === grade.id && (
                                    <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
                                )}
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
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        justifyContent: 'center',
        padding: 20,
    },
    container: {
        backgroundColor: '#1A1C2A',
        borderRadius: 20,
        borderWidth: 1,
        borderColor: colors.primary,
        width: '100%',
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
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'transparent',
    },
    optionSelected: {
        backgroundColor: 'rgba(0, 191, 255, 0.1)',
        borderColor: colors.primary,
    },
    iconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    optionText: {
        flex: 1,
        fontFamily: fonts.body,
        fontSize: 16,
        color: colors.lightGray,
    },
    optionTextSelected: {
        color: colors.text,
        fontFamily: fonts.heading,
    },
});