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

type OTPModalProps = {
    visible: boolean;
    email: string;
    type: 'signup' | 'recovery';
    onClose: () => void;
    onVerify: (code: string) => Promise<void>;
};

export default function OTPModal({ visible, email, type, onClose, onVerify }: OTPModalProps) {
    const [code, setCode] = useState('');
    const [loading, setLoading] = useState(false);

    const handleVerify = async () => {
        if (code.length < 6) return;
        setLoading(true);
        try {
            await onVerify(code);
        } finally {
            setLoading(false);
            setCode(''); // Reset code to clear state
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
                            <Ionicons name="shield-checkmark-outline" size={48} color={colors.primary} />
                        </View>

                        <Text style={styles.title}>
                            {type === 'signup' ? 'Verify Account' : 'Reset Password'}
                        </Text>
                        <Text style={styles.subtitle}>
                            Enter the 6-digit code sent to{'\n'}
                            <Text style={styles.email}>{email}</Text>
                        </Text>

                        <TextInput
                            style={styles.input}
                            placeholder="000000"
                            placeholderTextColor={colors.lightGray}
                            keyboardType="number-pad"
                            maxLength={6}
                            value={code}
                            onChangeText={setCode}
                            autoFocus={true}
                            selectionColor={colors.primary}
                        />

                        <TouchableOpacity
                            style={[styles.verifyButton, code.length !== 6 && styles.verifyButtonDisabled]}
                            onPress={handleVerify}
                            disabled={code.length !== 6 || loading}
                        >
                            {loading ? (
                                <ActivityIndicator color={colors.background} />
                            ) : (
                                <Text style={styles.verifyButtonText}>Verify Code</Text>
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
        lineHeight: 20,
    },
    email: {
        color: colors.text,
        fontFamily: fonts.heading,
    },
    input: {
        backgroundColor: colors.background,
        width: '100%',
        borderRadius: 12,
        padding: 16,
        fontSize: 24,
        fontFamily: fonts.heading,
        color: colors.text,
        textAlign: 'center',
        letterSpacing: 8,
        borderWidth: 1,
        borderColor: 'rgba(0, 191, 255, 0.2)',
        marginBottom: 24,
    },
    verifyButton: {
        backgroundColor: colors.primary,
        width: '100%',
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
    },
    verifyButtonDisabled: {
        opacity: 0.5,
    },
    verifyButtonText: {
        fontFamily: fonts.heading,
        fontSize: 16,
        color: colors.background,
    },
});