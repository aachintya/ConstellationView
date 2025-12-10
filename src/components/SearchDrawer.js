/**
 * Search Drawer Component
 * Full-screen search panel with categories like SkyView app
 */

import React, { useState, useMemo, useCallback } from 'react';
import {
    View,
    Text,
    Modal,
    TouchableOpacity,
    StyleSheet,
    Dimensions,
    ScrollView,
    TextInput,
    FlatList,
    Image,
} from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Category icons using emoji (can be replaced with custom icons)
const CATEGORIES = [
    { id: 'tonight', name: "Tonight's Sightings", icon: '📅', premium: false },
    { id: 'favorites', name: 'Favorites', icon: '❤️', premium: false },
    { id: 'solar', name: 'Solar System', icon: '🌍', premium: false },
    { id: 'stars', name: 'Stars', icon: '⭐', premium: false },
    { id: 'clusters', name: 'Star Clusters', icon: '✨', premium: true },
    { id: 'constellations', name: 'Constellations', icon: '🌌', premium: false },
    { id: 'satellites', name: 'Brightest Satellites', icon: '🛰️', premium: true },
    { id: 'nebulae', name: 'Nebulae', icon: '🌀', premium: true },
    { id: 'galaxies', name: 'Galaxies', icon: '🌌', premium: true },
    { id: 'galacticClusters', name: 'Galactic Clusters', icon: '💫', premium: true },
    { id: 'messier', name: 'Messier Objects', icon: '🔭', premium: true },
];

