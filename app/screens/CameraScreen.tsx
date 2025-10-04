// In app/screens/CameraScreen.tsx
import React, { useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/types';
import { colors, fonts } from '../theme/theme';

type CameraNavigationProp = StackNavigationProp<RootStackParamList, 'MainTabs'>;

export default function CameraScreen() {
    // This hook now correctly handles everything related to permissions for us.
    const [permission, requestPermission] = useCameraPermissions();
    const cameraRef = useRef<CameraView>(null);
    const navigation = useNavigation<CameraNavigationProp>();
    const isFocused = useIsFocused();

    // NOTE: The complex useEffect with AppState has been removed as the hook handles it.

    const handleScan = async () => {
        if (cameraRef.current) {
            try {
                const photo = await cameraRef.current.takePictureAsync({ quality: 0.7 });
                if (photo) {
                    navigation.navigate('ObjectRecognition', { imageUri: photo.uri });
                }
            } catch (error) {
                console.error("Failed to take picture:", error);
            }
        }
    };

    if (!permission) {
        return (
            <View style={styles.container}>
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        );
    }

    if (!permission.granted) {
        return (
            <SafeAreaView style={styles.permissionContainer}>
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
        <View style={styles.container}>
            {isFocused && (
                <CameraView style={StyleSheet.absoluteFill} ref={cameraRef} facing="back" />
            )}

            <SafeAreaView style={styles.overlay}>
                <View style={styles.topBar}>
                    <Text style={styles.promptText}>What do you want to discover today?</Text>
                </View>

                <View style={styles.middleContainer}>
                    <View style={styles.reticle}>
                        <View style={[styles.corner, styles.topLeft]} />
                        <View style={[styles.corner, styles.topRight]} />
                        <View style={[styles.corner, styles.bottomLeft]} />
                        <View style={[styles.corner, styles.bottomRight]} />
                    </View>
                </View>
            </SafeAreaView>
        </View>
    );
}

// Styles remain the same
const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
        justifyContent: 'center',
        alignItems: 'center'
    },
    permissionContainer: {
        flex: 1,
        backgroundColor: colors.background,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 30,
        gap: 20,
    },
    permissionSubtitle: {
        fontFamily: fonts.body,
        color: colors.lightGray,
        textAlign: 'center',
        fontSize: 16,
        lineHeight: 24,
    },
    permissionButton: {
        backgroundColor: colors.primary,
        paddingVertical: 15,
        paddingHorizontal: 30,
        borderRadius: 30,
    },
    permissionButtonText: {
        color: colors.background,
        fontFamily: fonts.heading,
        fontSize: 16,
    },
    overlay: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'space-between',
    },
    topBar: {
        padding: 20,
        paddingTop: 60,
        alignItems: 'center',
        backgroundColor: 'rgba(13, 15, 24, 0.5)',
    },
    promptText: {
        color: colors.text,
        fontSize: 22,
        textAlign: 'center',
        fontFamily: fonts.heading,
    },
    middleContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    reticle: {
        width: 250,
        height: 250,
    },
    corner: {
        position: 'absolute',
        width: 40,
        height: 40,
        borderColor: colors.primary,
        borderWidth: 3,
    },
    topLeft: { top: 0, left: 0, borderRightWidth: 0, borderBottomWidth: 0 },
    topRight: { top: 0, right: 0, borderLeftWidth: 0, borderBottomWidth: 0 },
    bottomLeft: { bottom: 0, left: 0, borderRightWidth: 0, borderTopWidth: 0 },
    bottomRight: { bottom: 0, right: 0, borderLeftWidth: 0, borderTopWidth: 0 },
});