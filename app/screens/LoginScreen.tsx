// In app/screens/LoginScreen.tsx
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts } from '../theme/theme';

// We'll receive the navigation prop to move to other screens
export default function LoginScreen({ navigation }: any) {

    const handleGuest = () => {
        // Navigate to the main app tabs
        navigation.replace('MainTabs');
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Welcome Explorer</Text>
                <Text style={styles.subtitle}>Authenticate to begin your journey or proceed as a guest.</Text>
            </View>

            {/* Main Login Form */}
            <View style={styles.form}>
                <View style={styles.inputContainer}>
                    <Ionicons name="mail-outline" size={20} color={colors.lightGray} style={styles.inputIcon} />
                    <TextInput
                        placeholder="Email Address"
                        placeholderTextColor={colors.lightGray}
                        style={styles.input}
                        keyboardType="email-address"
                        autoCapitalize="none"
                    />
                </View>
                <View style={styles.inputContainer}>
                    <Ionicons name="lock-closed-outline" size={20} color={colors.lightGray} style={styles.inputIcon} />
                    <TextInput
                        placeholder="Password"
                        placeholderTextColor={colors.lightGray}
                        style={styles.input}
                        secureTextEntry
                    />
                </View>
            </View>

            {/* Action Buttons */}
            <View style={styles.actions}>
                <TouchableOpacity style={styles.mainButton}>
                    <Text style={styles.mainButtonText}>Sign In</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.secondaryButton}>
                    <Text style={styles.secondaryButtonText}>Create Account</Text>
                </TouchableOpacity>
            </View>

            {/* Guest Mode */}
            <View style={styles.guestContainer}>
                <TouchableOpacity style={styles.guestButton} onPress={handleGuest}>
                    <Text style={styles.guestButtonText}>Continue as Guest</Text>
                    <Ionicons name="arrow-forward" size={20} color={colors.primary} />
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
        justifyContent: 'space-between',
        padding: 20,
    },
    header: {
        paddingTop: 40,
        alignItems: 'center',
    },
    title: {
        fontFamily: fonts.heading,
        color: colors.text,
        fontSize: 36,
        textAlign: 'center',
    },
    subtitle: {
        fontFamily: fonts.body,
        color: colors.lightGray,
        fontSize: 16,
        textAlign: 'center',
        marginTop: 10,
        maxWidth: '80%',
    },
    form: {
        gap: 15,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#1A1C2A',
        borderRadius: 10,
        borderWidth: 1,
        borderColor: 'rgba(0, 191, 255, 0.2)',
    },
    inputIcon: {
        paddingHorizontal: 15,
    },
    input: {
        flex: 1,
        color: colors.text,
        paddingVertical: 15,
        paddingRight: 15,
        fontSize: 16,
    },
    actions: {
        gap: 15,
    },
    mainButton: {
        backgroundColor: colors.primary,
        padding: 20,
        borderRadius: 10,
        alignItems: 'center',
    },
    mainButtonText: {
        color: colors.background,
        fontSize: 18,
        fontFamily: fonts.heading,
    },
    secondaryButton: {
        borderColor: colors.primary,
        borderWidth: 1,
        padding: 20,
        borderRadius: 10,
        alignItems: 'center',
    },
    secondaryButtonText: {
        color: colors.primary,
        fontSize: 18,
        fontFamily: fonts.heading,
    },
    guestContainer: {
        alignItems: 'center',
        paddingBottom: 20,
    },
    guestButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    guestButtonText: {
        color: colors.primary,
        fontSize: 16,
        fontFamily: fonts.body,
    },
});