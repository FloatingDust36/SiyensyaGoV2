// In app/screens/LoginScreen.tsx
import React, { useState, useEffect } from 'react'; 
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Animated, KeyboardAvoidingView, Platform, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts } from '../theme/theme';
import { SupabaseAuth, supabase, SupabaseProfile } from '../services/supabase'; // IMPORTED supabase and SupabaseProfile

export default function LoginScreen({ navigation }: any) {
    const [isSignUp, setIsSignUp] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [fullName, setFullName] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [loading, setLoading] = useState(false); // New loading state for buttons

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

    // AUTHENTICATION LISTENER: Handles navigation after successful OAuth or manual login/signup
    useEffect(() => {
        setLoading(true);
        // This listener fires whenever the authentication state changes (e.g., after OAuth redirect)
        const { data: authListener } = supabase.auth.onAuthStateChange(
            async (event, session) => {
                setLoading(false);
                if (session) {
                    // User is signed in. Check onboarding status.
                    try {
                        const profile = await SupabaseProfile.getProfile(session.user.id);
                        if (profile.has_completed_onboarding) {
                            navigation.replace('MainTabs', { screen: 'Camera' });
                        } else {
                            navigation.replace('GradeLevel');
                        }
                    } catch (error) {
                        // User exists but no profile yet (e.g., new OAuth user)
                        navigation.replace('GradeLevel');
                    }
                } else if (event === 'SIGNED_OUT') {
                    // Do nothing, stay on login screen
                }
            }
        );

        return () => {
            authListener.subscription.unsubscribe();
        };
    }, []); // Run only once on mount

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

    // Handle email/password authentication
    const handleAuth = async () => {
        setLoading(true);
        if (isSignUp) {
            // Sign up validation (omitted for brevity, assume validation is correct)
            if (password !== confirmPassword) {
                Alert.alert('Error', 'Passwords do not match');
                setLoading(false);
                return;
            }
            if (!fullName || !email || !password || !confirmPassword) {
                Alert.alert('Error', 'Please fill in all fields');
                setLoading(false);
                return;
            }
            if (password.length < 6) {
                Alert.alert('Error', 'Password must be at least 6 characters');
                setLoading(false);
                return;
            }

            try {
                const result = await SupabaseAuth.signUp(email, password, fullName);

                if (result.user && !result.session) {
                    // New user, needs email verification. Stay on screen, listener won't fire.
                    Alert.alert(
                        'Success!',
                        'Account created! Please check your email to verify your account before signing in.'
                    );
                } else if (result.session) {
                    // Session established (either confirmed or email verification disabled)
                    // The useEffect listener handles navigation.
                    Alert.alert('Success!', 'Signed up successfully!');
                }
            } catch (error: any) {
                console.error('Signup error:', error);
                Alert.alert('Sign Up Error', error.message || 'Failed to create account');
            }
        } else {
            // Sign in validation
            if (!email || !password) {
                Alert.alert('Error', 'Please enter email and password');
                setLoading(false);
                return;
            }

            try {
                await SupabaseAuth.signIn(email, password);
                // The useEffect listener handles navigation upon successful session creation.
            } catch (error: any) {
                Alert.alert('Sign In Error', error.message || 'Failed to sign in');
            }
        }
        setLoading(false);
    };

    const handleForgotPassword = () => {
        Alert.alert('Password Reset', 'Password reset functionality is not implemented yet.');
    };

    // Handle OAuth login
    const handleSocialLogin = async (provider: 'google' | 'facebook' | 'apple') => {
        setLoading(true);
        try {
            // This opens the browser. When the browser closes and the session is active, 
            // the useEffect listener handles the navigation.
            await SupabaseAuth.signInWithOAuth(provider);
            // We set loading false here because the listener will take over the navigation
            setLoading(false);
        } catch (error: any) {
            setLoading(false);
            Alert.alert('Error', error.message || `Failed to sign in with ${provider}.`);
        }
    };

    const handleGuest = () => {
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
                        <TouchableOpacity style={styles.mainButton} onPress={handleAuth} disabled={loading}>
                            <Text style={styles.mainButtonText}>
                                {loading && !isSignUp ? 'Signing In...' : (isSignUp ? 'Create Account' : 'Sign In')}
                            </Text>
                        </TouchableOpacity>

                        {/* Toggle mode button */}
                        <TouchableOpacity style={styles.secondaryButton} onPress={toggleMode} disabled={loading}>
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
                            disabled={loading}
                        >
                            <Ionicons name="logo-google" size={24} color={colors.text} />
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.socialButton}
                            onPress={() => handleSocialLogin('facebook')}
                            disabled={loading}
                        >
                            <Ionicons name="logo-facebook" size={24} color={colors.text} />
                        </TouchableOpacity>
                        { /* <TouchableOpacity
                            style={styles.socialButton}
                            onPress={() => handleSocialLogin('apple')}
                            disabled={loading}
                        >
                            <Ionicons name="logo-apple" size={24} color={colors.text} />
                        </TouchableOpacity>*/}
                    </View>

                    {/* Guest Mode */}
                    <View style={styles.guestContainer}>
                        <TouchableOpacity style={styles.guestButton} onPress={handleGuest} disabled={loading}>
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