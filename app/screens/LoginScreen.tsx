// In app/screens/LoginScreen.tsx
import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Animated, KeyboardAvoidingView, Platform, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts } from '../theme/theme';
import { SupabaseAuth } from '../services/supabase';

export default function LoginScreen({ navigation }: any) {
    const [isSignUp, setIsSignUp] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [fullName, setFullName] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    // Animation values
    const slideAnim = React.useRef(new Animated.Value(0)).current;
    const glowAnim = React.useRef(new Animated.Value(0)).current;

    // Start glow animation on mount
    React.useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(glowAnim, {
                    toValue: 1,
                    duration: 2000,
                    useNativeDriver: false,
                }),
                Animated.timing(glowAnim, {
                    toValue: 0,
                    duration: 2000,
                    useNativeDriver: false,
                }),
            ])
        ).start();
    }, []);

    const glowColor = glowAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['rgba(0, 191, 255, 0.1)', 'rgba(0, 191, 255, 0.3)'],
    });

    // Toggle between sign in and sign up
    const toggleMode = () => {
        Animated.timing(slideAnim, {
            toValue: isSignUp ? 0 : 1,
            duration: 300,
            useNativeDriver: true,
        }).start();
        setIsSignUp(!isSignUp);
        // Clear fields when switching
        setEmail('');
        setPassword('');
        setConfirmPassword('');
        setFullName('');
    };

    // Handle authentication
    const handleAuth = async () => {
        if (isSignUp) {
            // Sign up validation
            if (!fullName || !email || !password || !confirmPassword) {
                Alert.alert('Error', 'Please fill in all fields');
                return;
            }
            if (password !== confirmPassword) {
                Alert.alert('Error', 'Passwords do not match');
                return;
            }
            if (password.length < 6) {
                Alert.alert('Error', 'Password must be at least 6 characters');
                return;
            }

            try {
                const result = await SupabaseAuth.signUp(email, password, fullName);

                // Supabase behavior:
                // - Duplicate email: Returns user with confirmed_at set (already confirmed)
                // - New email: Returns user with confirmed_at null (needs verification)
                // - Failed: Returns no user

                if (result.user) {
                    // Check if this is actually a duplicate by checking confirmed_at
                    if (result.user.confirmed_at && !result.session) {
                        // User already exists and is confirmed, but no session (duplicate signup attempt)
                        Alert.alert(
                            'Account Already Exists',
                            'This email is already registered. Would you like to sign in instead?',
                            [
                                {
                                    text: 'Sign In',
                                    onPress: () => {
                                        setIsSignUp(false);
                                        // Keep email, clear passwords
                                        setPassword('');
                                        setConfirmPassword('');
                                        setFullName('');
                                    }
                                },
                                { text: 'Cancel', style: 'cancel' }
                            ]
                        );
                    } else if (!result.session) {
                        // New user, needs verification
                        Alert.alert(
                            'Success!',
                            'Account created! Please check your email to verify your account before signing in.',
                            [
                                {
                                    text: 'OK',
                                    onPress: () => {
                                        setIsSignUp(false);
                                        setEmail('');
                                        setPassword('');
                                        setConfirmPassword('');
                                        setFullName('');
                                    }
                                }
                            ]
                        );
                    } else {
                        // Has session - email verification disabled
                        Alert.alert(
                            'Success!',
                            'Account created successfully!',
                            [{ text: 'OK', onPress: () => navigation.replace('GradeLevel') }]
                        );
                    }
                } else {
                    // No user returned - something went wrong
                    Alert.alert('Error', 'Unable to create account. Please try again.');
                }
            } catch (error: any) {
                console.error('Signup error:', error);
                Alert.alert('Sign Up Error', error.message || 'Failed to create account');
            }
        } else {
            // Sign in validation
            if (!email || !password) {
                Alert.alert('Error', 'Please enter email and password');
                return;
            }

            try {
                await SupabaseAuth.signIn(email, password);

                // Check if user has completed onboarding
                const { SupabaseProfile } = require('../services/supabase');
                const session = await SupabaseAuth.getSession();

                if (session?.user) {
                    try {
                        const profile = await SupabaseProfile.getProfile(session.user.id);

                        if (profile.has_completed_onboarding) {
                            // Returning user - skip GradeLevelScreen
                            navigation.replace('MainTabs', { screen: 'Camera' });
                        } else {
                            // First time signing in - show GradeLevelScreen
                            navigation.replace('GradeLevel');
                        }
                    } catch (error) {
                        // Default to showing GradeLevelScreen on error
                        navigation.replace('GradeLevel');
                    }
                } else {
                    navigation.replace('GradeLevel');
                }
            } catch (error: any) {
                Alert.alert('Sign In Error', error.message || 'Failed to sign in');
            }
        }
    };

    const handleForgotPassword = () => {
        alert('Password reset link sent to your email!');
    };

    const handleSocialLogin = async (provider: 'google' | 'facebook' | 'apple') => {
        try {
            await SupabaseAuth.signInWithOAuth(provider);
            // OAuth will handle redirect automatically
        } catch (error: any) {
            Alert.alert('Error', error.message || `Failed to sign in with ${provider}`);
        }
    };

    const handleGuest = () => {
        // Navigate to the main app tabs
        navigation.replace('GradeLevel');
    };

    return (
        <SafeAreaView style={styles.container}>
            {/* KeyboardAvoidingView and ScrollView for better mobile experience */}
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.keyboardView}
            >
                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                >
                    {/* Enhanced header with animated glow */}
                    <Animated.View style={[styles.header, { backgroundColor: glowColor }]}>
                        <Ionicons name="planet-outline" size={60} color={colors.primary} />
                        <Text style={styles.title}>
                            {isSignUp ? 'Join the Mission' : 'Welcome Explorer'}
                        </Text>
                        <Text style={styles.subtitle}>
                            {isSignUp
                                ? 'Create your account to start discovering science'
                                : 'Authenticate to begin your journey or proceed as a guest.'}
                        </Text>
                    </Animated.View>

                    {/* Enhanced form with conditional fields */}
                    <View style={styles.form}>
                        {/* Full Name field for sign up */}
                        {isSignUp && (
                            <View style={styles.inputContainer}>
                                <Ionicons name="person-outline" size={20} color={colors.lightGray} style={styles.inputIcon} />
                                <TextInput
                                    placeholder="Full Name"
                                    placeholderTextColor={colors.lightGray}
                                    style={styles.input}
                                    value={fullName}
                                    onChangeText={setFullName}
                                    autoCapitalize="words"
                                />
                            </View>
                        )}

                        {/* Email input with state */}
                        <View style={styles.inputContainer}>
                            <Ionicons name="mail-outline" size={20} color={colors.lightGray} style={styles.inputIcon} />
                            <TextInput
                                placeholder="Email Address"
                                placeholderTextColor={colors.lightGray}
                                style={styles.input}
                                keyboardType="email-address"
                                autoCapitalize="none"
                                value={email}
                                onChangeText={setEmail}
                            />
                        </View>

                        {/* Password input with visibility toggle */}
                        <View style={styles.inputContainer}>
                            <Ionicons name="lock-closed-outline" size={20} color={colors.lightGray} style={styles.inputIcon} />
                            <TextInput
                                placeholder="Password"
                                placeholderTextColor={colors.lightGray}
                                style={styles.input}
                                secureTextEntry={!showPassword}
                                value={password}
                                onChangeText={setPassword}
                            />
                            <TouchableOpacity
                                onPress={() => setShowPassword(!showPassword)}
                                style={styles.eyeIcon}
                            >
                                <Ionicons
                                    name={showPassword ? "eye-outline" : "eye-off-outline"}
                                    size={20}
                                    color={colors.lightGray}
                                />
                            </TouchableOpacity>
                        </View>

                        {/* Confirm Password field for sign up */}
                        {isSignUp && (
                            <View style={styles.inputContainer}>
                                <Ionicons name="lock-closed-outline" size={20} color={colors.lightGray} style={styles.inputIcon} />
                                <TextInput
                                    placeholder="Confirm Password"
                                    placeholderTextColor={colors.lightGray}
                                    style={styles.input}
                                    secureTextEntry={!showConfirmPassword}
                                    value={confirmPassword}
                                    onChangeText={setConfirmPassword}
                                />
                                <TouchableOpacity
                                    onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                                    style={styles.eyeIcon}
                                >
                                    <Ionicons
                                        name={showConfirmPassword ? "eye-outline" : "eye-off-outline"}
                                        size={20}
                                        color={colors.lightGray}
                                    />
                                </TouchableOpacity>
                            </View>
                        )}

                        {/* Forgot Password link (only for sign in) */}
                        {!isSignUp && (
                            <TouchableOpacity onPress={handleForgotPassword} style={styles.forgotPassword}>
                                <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
                            </TouchableOpacity>
                        )}
                    </View>

                    {/* Action button with dynamic text */}
                    <View style={styles.actions}>
                        <TouchableOpacity style={styles.mainButton} onPress={handleAuth}>
                            <Text style={styles.mainButtonText}>
                                {isSignUp ? 'Create Account' : 'Sign In'}
                            </Text>
                        </TouchableOpacity>

                        {/* Toggle mode button */}
                        <TouchableOpacity style={styles.secondaryButton} onPress={toggleMode}>
                            <Text style={styles.secondaryButtonText}>
                                {isSignUp ? 'Already have an account? Sign In' : 'Create New Account'}
                            </Text>
                        </TouchableOpacity>
                    </View>

                    {/* Social login divider */}
                    <View style={styles.dividerContainer}>
                        <View style={styles.divider} />
                        <Text style={styles.dividerText}>OR</Text>
                        <View style={styles.divider} />
                    </View>

                    {/* Social login buttons */}
                    <View style={styles.socialContainer}>
                        <TouchableOpacity
                            style={styles.socialButton}
                            onPress={() => handleSocialLogin('google')}
                        >
                            <Ionicons name="logo-google" size={24} color={colors.text} />
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.socialButton}
                            onPress={() => handleSocialLogin('facebook')}
                        >
                            <Ionicons name="logo-facebook" size={24} color={colors.text} />
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.socialButton}
                            onPress={() => handleSocialLogin('apple')}
                        >
                            <Ionicons name="logo-apple" size={24} color={colors.text} />
                        </TouchableOpacity>
                    </View>

                    {/* Guest Mode */}
                    <View style={styles.guestContainer}>
                        <TouchableOpacity style={styles.guestButton} onPress={handleGuest}>
                            <Text style={styles.guestButtonText}>Continue as Guest</Text>
                            <Ionicons name="arrow-forward" size={20} color={colors.primary} />
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    keyboardView: {
        flex: 1,
    },
    scrollContent: {
        flexGrow: 1,
        justifyContent: 'center',
        padding: 20,
        paddingTop: 40,
    },
    header: {
        paddingVertical: 30,
        alignItems: 'center',
        borderRadius: 20,
        marginBottom: 30,
        borderWidth: 1,
        borderColor: 'rgba(0, 191, 255, 0.2)',
    },
    title: {
        fontFamily: fonts.heading,
        color: colors.text,
        fontSize: 32,
        textAlign: 'center',
        marginTop: 15,
    },
    subtitle: {
        fontFamily: fonts.body,
        color: colors.lightGray,
        fontSize: 15,
        textAlign: 'center',
        marginTop: 10,
        maxWidth: '90%',
        lineHeight: 22,
    },
    form: {
        gap: 15,
        marginBottom: 20,
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
        fontFamily: fonts.body,
    },
    eyeIcon: {
        paddingHorizontal: 15,
    },
    forgotPassword: {
        alignSelf: 'flex-end',
        marginTop: 5,
    },
    forgotPasswordText: {
        color: colors.primary,
        fontSize: 14,
        fontFamily: fonts.body,
    },
    actions: {
        gap: 15,
        marginBottom: 20,
    },
    mainButton: {
        backgroundColor: colors.primary,
        padding: 18,
        borderRadius: 10,
        alignItems: 'center',
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 5,
    },
    mainButtonText: {
        color: colors.background,
        fontSize: 18,
        fontFamily: fonts.heading,
    },
    secondaryButton: {
        borderColor: colors.primary,
        borderWidth: 1,
        padding: 18,
        borderRadius: 10,
        alignItems: 'center',
    },
    secondaryButtonText: {
        color: colors.primary,
        fontSize: 16,
        fontFamily: fonts.body,
    },
    dividerContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: 20,
    },
    divider: {
        flex: 1,
        height: 1,
        backgroundColor: 'rgba(0, 191, 255, 0.2)',
    },
    dividerText: {
        color: colors.lightGray,
        fontSize: 14,
        fontFamily: fonts.body,
        marginHorizontal: 15,
    },
    socialContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 20,
        marginBottom: 30,
    },
    socialButton: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: '#1A1C2A',
        borderWidth: 1,
        borderColor: 'rgba(0, 191, 255, 0.3)',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 3,
    },
    guestContainer: {
        alignItems: 'center',
        paddingBottom: 20,
    },
    guestButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingVertical: 10,
    },
    guestButtonText: {
        color: colors.primary,
        fontSize: 16,
        fontFamily: fonts.body,
    },
});