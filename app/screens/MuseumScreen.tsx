// In app/screens/MuseumScreen.tsx
import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Image, Dimensions, ActivityIndicator } from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/types';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { colors, fonts } from '../theme/theme';
import { useApp } from '../context/AppContext';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 60) / 2;

// Category filters
const CATEGORIES = [
    { id: 'all', name: 'All', icon: 'grid-outline' },
    { id: 'physics', name: 'Physics', icon: 'nuclear-outline' },
    { id: 'chemistry', name: 'Chemistry', icon: 'flask-outline' },
    { id: 'biology', name: 'Biology', icon: 'leaf-outline' },
    { id: 'technology', name: 'Tech', icon: 'hardware-chip-outline' },
];

export default function MuseumScreen() {
    const { discoveries, syncStatus } = useApp();
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('all');
    const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();

    // Filter discoveries based on search and category
    const filteredDiscoveries = discoveries.filter((item) => {
        const matchesSearch = item.objectName.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCategory = selectedCategory === 'all' || item.category.toLowerCase() === selectedCategory;
        return matchesSearch && matchesCategory;
    });

    const discoveryCount = discoveries.length;

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <View style={styles.headerTop}>
                    <View>
                        <Text style={styles.title}>My STEM Museum</Text>
                        <Text style={styles.subtitle}>
                            {discoveryCount} {discoveryCount === 1 ? 'discovery' : 'discoveries'}
                        </Text>
                    </View>
                    <TouchableOpacity style={styles.statsButton}>
                        <Ionicons name="stats-chart-outline" size={24} color={colors.primary} />
                    </TouchableOpacity>
                </View>

                {/* Search Bar */}
                <View style={styles.searchContainer}>
                    <Ionicons name="search-outline" size={20} color={colors.lightGray} style={styles.searchIcon} />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search discoveries..."
                        placeholderTextColor={colors.lightGray}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                    />
                    {searchQuery.length > 0 && (
                        <TouchableOpacity onPress={() => setSearchQuery('')}>
                            <Ionicons name="close-circle" size={20} color={colors.lightGray} />
                        </TouchableOpacity>
                    )}
                </View>

                {/* Category Filters */}
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.categoriesContainer}
                >
                    {CATEGORIES.map((category) => (
                        <TouchableOpacity
                            key={category.id}
                            style={[
                                styles.categoryChip,
                                selectedCategory === category.id && styles.categoryChipActive
                            ]}
                            onPress={() => setSelectedCategory(category.id)}
                        >
                            <Ionicons
                                name={category.icon as any}
                                size={18}
                                color={selectedCategory === category.id ? colors.background : colors.primary}
                            />
                            <Text style={[
                                styles.categoryText,
                                selectedCategory === category.id && styles.categoryTextActive
                            ]}>
                                {category.name}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
                {syncStatus && (
                    <View style={styles.syncIndicator}>
                        <ActivityIndicator size="small" color={colors.primary} />
                        <Text style={styles.syncText}>{syncStatus}</Text>
                    </View>
                )}
            </View>

            {/* Content Area */}
            {discoveryCount === 0 ? (
                // Empty State
                <View style={styles.emptyState} pointerEvents="box-none">
                    <Text style={styles.emptyTitle}>Your Museum is Empty</Text>
                    <Text style={styles.emptySubtitle}>
                        Start scanning objects to build your personal STEM collection!
                    </Text>
                    <View style={styles.emptyFeatures}>
                        <View style={styles.featureItem}>
                            <Ionicons name="checkmark-circle" size={20} color={colors.success} />
                            <Text style={styles.featureText}>Save your discoveries</Text>
                        </View>
                        <View style={styles.featureItem}>
                            <Ionicons name="checkmark-circle" size={20} color={colors.success} />
                            <Text style={styles.featureText}>Review anytime, anywhere</Text>
                        </View>
                        <View style={styles.featureItem}>
                            <Ionicons name="checkmark-circle" size={20} color={colors.success} />
                            <Text style={styles.featureText}>Track your learning journey</Text>
                        </View>
                    </View>
                    <TouchableOpacity
                        style={styles.startScanningButton}
                        onPress={() => navigation.navigate('Camera' as never)}
                    >
                        <Ionicons name="camera-outline" size={24} color={colors.background} />
                        <Text style={styles.startScanningText}>Start Scanning</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                // Discovery Grid
                <ScrollView
                    style={styles.scrollView}
                    contentContainerStyle={styles.gridContainer}
                    showsVerticalScrollIndicator={false}
                >
                    {filteredDiscoveries.map((item) => (
                        <TouchableOpacity
                            key={item.id}
                            style={styles.discoveryCard}
                            onPress={() => navigation.navigate('LearningContent', {
                                imageUri: item.imageUri,
                                result: {
                                    objectName: item.objectName,
                                    confidence: item.confidence,
                                    category: item.category,
                                    funFact: item.funFact,
                                    the_science_in_action: item.the_science_in_action,
                                    why_it_matters_to_you: item.why_it_matters_to_you,
                                    tryThis: item.tryThis,
                                    explore_further: item.explore_further,
                                },
                                discoveryId: item.id,
                            })}
                        >
                            <Image source={{ uri: item.imageUri }} style={styles.cardImage} />
                            <View style={styles.cardContent}>
                                <Text style={styles.cardTitle} numberOfLines={2}>
                                    {item.objectName}
                                </Text>
                                <View style={styles.cardFooter}>
                                    <View style={[styles.categoryBadge, { backgroundColor: 'rgba(0, 191, 255, 0.2)' }]}>
                                        <Text style={[styles.categoryBadgeText, { color: colors.primary }]}>
                                            {item.category.charAt(0).toUpperCase() + item.category.slice(1)}
                                        </Text>
                                    </View>
                                    <Text style={styles.cardDate}>{item.dateSaved}</Text>
                                </View>
                            </View>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    header: {
        paddingHorizontal: 20,
        paddingTop: 20,
        paddingBottom: 15,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0, 191, 255, 0.1)',
    },
    headerTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 20,
    },
    title: {
        fontFamily: fonts.heading,
        fontSize: 25,
        color: colors.text,
    },
    subtitle: {
        fontFamily: fonts.body,
        fontSize: 14,
        color: colors.lightGray,
        marginTop: 4,
    },
    statsButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#1A1C2A',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(0, 191, 255, 0.3)',
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#1A1C2A',
        borderRadius: 12,
        paddingHorizontal: 15,
        paddingVertical: 12,
        marginBottom: 15,
        borderWidth: 1,
        borderColor: 'rgba(0, 191, 255, 0.2)',
    },
    searchIcon: {
        marginRight: 10,
    },
    searchInput: {
        flex: 1,
        fontFamily: fonts.body,
        fontSize: 16,
        color: colors.text,
    },
    categoriesContainer: {
        flexDirection: 'row',
        gap: 10,
    },
    categoryChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 20,
        backgroundColor: '#1A1C2A',
        borderWidth: 1,
        borderColor: 'rgba(0, 191, 255, 0.3)',
    },
    categoryChipActive: {
        backgroundColor: colors.primary,
        borderColor: colors.primary,
    },
    categoryText: {
        fontFamily: fonts.heading,
        fontSize: 13,
        color: colors.primary,
    },
    categoryTextActive: {
        color: colors.background,
    },
    emptyState: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 40,
    },
    emptyIconContainer: {
        width: 140,
        height: 140,
        borderRadius: 70,
        backgroundColor: 'rgba(0, 191, 255, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 30,
    },
    emptyTitle: {
        fontFamily: fonts.heading,
        fontSize: 24,
        color: colors.text,
        marginBottom: 10,
        textAlign: 'center',
    },
    emptySubtitle: {
        fontFamily: fonts.body,
        fontSize: 16,
        color: colors.lightGray,
        textAlign: 'center',
        lineHeight: 24,
        marginBottom: 30,
    },
    emptyFeatures: {
        gap: 15,
        marginBottom: 40,
        width: '100%',
    },
    featureItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    featureText: {
        fontFamily: fonts.body,
        fontSize: 15,
        color: colors.text,
    },
    startScanningButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        backgroundColor: colors.primary,
        paddingVertical: 16,
        paddingHorizontal: 32,
        borderRadius: 30,
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 5,
    },
    startScanningText: {
        fontFamily: fonts.heading,
        fontSize: 16,
        color: colors.background,
    },
    scrollView: {
        flex: 1,
    },
    gridContainer: {
        padding: 20,
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 15,
    },
    discoveryCard: {
        width: CARD_WIDTH,
        backgroundColor: '#1A1C2A',
        borderRadius: 15,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(0, 191, 255, 0.15)',
    },
    cardImage: {
        width: '100%',
        height: 140,
        backgroundColor: '#0D0F18',
    },
    cardContent: {
        padding: 12,
    },
    cardTitle: {
        fontFamily: fonts.heading,
        fontSize: 15,
        color: colors.text,
        marginBottom: 8,
        minHeight: 40,
    },
    cardFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 4,
    },
    categoryBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
    },
    categoryBadgeText: {
        fontFamily: fonts.heading,
        fontSize: 10,
    },
    cardDate: {
        fontFamily: fonts.body,
        fontSize: 11,
        color: colors.lightGray,
    },
    syncIndicator: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: 'rgba(0, 191, 255, 0.1)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
        marginTop: 10,
    },
    syncText: {
        fontFamily: fonts.body,
        fontSize: 12,
        color: colors.primary,
    },
});