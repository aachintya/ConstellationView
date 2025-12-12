/**
 * Search Drawer Component - Minimalist Design
 * Clean, professional full-screen search panel
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
} from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Category list - no premium restrictions
const CATEGORIES = [
    { id: 'tonight', name: "Tonight's Sightings", icon: '📅' },
    { id: 'favorites', name: 'Favorites', icon: '❤️' },
    { id: 'solar', name: 'Solar System', icon: '🌍' },
    { id: 'stars', name: 'Stars', icon: '⭐' },
    { id: 'constellations', name: 'Constellations', icon: '✦' },
    { id: 'clusters', name: 'Star Clusters', icon: '✨' },
    { id: 'satellites', name: 'Satellites', icon: '🛰️' },
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

        stars.forEach(star => {
            if (star.name && star.name.toLowerCase().includes(query)) {
                results.push({ ...star, type: 'star', icon: '⭐' });
            }
        });

        constellations.forEach(constellation => {
            if (constellation.name && constellation.name.toLowerCase().includes(query)) {
                results.push({ ...constellation, type: 'constellation', icon: '✦' });
            }
        });

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
                    .filter(c => c && c.name)
                    .sort((a, b) => (a.name || '').localeCompare(b.name || ''))
                    .map(c => ({ ...c, type: 'constellation', icon: '✦' }));

            case 'solar':
                return planets.map(p => ({ ...p, type: 'planet', icon: '🪐' }));

            case 'tonight':
                const tonight = [];
                planets.forEach(p => {
                    if (p.altitude > 0 || p.visible) {
                        tonight.push({ ...p, type: 'planet', icon: '🪐' });
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
        setSelectedCategory(category.id);
    }, []);

    const handleBack = useCallback(() => {
        if (selectedCategory) {
            setSelectedCategory(null);
        } else {
            onClose();
        }
    }, [selectedCategory, onClose]);

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
                                    <Text style={styles.categoryArrow}>›</Text>
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
                                                    ? `Mag ${item.magnitude.toFixed(2)}`
                                                    : item.type === 'constellation'
                                                        ? 'Constellation'
                                                        : item.type === 'planet'
                                                            ? 'Planet'
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
                        <View style={styles.searchIconContainer}>
                            <View style={styles.searchCircle} />
                            <View style={styles.searchHandle} />
                        </View>
                        <TextInput
                            style={styles.searchInput}
                            placeholder="Search all objects..."
                            placeholderTextColor="rgba(255,255,255,0.35)"
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
        backgroundColor: '#050508',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingTop: 40,
        paddingHorizontal: 16,
        paddingBottom: 20,
    },
    backButton: {
        width: 44,
        height: 44,
        justifyContent: 'center',
        alignItems: 'center',
    },
    backArrow: {
        color: '#fff',
        fontSize: 24,
        fontWeight: '300',
    },
    headerTitle: {
        flex: 1,
        color: '#fff',
        fontSize: 18,
        fontWeight: '500',
        textAlign: 'center',
    },
    headerSpacer: {
        width: 44,
    },
    content: {
        flex: 1,
    },
    categoriesList: {
        paddingHorizontal: 20,
    },
    categoryItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.06)',
    },
    categoryIcon: {
        fontSize: 20,
        width: 36,
    },
    categoryName: {
        flex: 1,
        color: '#fff',
        fontSize: 15,
        fontWeight: '400',
    },
    categoryArrow: {
        color: 'rgba(255,255,255,0.3)',
        fontSize: 22,
        fontWeight: '300',
    },
    itemsList: {
        paddingHorizontal: 20,
    },
    objectItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.06)',
    },
    objectIcon: {
        fontSize: 18,
        width: 36,
    },
    objectInfo: {
        flex: 1,
    },
    objectName: {
        color: '#fff',
        fontSize: 15,
        fontWeight: '400',
    },
    objectMeta: {
        color: 'rgba(255,255,255,0.4)',
        fontSize: 12,
        marginTop: 2,
    },
    objectArrow: {
        color: 'rgba(255,255,255,0.3)',
        fontSize: 22,
        fontWeight: '300',
    },
    emptyText: {
        color: 'rgba(255,255,255,0.4)',
        fontSize: 15,
        textAlign: 'center',
        marginTop: 60,
    },
    searchResultsOverlay: {
        position: 'absolute',
        top: 120,
        left: 0,
        right: 0,
        bottom: 90,
        backgroundColor: '#050508',
    },
    searchResultsList: {
        flex: 1,
        paddingHorizontal: 20,
    },
    searchResultItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.06)',
    },
    searchResultIcon: {
        fontSize: 18,
        width: 36,
    },
    searchResultInfo: {
        flex: 1,
    },
    searchResultName: {
        color: '#fff',
        fontSize: 15,
        fontWeight: '400',
    },
    searchResultType: {
        color: 'rgba(255,255,255,0.4)',
        fontSize: 12,
        marginTop: 2,
        textTransform: 'capitalize',
    },
    noResultsText: {
        color: 'rgba(255,255,255,0.4)',
        fontSize: 15,
        textAlign: 'center',
        marginTop: 60,
    },
    searchBarContainer: {
        paddingHorizontal: 20,
        paddingVertical: 12,
        paddingBottom: 20,
        backgroundColor: '#050508',
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.06)',
    },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.08)',
        borderRadius: 10,
        paddingHorizontal: 14,
        height: 44,
    },
    searchIconContainer: {
        width: 18,
        height: 18,
        marginRight: 12,
        position: 'relative',
    },
    searchCircle: {
        width: 12,
        height: 12,
        borderRadius: 6,
        borderWidth: 1.5,
        borderColor: 'rgba(255,255,255,0.5)',
        position: 'absolute',
        top: 0,
        left: 0,
    },
    searchHandle: {
        width: 6,
        height: 1.5,
        backgroundColor: 'rgba(255,255,255,0.5)',
        position: 'absolute',
        bottom: 2,
        right: 0,
        transform: [{ rotate: '45deg' }],
    },
    searchInput: {
        flex: 1,
        color: '#fff',
        fontSize: 15,
    },
    clearButton: {
        color: 'rgba(255,255,255,0.4)',
        fontSize: 16,
        padding: 4,
    },
});

export default SearchDrawer;
