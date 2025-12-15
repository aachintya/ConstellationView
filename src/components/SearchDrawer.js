/**
 * SearchDrawer - Modern premium search interface
 * Features: Search-first UI, quick access chips, rich result cards, navigation
 */

import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import {
    View,
    Text,
    Modal,
    TouchableOpacity,
    StyleSheet,
    Dimensions,
    TextInput,
    FlatList,
    Animated,
    Keyboard,
    Platform,
} from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Quick access categories with icons
const QUICK_CATEGORIES = [
    { id: 'stars', label: 'Stars', icon: '⭐' },
    { id: 'planets', label: 'Planets', icon: '🪐' },
    { id: 'constellations', label: 'Constellations', icon: '✦' },
];

// Popular stars for quick access
const POPULAR_STARS = [
    'Sirius', 'Vega', 'Polaris', 'Betelgeuse', 'Rigel',
    'Aldebaran', 'Antares', 'Capella', 'Arcturus', 'Procyon'
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
    const [activeFilter, setActiveFilter] = useState(null);
    const inputRef = useRef(null);
    const fadeAnim = useRef(new Animated.Value(0)).current;

    // Focus search input when drawer opens
    useEffect(() => {
        if (visible) {
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 200,
                useNativeDriver: true,
            }).start();
            setTimeout(() => inputRef.current?.focus(), 300);
        } else {
            fadeAnim.setValue(0);
            setSearchQuery('');
            setActiveFilter(null);
        }
    }, [visible]);

    // Comprehensive search across all objects
    const searchResults = useMemo(() => {
        const query = searchQuery.toLowerCase().trim();
        const results = [];

        // If no query, return empty (show popular instead)
        if (!query && !activeFilter) return [];

        // Search stars
        if (!activeFilter || activeFilter === 'stars') {
            const matchedStars = stars.filter(star => {
                if (!star) return false;
                const name = (star.name || '').toLowerCase();
                const id = (star.id || '').toLowerCase();
                const constellation = (star.constellation || '').toLowerCase();
                return name.includes(query) || id.includes(query) || constellation.includes(query);
            });

            // Sort by magnitude (brightest first) and limit
            matchedStars
                .sort((a, b) => (a.magnitude || 99) - (b.magnitude || 99))
                .slice(0, activeFilter ? 100 : 30)
                .forEach(star => {
                    results.push({
                        ...star,
                        type: 'star',
                        icon: '⭐',
                        subtitle: star.constellation ? `in ${star.constellation}` : (star.spectralType || 'Star'),
                    });
                });
        }

        // Search planets
        if (!activeFilter || activeFilter === 'planets') {
            const matchedPlanets = planets.filter(planet => {
                if (!planet) return false;
                return (planet.name || '').toLowerCase().includes(query);
            });

            matchedPlanets.forEach(planet => {
                results.push({
                    ...planet,
                    type: 'planet',
                    icon: '🪐',
                    subtitle: 'Planet',
                });
            });
        }

        // Search constellations
        if (!activeFilter || activeFilter === 'constellations') {
            const matchedConstellations = constellations.filter(c => {
                if (!c) return false;
                return (c.name || '').toLowerCase().includes(query);
            });

            matchedConstellations.forEach(c => {
                results.push({
                    ...c,
                    type: 'constellation',
                    icon: '✦',
                    subtitle: 'Constellation',
                });
            });
        }

        return results;
    }, [searchQuery, activeFilter, stars, constellations, planets]);

    // Popular stars quick access
    const popularStarsList = useMemo(() => {
        return POPULAR_STARS
            .map(name => stars.find(s => s.name === name))
            .filter(Boolean)
            .map(star => ({
                ...star,
                type: 'star',
                icon: '⭐',
                subtitle: star.constellation ? `in ${star.constellation}` : 'Star',
            }));
    }, [stars]);

    const handleSelectItem = useCallback((item) => {
        Keyboard.dismiss();
        onSelectObject(item);
        onClose();
    }, [onSelectObject, onClose]);

    const handleFilterPress = useCallback((filterId) => {
        setActiveFilter(prev => prev === filterId ? null : filterId);
    }, []);

    const handleClose = useCallback(() => {
        Keyboard.dismiss();
        onClose();
    }, [onClose]);

    // Get accent color for star
    const getStarColor = (item) => {
        if (item.type === 'planet') return '#FFD54F';
        if (!item.spectralType) return '#4FC3F7';
        const type = item.spectralType.charAt(0).toUpperCase();
        const colors = {
            'O': '#9BB0FF', 'B': '#AABFFF', 'A': '#CAD7FF',
            'F': '#F8F7FF', 'G': '#FFF4E8', 'K': '#FFDAB5', 'M': '#FFBD6F'
        };
        return colors[type] || '#4FC3F7';
    };

    // Render search result item
    const renderResultItem = ({ item }) => {
        const accentColor = getStarColor(item);

        return (
            <TouchableOpacity
                style={styles.resultCard}
                onPress={() => handleSelectItem(item)}
                activeOpacity={0.7}
            >
                <View style={[styles.resultIconContainer, { backgroundColor: `${accentColor}15` }]}>
                    <View style={[styles.resultDot, { backgroundColor: accentColor }]} />
                </View>
                <View style={styles.resultInfo}>
                    <Text style={[styles.resultName, { color: accentColor }]} numberOfLines={1}>
                        {item.name || item.id}
                    </Text>
                    <Text style={styles.resultSubtitle} numberOfLines={1}>
                        {item.subtitle}
                    </Text>
                </View>
                {item.magnitude !== undefined && (
                    <Text style={styles.resultMag}>
                        Mag {item.magnitude.toFixed(1)}
                    </Text>
                )}
            </TouchableOpacity>
        );
    };

    // Determine what to show
    const showPopular = !searchQuery && !activeFilter;
    const displayData = showPopular ? popularStarsList : searchResults;

    return (
        <Modal
            visible={visible}
            animationType="slide"
            onRequestClose={handleClose}
            statusBarTranslucent
        >
            <View style={styles.container}>
                {/* Header with search */}
                <Animated.View style={[styles.header, { opacity: fadeAnim }]}>
                    <View style={styles.searchContainer}>
                        <View style={styles.searchInputWrapper}>
                            <Text style={styles.searchIcon}>🔍</Text>
                            <TextInput
                                ref={inputRef}
                                style={styles.searchInput}
                                placeholder="Search stars, planets, constellations..."
                                placeholderTextColor="rgba(255,255,255,0.35)"
                                value={searchQuery}
                                onChangeText={setSearchQuery}
                                autoCapitalize="none"
                                autoCorrect={false}
                                returnKeyType="search"
                            />
                            {searchQuery.length > 0 && (
                                <TouchableOpacity
                                    onPress={() => setSearchQuery('')}
                                    style={styles.clearButton}
                                >
                                    <Text style={styles.clearText}>✕</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                        <TouchableOpacity
                            onPress={handleClose}
                            style={styles.cancelButton}
                        >
                            <Text style={styles.cancelText}>Cancel</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Filter chips */}
                    <View style={styles.filtersRow}>
                        {QUICK_CATEGORIES.map((cat) => (
                            <TouchableOpacity
                                key={cat.id}
                                style={[
                                    styles.filterChip,
                                    activeFilter === cat.id && styles.filterChipActive
                                ]}
                                onPress={() => handleFilterPress(cat.id)}
                                activeOpacity={0.7}
                            >
                                <Text style={styles.filterIcon}>{cat.icon}</Text>
                                <Text style={[
                                    styles.filterLabel,
                                    activeFilter === cat.id && styles.filterLabelActive
                                ]}>
                                    {cat.label}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </Animated.View>

                {/* Results */}
                <View style={styles.resultsContainer}>
                    {showPopular && (
                        <Text style={styles.sectionTitle}>Popular Stars</Text>
                    )}

                    {!showPopular && searchQuery.length > 0 && (
                        <Text style={styles.sectionTitle}>
                            {searchResults.length} result{searchResults.length !== 1 ? 's' : ''}
                        </Text>
                    )}

                    {activeFilter && !searchQuery && (
                        <Text style={styles.sectionTitle}>
                            All {QUICK_CATEGORIES.find(c => c.id === activeFilter)?.label}
                        </Text>
                    )}

                    <FlatList
                        data={displayData}
                        renderItem={renderResultItem}
                        keyExtractor={(item, index) => `${item.id || item.name}-${index}`}
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={styles.listContent}
                        keyboardShouldPersistTaps="handled"
                        ListEmptyComponent={
                            searchQuery.length > 0 ? (
                                <View style={styles.emptyState}>
                                    <Text style={styles.emptyIcon}>🔭</Text>
                                    <Text style={styles.emptyTitle}>No results found</Text>
                                    <Text style={styles.emptySubtitle}>
                                        Try a different search term
                                    </Text>
                                </View>
                            ) : null
                        }
                    />
                </View>

                {/* Tip at bottom */}
                <View style={styles.tipContainer}>
                    <Text style={styles.tipText}>
                        Tap any object to view its details
                    </Text>
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
        paddingTop: Platform.OS === 'ios' ? 56 : 40,
        paddingHorizontal: 16,
        paddingBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.06)',
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    searchInputWrapper: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.08)',
        borderRadius: 12,
        paddingHorizontal: 12,
        height: 48,
    },
    searchIcon: {
        fontSize: 16,
        marginRight: 10,
    },
    searchInput: {
        flex: 1,
        color: '#fff',
        fontSize: 16,
        paddingVertical: 12,
    },
    clearButton: {
        padding: 4,
    },
    clearText: {
        color: 'rgba(255,255,255,0.4)',
        fontSize: 14,
    },
    cancelButton: {
        marginLeft: 12,
        paddingVertical: 8,
    },
    cancelText: {
        color: '#4FC3F7',
        fontSize: 16,
        fontWeight: '500',
    },
    filtersRow: {
        flexDirection: 'row',
        marginTop: 12,
        gap: 8,
    },
    filterChip: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 14,
        paddingVertical: 8,
        backgroundColor: 'rgba(255,255,255,0.06)',
        borderRadius: 20,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
    },
    filterChipActive: {
        backgroundColor: 'rgba(79, 195, 247, 0.15)',
        borderColor: '#4FC3F7',
    },
    filterIcon: {
        fontSize: 14,
        marginRight: 6,
    },
    filterLabel: {
        color: 'rgba(255,255,255,0.6)',
        fontSize: 13,
        fontWeight: '500',
    },
    filterLabelActive: {
        color: '#4FC3F7',
    },
    resultsContainer: {
        flex: 1,
        paddingHorizontal: 16,
    },
    sectionTitle: {
        color: 'rgba(255,255,255,0.4)',
        fontSize: 12,
        fontWeight: '600',
        letterSpacing: 0.8,
        textTransform: 'uppercase',
        marginTop: 16,
        marginBottom: 12,
    },
    listContent: {
        paddingBottom: 100,
    },
    resultCard: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 12,
        backgroundColor: 'rgba(255,255,255,0.03)',
        borderRadius: 12,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.04)',
    },
    resultIconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    resultDot: {
        width: 12,
        height: 12,
        borderRadius: 6,
    },
    resultInfo: {
        flex: 1,
    },
    resultName: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 2,
    },
    resultSubtitle: {
        color: 'rgba(255,255,255,0.4)',
        fontSize: 13,
    },
    resultMag: {
        color: 'rgba(255,255,255,0.35)',
        fontSize: 12,
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 60,
    },
    emptyIcon: {
        fontSize: 48,
        marginBottom: 16,
    },
    emptyTitle: {
        color: 'rgba(255,255,255,0.7)',
        fontSize: 18,
        fontWeight: '600',
        marginBottom: 8,
    },
    emptySubtitle: {
        color: 'rgba(255,255,255,0.4)',
        fontSize: 14,
    },
    tipContainer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        paddingVertical: 16,
        paddingBottom: Platform.OS === 'ios' ? 36 : 20,
        backgroundColor: 'rgba(5,5,8,0.95)',
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.06)',
        alignItems: 'center',
    },
    tipText: {
        color: 'rgba(255,255,255,0.35)',
        fontSize: 12,
    },
});

export default SearchDrawer;
