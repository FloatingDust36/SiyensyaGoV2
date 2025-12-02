import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TextInput,
    TouchableOpacity,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts } from '../theme/theme';

type ChangePasswordModalProps = {
    visible: boolean;
    onClose: () => void;
    onSubmit: (password: string) => Promise<void>;
};

export default function ChangePasswordModal({ visible, onClose, onSubmit }: ChangePasswordModalProps) {
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const handleSubmit = async () => {
        if (password.length < 6) {
            alert('Password must be at least 6 characters');
            return;
        }
        if (password !== confirmPassword) {
            alert('Passwords do not match');
            return;
        }

        setLoading(true);
        try {
            await onSubmit(password);
        } finally {
            setLoading(false);
            setPassword('');
            setConfirmPassword('');
        }
    };

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <View style={styles.overlay}>
                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.keyboardView}>
                    <View style={styles.container}>
                        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                            <Ionicons name="close" size={24} color={colors.lightGray} />
                        </TouchableOpacity>

                        <View style={styles.iconContainer}>
                            <Ionicons name="lock-closed-outline" size={48} color={colors.primary} />
                        </View>

                        <Text style={styles.title}>New Password</Text>
                        <Text style={styles.subtitle}>
                            Create a new password for your account.
                        </Text>

                        <View style={styles.inputContainer}>
                            <TextInput
                                style={styles.input}
                                placeholder="New Password"
                                placeholderTextColor={colors.lightGray}
                                secureTextEntry={!showPassword}
                                value={password}
                                onChangeText={setPassword}
                            />
                            <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
                                <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={20} color={colors.lightGray} />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.inputContainer}>
                            <TextInput
                                style={styles.input}
                                placeholder="Confirm Password"
                                placeholderTextColor={colors.lightGray}
                                secureTextEntry={!showPassword}
                                value={confirmPassword}
                                onChangeText={setConfirmPassword}
                            />
                        </View>

                        <TouchableOpacity
                            style={[styles.submitButton, (!password || !confirmPassword) && styles.disabledButton]}
                            onPress={handleSubmit}
                            disabled={!password || !confirmPassword || loading}
                        >
                            {loading ? (
                                <ActivityIndicator color={colors.background} />
                            ) : (
                                <Text style={styles.submitButtonText}>Update Password</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </KeyboardAvoidingView>
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
    keyboardView: {
        width: '100%',
    },
    container: {
        backgroundColor: '#1A1C2A',
        borderRadius: 20,
        padding: 24,
        borderWidth: 1,
        borderColor: colors.primary,
        alignItems: 'center',
    },
    closeButton: {
        position: 'absolute',
        top: 16,
        right: 16,
        zIndex: 1,
    },
    iconContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: 'rgba(0, 191, 255, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
        borderWidth: 1,
        borderColor: 'rgba(0, 191, 255, 0.3)',
    },
    title: {
        fontFamily: fonts.heading,
        fontSize: 24,
        color: colors.text,
        marginBottom: 8,
    },
    subtitle: {
        fontFamily: fonts.body,
        fontSize: 14,
        color: colors.lightGray,
        textAlign: 'center',
        marginBottom: 24,
    },
    inputContainer: {
        width: '100%',
        marginBottom: 16,
        position: 'relative',
    },
    input: {
        backgroundColor: colors.background,
        width: '100%',
        borderRadius: 12,
        padding: 16,
        fontSize: 16,
        fontFamily: fonts.body,
        color: colors.text,
        borderWidth: 1,
        borderColor: 'rgba(0, 191, 255, 0.2)',
    },
    eyeIcon: {
        position: 'absolute',
        right: 16,
        top: 16,
    },
    submitButton: {
        backgroundColor: colors.primary,
        width: '100%',
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
        marginTop: 8,
    },
    disabledButton: {
        opacity: 0.5,
    },
    submitButtonText: {
        fontFamily: fonts.heading,
        fontSize: 16,
        color: colors.background,
    },
});