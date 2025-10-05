// In app/screens/LearningContentScreen.tsx
import React from 'react';
import { View, Text, StyleSheet, Image, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RouteProp, useRoute, useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList } from '../navigation/types';
import { colors, fonts } from '../theme/theme';

type LearningContentRouteProp = RouteProp<RootStackParamList, 'LearningContent'>;
type NavigationProp = StackNavigationProp<RootStackParamList>;

// A reusable component for our new content sections
const InfoSection = ({ icon, title, content }: { icon: any; title: string; content: string }) => (
    <View style={styles.section}>
        <View style={styles.sectionHeader}>
            <Ionicons name={icon} size={22} color={colors.primary} />
            <Text style={styles.sectionTitle}>{title}</Text>
        </View>
        <Text style={styles.sectionContent}>{content}</Text>
    </View>
);

export default function LearningContentScreen() {
    const route = useRoute<LearningContentRouteProp>();
    const navigation = useNavigation<NavigationProp>();
    const { imageUri, result } = route.params;

    const handleScanAnother = () => navigation.navigate('MainTabs', { screen: 'Camera' });
    const handleAddToMuseum = () => alert(`Adding "${result.objectName}" to your Museum!`);

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollContent}>
                <Image source={{ uri: imageUri }} style={styles.image} />

                <View style={styles.header}>
                    <Text style={styles.objectName}>{result.objectName}</Text>
                    <Text style={styles.concept}>AI Confidence: {result.confidence}%</Text>
                </View>

                <InfoSection icon="flask-outline" title="The Science in Action" content={result.the_science_in_action} />
                <InfoSection icon="earth-outline" title="Why It Matters to You" content={result.why_it_matters_to_you} />
                <InfoSection icon="bulb-outline" title="Alam mo ba? (Fun Fact)" content={result.funFact} />
                <InfoSection icon="construct-outline" title="Subukan mo ito! (Try This)" content={result.tryThis} />
                <InfoSection icon="help-circle-outline" title="Explore Further" content={result.explore_further} />

            </ScrollView>

            <View style={styles.buttonContainer}>
                <TouchableOpacity style={styles.button} onPress={handleAddToMuseum}>
                    <Ionicons name="add-circle-outline" size={24} color={colors.primary} />
                    <Text style={styles.buttonText}>Add to Museum</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.button} onPress={handleScanAnother}>
                    <Ionicons name="camera-outline" size={24} color={colors.primary} />
                    <Text style={styles.buttonText}>Scan Another</Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    scrollContent: { padding: 20, paddingBottom: 120 },
    image: { width: '100%', aspectRatio: 1.2, borderRadius: 15, marginBottom: 20 },
    header: { marginBottom: 20 },
    objectName: { fontFamily: fonts.heading, color: colors.text, fontSize: 36, marginBottom: 5 },
    concept: { fontFamily: fonts.body, color: colors.lightGray, fontSize: 16, fontStyle: 'italic' },
    section: {
        backgroundColor: '#1A1C2A',
        borderRadius: 10,
        padding: 15,
        marginBottom: 15,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginBottom: 10,
    },
    sectionTitle: {
        fontFamily: fonts.heading,
        color: colors.primary,
        fontSize: 18,
    },
    sectionContent: {
        fontFamily: fonts.body,
        color: colors.text,
        fontSize: 15,
        lineHeight: 24,
    },
    buttonContainer: {
        position: 'absolute', bottom: 0, left: 0, right: 0,
        flexDirection: 'row', justifyContent: 'space-around',
        paddingVertical: 15, paddingBottom: 30,
        backgroundColor: '#1A1C2A', // Slightly different for depth
        borderTopColor: 'rgba(0, 191, 255, 0.2)',
        borderTopWidth: 1,
    },
    button: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10 },
    buttonText: { fontFamily: fonts.heading, color: colors.primary, fontSize: 16 },
});