const SearchDrawer = ({
    visible,
    onClose,
    stars = [],
    constellations = [],
    planets = [],
    onSelectObject,
    theme,
}) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState(null);

    // Search results
    const searchResults = useMemo(() => {
        if (!searchQuery || searchQuery.length < 2) return [];

        const query = searchQuery.toLowerCase();
        const results = [];

        // Search stars
        stars.forEach(star => {
            if (star.name && star.name.toLowerCase().includes(query)) {
                results.push({ ...star, type: 'star', icon: '⭐' });
            }
        });

        // Search constellations
        constellations.forEach(constellation => {
            if (constellation.name && constellation.name.toLowerCase().includes(query)) {
                results.push({ ...constellation, type: 'constellation', icon: '🌌' });
            }
        });

        // Search planets
        planets.forEach(planet => {
            if (planet.name && planet.name.toLowerCase().includes(query)) {
                results.push({ ...planet, type: 'planet', icon: '🪐' });
            }
        });

        return results.slice(0, 20);
    }, [searchQuery, stars, constellations, planets]);

    // Category items
    const categoryItems = useMemo(() => {
        if (!selectedCategory) return [];

        switch (selectedCategory) {
            case 'stars':
                return stars
                    .filter(s => s.name)
                    .sort((a, b) => a.magnitude - b.magnitude)
                    .slice(0, 100)
                    .map(s => ({ ...s, type: 'star', icon: '⭐' }));

            case 'constellations':
                return constellations
                    .sort((a, b) => a.name.localeCompare(b.name))
                    .map(c => ({ ...c, type: 'constellation', icon: '🌌' }));

            case 'solar':
                return planets.map(p => ({ ...p, type: 'planet', icon: p.symbol || '🪐' }));

            case 'tonight':
                // Show visible planets and bright stars
                const tonight = [];
                planets.forEach(p => {
                    if (p.altitude > 0 || p.visible) {
                        tonight.push({ ...p, type: 'planet', icon: p.symbol || '🪐' });
                    }
                });
                stars.filter(s => s.name && s.magnitude < 2).forEach(s => {
                    tonight.push({ ...s, type: 'star', icon: '⭐' });
                });
                return tonight.sort((a, b) => (a.magnitude || 0) - (b.magnitude || 0));

            default:
                return [];
        }
    }, [selectedCategory, stars, constellations, planets]);

    const handleSelectItem = useCallback((item) => {
        onSelectObject(item);
        onClose();
    }, [onSelectObject, onClose]);

    const handleCategoryPress = useCallback((category) => {
        if (category.premium) {
            // Show premium message
            return;
        }
        setSelectedCategory(category.id);
    }, []);

    const handleBack = useCallback(() => {
        if (selectedCategory) {
            setSelectedCategory(null);
        } else {
            onClose();
        }
    }, [selectedCategory, onClose]);

    const renderCategoryItem = ({ item }) => (
        <TouchableOpacity
            style={styles.categoryItem}
            onPress={() => handleCategoryPress(item)}
            activeOpacity={0.7}
        >
            <Text style={styles.categoryIcon}>{item.icon}</Text>
            <Text style={styles.categoryName}>{item.name}</Text>
            {item.premium && (
                <View style={styles.premiumBadge}>
                    <Text style={styles.premiumText}>PREMIUM</Text>
                </View>
            )}
        </TouchableOpacity>
    );

    const renderObjectItem = ({ item }) => (
        <TouchableOpacity
            style={styles.objectItem}
            onPress={() => handleSelectItem(item)}
            activeOpacity={0.7}
        >
            <Text style={styles.objectIcon}>{item.icon}</Text>
            <View style={styles.objectInfo}>
                <Text style={styles.objectName}>{item.name || item.id}</Text>
                <Text style={styles.objectMeta}>
                    {item.type === 'star' && item.magnitude !== undefined
                        ? `Magnitude ${item.magnitude.toFixed(2)}${item.constellation ? ` • ${item.constellation}` : ''}`
                        : item.type === 'constellation'
                            ? item.latinName || 'Constellation'
                            : item.type === 'planet'
                                ? 'Solar System'
                                : ''
                    }
                </Text>
            </View>
            <Text style={styles.objectArrow}>›</Text>
        </TouchableOpacity>
    );

    const renderSearchResult = ({ item }) => (
        <TouchableOpacity
            style={styles.searchResultItem}
            onPress={() => handleSelectItem(item)}
            activeOpacity={0.7}
        >
            <Text style={styles.searchResultIcon}>{item.icon}</Text>
            <View style={styles.searchResultInfo}>
                <Text style={styles.searchResultName}>{item.name}</Text>
                <Text style={styles.searchResultType}>{item.type}</Text>
            </View>
        </TouchableOpacity>
    );

    return (
        <Modal
            visible={visible}
            animationType="slide"
            onRequestClose={handleBack}
        >
            <View style={styles.container}>
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={handleBack} style={styles.backButton}>
                        <Text style={styles.backArrow}>←</Text>
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>
                        {selectedCategory
                            ? CATEGORIES.find(c => c.id === selectedCategory)?.name || 'Search'
                            : 'Search'
                        }
                    </Text>
                    <View style={styles.headerSpacer} />
                </View>

                {/* Banner */}
                <View style={styles.banner}>
                    <View style={styles.bannerGradient}>
                        <Text style={styles.bannerEmoji}>🌌</Text>
                        <View style={styles.bannerContent}>
                            <Text style={styles.bannerTitle}>Explore the Universe</Text>
                            <Text style={styles.bannerSubtitle}>
                                {stars.length} stars, {constellations.length} constellations
                            </Text>
                        </View>
                    </View>
                </View>

                {/* Content */}
                <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                    {!selectedCategory ? (
                        // Categories list
                        <View style={styles.categoriesList}>
                            {CATEGORIES.map((category) => (
                                <TouchableOpacity
                                    key={category.id}
                                    style={styles.categoryItem}
                                    onPress={() => handleCategoryPress(category)}
                                    activeOpacity={0.7}
                                >
                                    <Text style={styles.categoryIcon}>{category.icon}</Text>
                                    <Text style={styles.categoryName}>{category.name}</Text>
                                    {category.premium ? (
                                        <View style={styles.premiumBadge}>
                                            <Text style={styles.premiumText}>PREMIUM</Text>
                                        </View>
                                    ) : (
                                        <Text style={styles.categoryArrow}>›</Text>
                                    )}
                                </TouchableOpacity>
                            ))}
                        </View>
                    ) : (
                        // Category items list
                        <View style={styles.itemsList}>
                            {categoryItems.length > 0 ? (
                                categoryItems.map((item, index) => (
                                    <TouchableOpacity
                                        key={item.id || index}
                                        style={styles.objectItem}
                                        onPress={() => handleSelectItem(item)}
                                        activeOpacity={0.7}
                                    >
                                        <Text style={styles.objectIcon}>{item.icon}</Text>
                                        <View style={styles.objectInfo}>
                                            <Text style={styles.objectName}>{item.name || item.id}</Text>
                                            <Text style={styles.objectMeta}>
                                                {item.type === 'star' && item.magnitude !== undefined
                                                    ? `Mag ${item.magnitude.toFixed(2)}${item.constellation ? ` • ${item.constellation}` : ''}`
                                                    : item.type === 'constellation'
                                                        ? item.meaning || 'Constellation'
                                                        : item.type === 'planet'
                                                            ? 'Solar System'
                                                            : ''
                                                }
                                            </Text>
                                        </View>
                                        <Text style={styles.objectArrow}>›</Text>
                                    </TouchableOpacity>
                                ))
                            ) : (
                                <Text style={styles.emptyText}>No items available</Text>
                            )}
                        </View>
                    )}
                </ScrollView>

                {/* Search Results Overlay */}
                {searchQuery.length >= 2 && (
                    <View style={styles.searchResultsOverlay}>
                        <ScrollView style={styles.searchResultsList}>
                            {searchResults.length > 0 ? (
                                searchResults.map((item, index) => (
                                    <TouchableOpacity
                                        key={item.id || index}
                                        style={styles.searchResultItem}
                                        onPress={() => handleSelectItem(item)}
                                        activeOpacity={0.7}
                                    >
                                        <Text style={styles.searchResultIcon}>{item.icon}</Text>
                                        <View style={styles.searchResultInfo}>
                                            <Text style={styles.searchResultName}>{item.name}</Text>
                                            <Text style={styles.searchResultType}>{item.type}</Text>
                                        </View>
                                    </TouchableOpacity>
                                ))
                            ) : (
                                <Text style={styles.noResultsText}>No results for "{searchQuery}"</Text>
                            )}
                        </ScrollView>
                    </View>
                )}

                {/* Search Bar */}
                <View style={styles.searchBarContainer}>
                    <View style={styles.searchBar}>
                        <Text style={styles.searchIcon}>🔍</Text>
                        <TextInput
                            style={styles.searchInput}
                            placeholder="Search all objects..."
                            placeholderTextColor="rgba(255,255,255,0.4)"
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                            autoCapitalize="none"
                            autoCorrect={false}
                        />
                        {searchQuery.length > 0 && (
                            <TouchableOpacity onPress={() => setSearchQuery('')}>
                                <Text style={styles.clearButton}>✕</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0a0a14',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingTop: 50,
        paddingHorizontal: 16,
        paddingBottom: 16,
    },
    backButton: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
    },
    backArrow: {
        color: '#fff',
        fontSize: 24,
    },
    headerTitle: {
        flex: 1,
        color: '#fff',
        fontSize: 20,
        fontWeight: '600',
        textAlign: 'center',
    },
    headerSpacer: {
        width: 40,
    },
    banner: {
        marginHorizontal: 16,
        marginBottom: 16,
        borderRadius: 12,
        overflow: 'hidden',
    },
    bannerGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        backgroundColor: 'rgba(138, 43, 226, 0.3)',
        borderWidth: 1,
        borderColor: 'rgba(138, 43, 226, 0.5)',
    },
    bannerEmoji: {
        fontSize: 40,
        marginRight: 12,
    },
    bannerContent: {
        flex: 1,
    },
    bannerTitle: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    bannerSubtitle: {
        color: 'rgba(255,255,255,0.7)',
        fontSize: 12,
        marginTop: 4,
    },
    content: {
        flex: 1,
    },
    categoriesList: {
        paddingHorizontal: 16,
    },
    categoryItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.08)',
    },
    categoryIcon: {
        fontSize: 24,
        width: 40,
    },
    categoryName: {
        flex: 1,
        color: '#fff',
        fontSize: 16,
    },
    categoryArrow: {
        color: 'rgba(255,255,255,0.4)',
        fontSize: 24,
    },
    premiumBadge: {
        backgroundColor: 'rgba(255,255,255,0.1)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 4,
    },
    premiumText: {
        color: 'rgba(255,255,255,0.5)',
        fontSize: 10,
        fontWeight: '600',
    },
    itemsList: {
        paddingHorizontal: 16,
    },
    objectItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.08)',
    },
    objectIcon: {
        fontSize: 24,
        width: 40,
    },
    objectInfo: {
        flex: 1,
    },
    objectName: {
        color: '#fff',
        fontSize: 16,
    },
    objectMeta: {
        color: 'rgba(255,255,255,0.5)',
        fontSize: 12,
        marginTop: 2,
    },
    objectArrow: {
        color: 'rgba(255,255,255,0.4)',
        fontSize: 24,
    },
    emptyText: {
        color: 'rgba(255,255,255,0.5)',
        fontSize: 16,
        textAlign: 'center',
        marginTop: 40,
    },
    searchResultsOverlay: {
        position: 'absolute',
        top: 150,
        left: 0,
        right: 0,
        bottom: 80,
        backgroundColor: '#0a0a14',
    },
    searchResultsList: {
        flex: 1,
        paddingHorizontal: 16,
    },
    searchResultItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.08)',
    },
    searchResultIcon: {
        fontSize: 24,
        width: 40,
    },
    searchResultInfo: {
        flex: 1,
    },
    searchResultName: {
        color: '#fff',
        fontSize: 16,
    },
    searchResultType: {
        color: 'rgba(255,255,255,0.5)',
        fontSize: 12,
        marginTop: 2,
        textTransform: 'capitalize',
    },
    noResultsText: {
        color: 'rgba(255,255,255,0.5)',
        fontSize: 16,
        textAlign: 'center',
        marginTop: 40,
    },
    searchBarContainer: {
        paddingHorizontal: 16,
        paddingVertical: 12,
        paddingBottom: 30,
        backgroundColor: '#0a0a14',
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.1)',
    },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderRadius: 12,
        paddingHorizontal: 12,
        height: 48,
    },
    searchIcon: {
        fontSize: 18,
        marginRight: 10,
    },
    searchInput: {
        flex: 1,
        color: '#fff',
        fontSize: 16,
    },
    clearButton: {
        color: 'rgba(255,255,255,0.5)',
        fontSize: 18,
        padding: 4,
    },
});

export default SearchDrawer;
