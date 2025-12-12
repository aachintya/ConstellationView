/**
 * Wheel Column - Reusable wheel picker column
 * iOS-style scrollable picker with snap-to-item behavior
 */

import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';

export const ITEM_HEIGHT = 44;
export const VISIBLE_ITEMS = 3;

const WheelColumn = ({ data, selectedIndex, onSelect, width = 80, formatItem, textColor = '#fff' }) => {
    const scrollRef = useRef(null);
    const [currentIndex, setCurrentIndex] = useState(selectedIndex);

    useEffect(() => {
        if (scrollRef.current && selectedIndex !== currentIndex) {
            scrollRef.current.scrollTo({ y: selectedIndex * ITEM_HEIGHT, animated: true });
            setCurrentIndex(selectedIndex);
        }
    }, [selectedIndex]);

    const handleMomentumEnd = (event) => {
        const y = event.nativeEvent.contentOffset.y;
        const index = Math.round(y / ITEM_HEIGHT);
        const clampedIndex = Math.max(0, Math.min(data.length - 1, index));
        scrollRef.current?.scrollTo({ y: clampedIndex * ITEM_HEIGHT, animated: true });
        if (clampedIndex !== currentIndex) {
            setCurrentIndex(clampedIndex);
            onSelect(clampedIndex, data[clampedIndex]);
        }
    };

    return (
        <View style={[styles.column, { width }]}>
            <ScrollView
                ref={scrollRef}
                showsVerticalScrollIndicator={false}
                snapToInterval={ITEM_HEIGHT}
                decelerationRate="fast"
                onMomentumScrollEnd={handleMomentumEnd}
                contentContainerStyle={{ paddingVertical: ITEM_HEIGHT }}
            >
                {data.map((item, index) => {
                    const isSelected = index === currentIndex;
                    return (
                        <TouchableOpacity
                            key={index}
                            style={styles.item}
                            onPress={() => {
                                scrollRef.current?.scrollTo({ y: index * ITEM_HEIGHT, animated: true });
                                setCurrentIndex(index);
                                onSelect(index, data[index]);
                            }}
                        >
                            <Text style={[
                                styles.itemText,
                                { color: textColor },
                                isSelected && styles.itemTextSelected,
                                !isSelected && { opacity: 0.3 },
                            ]}>
                                {formatItem ? formatItem(item) : item}
                            </Text>
                        </TouchableOpacity>
                    );
                })}
            </ScrollView>
            <View style={styles.selectionIndicator} pointerEvents="none">
                <View style={styles.selectionLine} />
                <View style={[styles.selectionLine, { bottom: 0, top: undefined }]} />
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    column: { height: ITEM_HEIGHT * VISIBLE_ITEMS, overflow: 'hidden' },
    item: { height: ITEM_HEIGHT, justifyContent: 'center', alignItems: 'center' },
    itemText: { fontSize: 20, fontWeight: '400' },
    itemTextSelected: { fontSize: 24, fontWeight: '500' },
    selectionIndicator: { position: 'absolute', top: ITEM_HEIGHT, left: 0, right: 0, height: ITEM_HEIGHT, pointerEvents: 'none' },
    selectionLine: { position: 'absolute', left: 4, right: 4, height: 1, backgroundColor: 'rgba(255,255,255,0.15)', top: 0 },
});

export default WheelColumn;
