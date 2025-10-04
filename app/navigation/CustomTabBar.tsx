// In app/navigation/CustomTabBar.tsx
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts } from '../theme/theme';

export default function CustomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
    const insets = useSafeAreaInsets();

    return (
        <View style={styles.container}>
            {/* This is the main tab bar container, which will sit behind the camera button */}
            <View style={[styles.tabBar, { paddingBottom: insets.bottom, height: 65 + insets.bottom }]}>
                {state.routes.map((route, index) => {
                    const { options } = descriptors[route.key];
                    const label = options.tabBarLabel !== undefined ? String(options.tabBarLabel) : route.name;
                    const isFocused = state.index === index;

                    const onPress = () => {
                        const event = navigation.emit({
                            type: 'tabPress',
                            target: route.key,
                            canPreventDefault: true,
                        });

                        if (!isFocused && !event.defaultPrevented) {
                            navigation.navigate(route.name);
                        }
                    };

                    // For the center "Camera" tab, we render an empty space to make room for our custom button.
                    if (route.name === 'Camera') {
                        return <View key={index} style={styles.tabItem} />;
                    }

                    const iconName = route.name === 'Museum' ? 'library-outline' : 'person-outline';
                    const iconColor = isFocused ? colors.primary : colors.lightGray;

                    return (
                        <TouchableOpacity
                            key={index}
                            accessibilityRole="button"
                            accessibilityState={isFocused ? { selected: true } : {}}
                            onPress={onPress}
                            style={styles.tabItem}
                        >
                            <Ionicons name={iconName as any} size={24} color={iconColor} />
                            <Text style={{ color: iconColor, fontFamily: fonts.heading, fontSize: 10, marginTop: 4 }}>
                                {label}
                            </Text>
                        </TouchableOpacity>
                    );
                })}
            </View>

            {/* This is our custom camera button, positioned absolutely in the center */}
            <TouchableOpacity
                style={[styles.cameraButton, { bottom: insets.bottom + 20 }]}
                onPress={() => navigation.navigate('Camera')}
            >
                <Ionicons name="scan-outline" size={32} color={colors.background} />
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        alignItems: 'center',
    },
    tabBar: {
        flexDirection: 'row',
        width: '100%',
        backgroundColor: colors.background,
        borderTopColor: 'rgba(0, 191, 255, 0.2)',
        borderTopWidth: 1,
    },
    tabItem: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    cameraButton: {
        position: 'absolute',
        width: 65,
        height: 65,
        borderRadius: 32.5,
        backgroundColor: colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 10,
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.8,
        shadowRadius: 10,
        elevation: 10,
    },
});