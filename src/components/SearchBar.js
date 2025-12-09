/**
 * Search Bar Component
 * Allows searching for stars, planets, and constellations
 */

import React, { useState, useCallback } from 'react';
import {
    View,
    TextInput,
    Text,
    StyleSheet,
    TouchableOpacity,
    FlatList,
    Keyboard,
} from 'react-native';

import { spacing, borderRadius } from '../styles/theme';

/**
 * SearchBar Component
 * 
 * @param {Object} props
 * @param {Function} props.onSearch - Search function that returns results
 * @param {Function} props.onSelectResult - Callback when result is selected
 * @param {Object} props.theme - Theme colors
 */
const SearchBar = ({ onSearch, onSelectResult, theme }) => {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [isFocused, setIsFocused] = useState(false);

    const handleSearch = useCallback((text) => {
        setQuery(text);

        if (text.length >= 2 && onSearch) {
            const searchResults = onSearch(text);
            setResults(searchResults);
        } else {
            setResults([]);
        }
    }, [onSearch]);

    const handleSelectResult = useCallback((item) => {
        setQuery('');
        setResults([]);
        setIsFocused(false);
        Keyboard.dismiss();

        if (onSelectResult) {
            onSelectResult(item);
        }
    }, [onSelectResult]);

    const handleClear = useCallback(() => {
        setQuery('');
        setResults([]);
    }, []);

    const getTypeIcon = (type) => {
        switch (type) {
            case 'star':
                return '★';
            case 'planet':
                return '●';
            case 'constellation':
                return '✧';
            default:
                return '•';
        }
    };

    const renderResult = ({ item }) => (
        <TouchableOpacity
            style={[styles.resultItem, { backgroundColor: theme.surfaceLight }]}
            onPress={() => handleSelectResult(item)}
        >
            <Text style={[styles.resultIcon, { color: item.color || theme.accent }]}>
                {item.symbol || getTypeIcon(item.type)}
            </Text>
            <View style={styles.resultTextContainer}>
                <Text style={[styles.resultName, { color: theme.text }]}>
                    {item.name}
                </Text>
                <Text style={[styles.resultType, { color: theme.textMuted }]}>
                    {item.type?.charAt(0).toUpperCase() + item.type?.slice(1)}
                    {item.constellation && ` • ${item.constellation}`}
                </Text>
            </View>
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            {/* Search Input */}
            <View style={[styles.inputContainer, { backgroundColor: theme.surface }]}>
                <Text style={[styles.searchIcon, { color: theme.textSecondary }]}>
                    🔍
                </Text>
                <TextInput
                    style={[styles.input, { color: theme.text }]}
                    placeholder="Search stars, planets, constellations..."
                    placeholderTextColor={theme.textMuted}
                    value={query}
                    onChangeText={handleSearch}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => {
                        // Delay to allow tap on result
                        setTimeout(() => setIsFocused(false), 200);
                    }}
                    returnKeyType="search"
                />
                {query.length > 0 && (
                    <TouchableOpacity onPress={handleClear} style={styles.clearButton}>
                        <Text style={[styles.clearText, { color: theme.textSecondary }]}>
                            ✕
                        </Text>
                    </TouchableOpacity>
                )}
            </View>

            {/* Results Dropdown */}
            {isFocused && results.length > 0 && (
                <View style={[styles.resultsContainer, { backgroundColor: theme.surface }]}>
                    <FlatList
                        data={results}
                        renderItem={renderResult}
                        keyExtractor={(item) => `${item.type}-${item.id || item.name}`}
                        keyboardShouldPersistTaps="handled"
                        style={styles.resultsList}
                    />
                </View>
            )}

            {/* No results message */}
            {isFocused && query.length >= 2 && results.length === 0 && (
                <View style={[styles.noResults, { backgroundColor: theme.surface }]}>
                    <Text style={[styles.noResultsText, { color: theme.textSecondary }]}>
                        No results found for "{query}"
                    </Text>
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        top: 60,
        left: spacing.md,
        right: spacing.md,
        zIndex: 100,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: borderRadius.full,
        paddingHorizontal: spacing.md,
        height: 48,
    },
    searchIcon: {
        fontSize: 16,
        marginRight: spacing.sm,
    },
    input: {
        flex: 1,
        fontSize: 16,
        height: '100%',
    },
    clearButton: {
        padding: spacing.xs,
    },
    clearText: {
        fontSize: 16,
    },
    resultsContainer: {
        marginTop: spacing.xs,
        borderRadius: borderRadius.md,
        maxHeight: 250,
        overflow: 'hidden',
    },
    resultsList: {
        padding: spacing.xs,
    },
    resultItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: spacing.md,
        marginVertical: spacing.xs / 2,
        borderRadius: borderRadius.sm,
    },
    resultIcon: {
        fontSize: 20,
        marginRight: spacing.md,
        width: 24,
        textAlign: 'center',
    },
    resultTextContainer: {
        flex: 1,
    },
    resultName: {
        fontSize: 16,
        fontWeight: '600',
    },
    resultType: {
        fontSize: 12,
        marginTop: 2,
    },
    noResults: {
        marginTop: spacing.xs,
        borderRadius: borderRadius.md,
        padding: spacing.md,
    },
    noResultsText: {
        textAlign: 'center',
        fontSize: 14,
    },
});

export default SearchBar;
