// app/screens/CameraScreen.tsx - UI RESTORED
import React, { useRef, useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Linking, Animated, Modal, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions, FlashMode } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/types';
import { colors, fonts } from '../theme/theme';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { useApp } from '../context/AppContext';
import * as Haptics from 'expo-haptics';

type CameraNavigationProp = StackNavigationProp<RootStackParamList, 'MainTabs'>;

export default function CameraScreen() {
    const [permission, requestPermission] = useCameraPermissions();
    const cameraRef = useRef<CameraView>(null);
    const navigation = useNavigation<CameraNavigationProp>();
    const isFocused = useIsFocused();
    const { stats, isOnline } = useApp();

    const [facing, setFacing] = useState<'back' | 'front'>('back');
    const [flash, setFlash] = useState<FlashMode>('off');
    const [isScanning, setIsScanning] = useState(false);
    const [showHelpModal, setShowHelpModal] = useState(false);

    // Animation refs
    const scanLineAnim = useRef(new Animated.Value(0)).current;
    const reticleGlowAnim = useRef(new Animated.Value(0)).current;
    const pulseAnim = useRef(new Animated.Value(1)).current;
    const cornerAnims = useRef(Array.from({ length: 4 }, () => new Animated.Value(0))).current;

    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(scanLineAnim, { toValue: 1, duration: 2000, useNativeDriver: true }),
                Animated.timing(scanLineAnim, { toValue: 0, duration: 2000, useNativeDriver: true }),
            ])
        ).start();

        Animated.loop(
            Animated.sequence([
                Animated.timing(reticleGlowAnim, { toValue: 1, duration: 1500, useNativeDriver: false }),
                Animated.timing(reticleGlowAnim, { toValue: 0, duration: 1500, useNativeDriver: false }),
            ])
        ).start();

        Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, { toValue: 1.1, duration: 1000, useNativeDriver: true }),
                Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
            ])
        ).start();

        const cornerSequence = Animated.stagger(
            200,
            cornerAnims.map((anim) =>
                Animated.loop(
                    Animated.sequence([
                        Animated.timing(anim, { toValue: 1, duration: 800, useNativeDriver: false }),
                        Animated.timing(anim, { toValue: 0, duration: 800, useNativeDriver: false }),
                    ])
                )
            )
        );
        cornerSequence.start();
    }, []);

    const scanLineTranslateY = scanLineAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [-150, 150],
    });

    const reticleGlowColor = reticleGlowAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['rgba(0, 191, 255, 0.3)', 'rgba(0, 191, 255, 0.8)'],
    });

    const processAndNavigate = async (uri: string) => {
        try {
            const normalized = await ImageManipulator.manipulateAsync(
                uri,
                [],
                { format: ImageManipulator.SaveFormat.JPEG }
            );
            navigation.navigate('ObjectRecognition', { imageUri: normalized.uri });
        } catch (error) {
            console.error("Error normalizing image:", error);
            Alert.alert("Error", "Could not process image.");
        }
    };

    const handleScan = async () => {
        if (cameraRef.current && !isScanning) {
            setIsScanning(true);
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

            try {
                const photo = await cameraRef.current.takePictureAsync({ quality: 0.8 });
                if (photo) await processAndNavigate(photo.uri);
            } catch (error) {
                console.error("Failed to take picture:", error);
                Alert.alert('Error', 'Failed to capture image. Please try again.');
            } finally {
                setIsScanning(false);
            }
        }
    };

    const toggleCameraFacing = () => setFacing(current => (current === 'back' ? 'front' : 'back'));
    const toggleFlash = () => setFlash(current => (current === 'off' ? 'on' : 'off'));

    const handleGalleryAccess = async () => {
        try {
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Permission Required', 'Please grant access to your photo library.', [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Open Settings', onPress: () => Linking.openSettings() }
                ]);
                return;
            }

            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: false,
                quality: 0.8,
            });

            if (!result.canceled && result.assets[0]) {
                await processAndNavigate(result.assets[0].uri);
            }
        } catch (error) {
            Alert.alert('Error', 'Failed to open gallery.');
        }
    };

    if (!permission) return <View style={styles.container}><ActivityIndicator size="large" color={colors.primary} /></View>;

    if (!permission.granted) {
        return (
            <SafeAreaView style={styles.permissionContainer}>
                <Ionicons name="camera-outline" size={80} color={colors.primary} style={{ opacity: 0.5 }} />
                <Text style={styles.promptText}>Camera access is required</Text>
                <Text style={styles.permissionSubtitle}>
                    SiyensyaGo needs your permission to use the camera for discovering objects.
                </Text>
                <TouchableOpacity style={styles.permissionButton} onPress={permission.canAskAgain ? requestPermission : Linking.openSettings}>
                    <Text style={styles.permissionButtonText}>
                        {permission.canAskAgain ? 'Grant Permission' : 'Open Settings'}
                    </Text>
                </TouchableOpacity>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            {/* Enhanced Top Bar */}
            <View style={styles.topBar}>
                <View style={styles.headerContent}>
                    <View style={styles.statusIndicator}>
                        <View style={styles.statusDot} />
                        <Text style={styles.statusText}>READY</Text>
                    </View>
                    <Text style={styles.promptText}>What do you want to discover today?</Text>
                    <View style={styles.discoveryBadge}>
                        <Ionicons name="bookmark" size={16} color={colors.primary} />
                        <Text style={styles.discoveryCount}>{stats.totalDiscoveries}</Text>
                    </View>
                </View>

                {/* Tips Carousel */}
                <View style={styles.tipsContainer}>
                    <Ionicons name="bulb-outline" size={16} color={colors.warning} />
                    <Text style={styles.tipText}>Tip: Hold steady and ensure good lighting</Text>
                </View>
            </View>

            {/* Offline Banner */}
            {!isOnline && (
                <View style={styles.offlineBanner}>
                    <Ionicons name="cloud-offline-outline" size={16} color={colors.warning} />
                    <Text style={styles.offlineText}>Offline - Discoveries will sync when connected</Text>
                </View>
            )}

            <View style={styles.cameraContainer}>
                <View style={styles.controlsTop}>
                    <TouchableOpacity style={styles.controlButton} onPress={toggleCameraFacing}>
                        <Ionicons name="camera-reverse-outline" size={24} color={colors.text} />
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.controlButton, flash === 'on' && styles.controlButtonActive]} onPress={toggleFlash}>
                        <Ionicons name={flash === 'on' ? "flash" : "flash-off"} size={24} color={flash === 'on' ? colors.background : colors.text} />
                    </TouchableOpacity>
                </View>

                {isFocused && <CameraView style={styles.camera} ref={cameraRef} facing={facing} enableTorch={flash === 'on'} />}

                <Animated.View style={[styles.reticle, { shadowColor: reticleGlowColor, shadowOpacity: 1, shadowRadius: 20 }]}>
                    {cornerAnims.map((anim, index) => {
                        const cornerColor = anim.interpolate({
                            inputRange: [0, 1],
                            outputRange: [colors.primary, colors.secondary],
                        });
                        return (
                            <Animated.View
                                key={index}
                                style={[
                                    styles.corner,
                                    index === 0 && styles.topLeft,
                                    index === 1 && styles.topRight,
                                    index === 2 && styles.bottomLeft,
                                    index === 3 && styles.bottomRight,
                                    { borderColor: cornerColor }
                                ]}
                            />
                        );
                    })}
                    <Animated.View style={[styles.scanLine, { top: '50%', transform: [{ translateY: scanLineTranslateY }] }]} />
                    <View style={styles.crosshair}>
                        <View style={styles.crosshairHorizontal} />
                        <View style={styles.crosshairVertical} />
                    </View>
                </Animated.View>
            </View>

            <View style={styles.bottomBar}>
                <View style={styles.quickActions}>
                    <TouchableOpacity style={styles.quickActionButton} onPress={handleGalleryAccess}>
                        <Ionicons name="images-outline" size={24} color={colors.lightGray} />
                        <Text style={styles.quickActionText}>Gallery</Text>
                    </TouchableOpacity>

                    <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
                        <TouchableOpacity style={[styles.scanButton, isScanning && styles.scanButtonDisabled]} onPress={handleScan} disabled={isScanning}>
                            {isScanning ? <ActivityIndicator color={colors.background} /> : <Ionicons name="scan" size={32} color={colors.background} />}
                        </TouchableOpacity>
                    </Animated.View>

                    <TouchableOpacity style={styles.quickActionButton} onPress={() => setShowHelpModal(true)}>
                        <Ionicons name="help-circle-outline" size={24} color={colors.lightGray} />
                        <Text style={styles.quickActionText}>Help</Text>
                    </TouchableOpacity>
                </View>
                <Text style={styles.scanInstruction}>{isScanning ? 'Processing...' : 'Tap to scan and discover'}</Text>
            </View>

            {/* Enhanced Help Modal */}
            <Modal visible={showHelpModal} animationType="slide" transparent={true} onRequestClose={() => setShowHelpModal(false)}>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Scanning Tips</Text>
                            <TouchableOpacity onPress={() => setShowHelpModal(false)}>
                                <Ionicons name="close" size={28} color={colors.lightGray} />
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
                            <View style={styles.tipCard}>
                                <View style={styles.tipIconContainer}>
                                    <Ionicons name="sunny-outline" size={32} color={colors.primary} />
                                </View>
                                <Text style={styles.tipTitle}>Good Lighting</Text>
                                <Text style={styles.tipDescription}>
                                    Ensure your object is well-lit. Natural daylight works best. Avoid shadows and dark areas.
                                </Text>
                            </View>

                            <View style={styles.tipCard}>
                                <View style={styles.tipIconContainer}>
                                    <Ionicons name="hand-left-outline" size={32} color={colors.primary} />
                                </View>
                                <Text style={styles.tipTitle}>Hold Steady</Text>
                                <Text style={styles.tipDescription}>
                                    Keep your phone steady when scanning. Blurry images may affect recognition accuracy.
                                </Text>
                            </View>

                            <View style={styles.tipCard}>
                                <View style={styles.tipIconContainer}>
                                    <Ionicons name="expand-outline" size={32} color={colors.primary} />
                                </View>
                                <Text style={styles.tipTitle}>Frame the Object</Text>
                                <Text style={styles.tipDescription}>
                                    Center the object in the scanning area. Try to fill most of the frame with your subject.
                                </Text>
                            </View>

                            <View style={styles.tipCard}>
                                <View style={styles.tipIconContainer}>
                                    <Ionicons name="eye-outline" size={32} color={colors.primary} />
                                </View>
                                <Text style={styles.tipTitle}>Clear View</Text>
                                <Text style={styles.tipDescription}>
                                    Make sure the object is clearly visible. Remove any obstructions or clutter from view.
                                </Text>
                            </View>

                            <View style={styles.tipCard}>
                                <View style={styles.tipIconContainer}>
                                    <Ionicons name="navigate-outline" size={32} color={colors.primary} />
                                </View>
                                <Text style={styles.tipTitle}>Different Angles</Text>
                                <Text style={styles.tipDescription}>
                                    If recognition fails, try different angles or distances. Some objects scan better from specific views.
                                </Text>
                            </View>
                        </ScrollView>

                        <TouchableOpacity style={styles.modalButton} onPress={() => setShowHelpModal(false)}>
                            <Text style={styles.modalButtonText}>Got it!</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background, justifyContent: 'space-between' },
    permissionContainer: { flex: 1, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center', padding: 30, gap: 20 },
    promptText: { color: colors.text, fontSize: 16, textAlign: 'center', fontFamily: fonts.heading, flex: 1, marginHorizontal: 10 },
    permissionSubtitle: { fontFamily: fonts.body, color: colors.lightGray, textAlign: 'center', fontSize: 16, lineHeight: 24 },
    permissionButton: { backgroundColor: colors.primary, paddingVertical: 15, paddingHorizontal: 30, borderRadius: 30, shadowColor: colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 5 },
    permissionButtonText: { color: colors.background, fontFamily: fonts.heading, fontSize: 16 },
    topBar: { padding: 20, paddingBottom: 15, gap: 12 },
    headerContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    statusIndicator: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(0, 191, 255, 0.1)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(0, 191, 255, 0.3)' },
    statusDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.success },
    statusText: { fontFamily: fonts.heading, fontSize: 10, color: colors.primary, letterSpacing: 1 },
    discoveryBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(0, 191, 255, 0.1)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(0, 191, 255, 0.3)' },
    discoveryCount: { fontFamily: fonts.heading, fontSize: 12, color: colors.primary },
    tipsContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: 'rgba(255, 69, 0, 0.1)', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(255, 69, 0, 0.2)' },
    tipText: { fontFamily: fonts.body, fontSize: 12, color: colors.lightGray },
    cameraContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', marginHorizontal: 20, position: 'relative' },
    controlsTop: { position: 'absolute', top: 10, left: 10, right: 10, flexDirection: 'row', justifyContent: 'space-between', zIndex: 10 },
    controlButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(13, 15, 24, 0.8)', borderWidth: 1, borderColor: 'rgba(0, 191, 255, 0.3)', justifyContent: 'center', alignItems: 'center' },
    controlButtonActive: { backgroundColor: colors.primary },
    camera: { width: '100%', aspectRatio: 1, borderRadius: 20, overflow: 'hidden', justifyContent: 'center', alignItems: 'center' },
    reticle: { position: 'absolute', width: 250, height: 250 },
    corner: { position: 'absolute', width: 40, height: 40, borderWidth: 4 },
    topLeft: { top: 0, left: 0, borderRightWidth: 0, borderBottomWidth: 0 },
    topRight: { top: 0, right: 0, borderLeftWidth: 0, borderBottomWidth: 0 },
    bottomLeft: { bottom: 0, left: 0, borderRightWidth: 0, borderTopWidth: 0 },
    bottomRight: { bottom: 0, right: 0, borderLeftWidth: 0, borderTopWidth: 0 },
    scanLine: { position: 'absolute', left: 0, right: 0, height: 2, backgroundColor: colors.primary, shadowColor: colors.primary, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.8, shadowRadius: 10, elevation: 5 },
    crosshair: { position: 'absolute', top: '50%', left: '50%', width: 30, height: 30, marginLeft: -15, marginTop: -15 },
    crosshairHorizontal: { position: 'absolute', top: '50%', left: 0, right: 0, height: 2, backgroundColor: colors.primary, opacity: 0.6 },
    crosshairVertical: { position: 'absolute', left: '50%', top: 0, bottom: 0, width: 2, backgroundColor: colors.primary, opacity: 0.6 },
    bottomBar: { alignItems: 'center', justifyContent: 'center', gap: 15, paddingBottom: 55 },
    quickActions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', paddingHorizontal: 40, marginTop: 10 },
    quickActionButton: { alignItems: 'center', gap: 4 },
    quickActionText: { fontFamily: fonts.body, fontSize: 11, color: colors.lightGray },
    scanButton: { width: 70, height: 70, borderRadius: 35, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center', borderWidth: 4, borderColor: colors.background, shadowColor: colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.5, shadowRadius: 15, elevation: 8 },
    scanButtonDisabled: { opacity: 0.6 },
    scanInstruction: { fontFamily: fonts.body, fontSize: 13, color: colors.lightGray, textAlign: 'center' },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.8)', justifyContent: 'flex-end' },
    modalContent: { backgroundColor: colors.background, borderTopLeftRadius: 25, borderTopRightRadius: 25, paddingTop: 20, maxHeight: '80%', borderTopWidth: 2, borderColor: colors.primary },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 15, borderBottomWidth: 1, borderBottomColor: 'rgba(0, 191, 255, 0.2)' },
    modalTitle: { fontFamily: fonts.heading, fontSize: 24, color: colors.text },
    modalBody: { padding: 20 },
    tipCard: { backgroundColor: '#1A1C2A', borderRadius: 15, padding: 20, marginBottom: 15, borderWidth: 1, borderColor: 'rgba(0, 191, 255, 0.2)', alignItems: 'center' },
    tipIconContainer: { width: 60, height: 60, borderRadius: 30, backgroundColor: 'rgba(0, 191, 255, 0.1)', justifyContent: 'center', alignItems: 'center', marginBottom: 15 },
    tipTitle: { fontFamily: fonts.heading, fontSize: 18, color: colors.primary, marginBottom: 8 },
    tipDescription: { fontFamily: fonts.body, fontSize: 14, color: colors.lightGray, textAlign: 'center', lineHeight: 22 },
    modalButton: { backgroundColor: colors.primary, marginHorizontal: 20, marginVertical: 20, paddingVertical: 16, borderRadius: 30, alignItems: 'center', shadowColor: colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 5 },
    modalButtonText: { fontFamily: fonts.heading, fontSize: 18, color: colors.background },
    offlineBanner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: 'rgba(255, 69, 0, 0.15)', paddingVertical: 8, paddingHorizontal: 15, marginHorizontal: 20, marginTop: -10, marginBottom: 10, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(255, 69, 0, 0.3)' },
    offlineText: { fontFamily: fonts.body, fontSize: 12, color: colors.warning },
});