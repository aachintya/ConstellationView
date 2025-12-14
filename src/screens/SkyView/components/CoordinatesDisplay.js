/**
 * CoordinatesDisplay - RA/Dec coordinates overlay
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { formatRA, formatDec } from '../hooks/useNavigation';

const CoordinatesDisplay = ({ visible, targetObject }) => {
    if (!visible || !targetObject) return null;

    return (
        <View style={styles.container}>
            <Text style={styles.label}>RA:</Text>
            <Text style={styles.value}>{formatRA(targetObject.ra)}</Text>
            <Text style={styles.label}>  DEC:</Text>
            <Text style={styles.value}>{formatDec(targetObject.dec)}</Text>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        top: '45%',
        alignSelf: 'center',
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.7)',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 8,
    },
    label: {
        color: 'rgba(255,255,255,0.6)',
        fontSize: 14,
    },
    value: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '600',
    },
});

export default CoordinatesDisplay;
