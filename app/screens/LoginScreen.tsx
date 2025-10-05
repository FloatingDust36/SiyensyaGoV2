// In app/screens/LoginScreen.tsx
import React, { useState } from 'react'; // ADDED: useState
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Animated, KeyboardAvoidingView, Platform, ScrollView } from 'react-native'; // ADDED: Animated, KeyboardAvoidingView, Platform, ScrollView
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts } from '../theme/theme';

// We'll receive the navigation prop to move to other screens
export default function LoginScreen({ navigation }: any) {
    // ========== ADDED: State management ==========
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
    // ========== END ADDED ==========

    // ========== ADDED: Start glow animation on mount ==========
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
    // ========== END ADDED ==========

    // ========== ADDED: Toggle between sign in and sign up ==========
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
    // ========== END ADDED ==========

    // ========== ADDED: Handle authentication ==========
    const handleAuth = () => {
        // TODO: Implement actual authentication logic
        if (isSignUp) {
            // Sign up validation
            if (!fullName || !email || !password || !confirmPassword) {
                alert('Please fill in all fields');
                return;
            }
            if (password !== confirmPassword) {
                alert('Passwords do not match');
                return;
            }
            alert('Account created successfully!');
        } else {
            // Sign in validation
            if (!email || !password) {
                alert('Please enter email and password');
                return;
            }
            alert('Signed in successfully!');
        }
        navigation.replace('MainTabs');
    };

    const handleForgotPassword = () => {
        alert('Password reset link sent to your email!');
    };

    const handleSocialLogin = (provider: string) => {
        alert(`${provider} login coming soon!`);
        // TODO: Implement social login
    };
    // ========== END ADDED ==========

    const handleGuest = () => {
        // Navigate to the main app tabs
        navigation.replace('MainTabs');
    };

    return (
        <SafeAreaView style={styles.container}>
            {/* ADDED: KeyboardAvoidingView and ScrollView for better mobile experience */}
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.keyboardView}
            >
                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                >
                    {/* MODIFIED: Enhanced header with animated glow */}
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

                    {/* MODIFIED: Enhanced form with conditional fields */}
                    <View style={styles.form}>
                        {/* ADDED: Full Name field for sign up */}
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

                        {/* MODIFIED: Email input with state */}
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

                        {/* MODIFIED: Password input with visibility toggle */}
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

                        {/* ADDED: Confirm Password field for sign up */}
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

                        {/* ADDED: Forgot Password link (only for sign in) */}
                        {!isSignUp && (
                            <TouchableOpacity onPress={handleForgotPassword} style={styles.forgotPassword}>
                                <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
                            </TouchableOpacity>
                        )}
                    </View>

                    {/* MODIFIED: Action button with dynamic text */}
                    <View style={styles.actions}>
                        <TouchableOpacity style={styles.mainButton} onPress={handleAuth}>
                            <Text style={styles.mainButtonText}>
                                {isSignUp ? 'Create Account' : 'Sign In'}
                            </Text>
                        </TouchableOpacity>

                        {/* MODIFIED: Toggle mode button */}
                        <TouchableOpacity style={styles.secondaryButton} onPress={toggleMode}>
                            <Text style={styles.secondaryButtonText}>
                                {isSignUp ? 'Already have an account? Sign In' : 'Create New Account'}
                            </Text>
                        </TouchableOpacity>
                    </View>

                    {/* ADDED: Social login divider */}
                    <View style={styles.dividerContainer}>
                        <View style={styles.divider} />
                        <Text style={styles.dividerText}>OR</Text>
                        <View style={styles.divider} />
                    </View>

                    {/* ADDED: Social login buttons */}
                    <View style={styles.socialContainer}>
                        <TouchableOpacity
                            style={styles.socialButton}
                            onPress={() => handleSocialLogin('Google')}
                        >
                            <Ionicons name="logo-google" size={24} color={colors.text} />
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.socialButton}
                            onPress={() => handleSocialLogin('Facebook')}
                        >
                            <Ionicons name="logo-facebook" size={24} color={colors.text} />
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.socialButton}
                            onPress={() => handleSocialLogin('Apple')}
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
    // ADDED: KeyboardAvoidingView style
    keyboardView: {
        flex: 1,
    },
    // ADDED: ScrollView content style
    scrollContent: {
        flexGrow: 1,
        justifyContent: 'center',
        padding: 20,
        paddingTop: 40, // ADDED: More top padding
    },
    // MODIFIED: Enhanced header with more padding and border
    header: {
        paddingVertical: 30, // CHANGED: from paddingTop: 40
        alignItems: 'center',
        borderRadius: 20, // ADDED
        marginBottom: 30, // ADDED
        borderWidth: 1, // ADDED
        borderColor: 'rgba(0, 191, 255, 0.2)', // ADDED
    },
    title: {
        fontFamily: fonts.heading,
        color: colors.text,
        fontSize: 32, // CHANGED: from 36
        textAlign: 'center',
        marginTop: 15, // ADDED
    },
    subtitle: {
        fontFamily: fonts.body,
        color: colors.lightGray,
        fontSize: 15, // CHANGED: from 16
        textAlign: 'center',
        marginTop: 10,
        maxWidth: '90%', // CHANGED: from 80%
        lineHeight: 22, // ADDED
    },
    form: {
        gap: 15,
        marginBottom: 20, // ADDED
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
        fontFamily: fonts.body, // ADDED
    },
    // ADDED: Eye icon for password visibility
    eyeIcon: {
        paddingHorizontal: 15,
    },
    // ADDED: Forgot password link
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
        marginBottom: 20, // ADDED
    },
    mainButton: {
        backgroundColor: colors.primary,
        padding: 18, // CHANGED: from 20
        borderRadius: 10,
        alignItems: 'center',
        // ADDED: Shadow for depth
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
        padding: 18, // CHANGED: from 20
        borderRadius: 10,
        alignItems: 'center',
    },
    secondaryButtonText: {
        color: colors.primary,
        fontSize: 16, // CHANGED: from 18
        fontFamily: fonts.body, // CHANGED: from fonts.heading
    },
    // ADDED: Divider styles
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
    // ADDED: Social login styles
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
        paddingVertical: 10, // ADDED
    },
    guestButtonText: {
        color: colors.primary,
        fontSize: 16,
        fontFamily: fonts.body,
    },
});