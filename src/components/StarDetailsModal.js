/**
 * Star Details Modal
 * Shows detailed information about a selected star/planet
 */

import React, { Fragment } from 'react';
import {
    View,
    Text,
    Modal,
    TouchableOpacity,
    StyleSheet,
    Dimensions,
    ScrollView,
} from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const StarDetailsModal = ({ visible, object, onClose, theme }) => {
    if (!object) return null;

    const isstar = object.type === 'star' || !object.type;
    const isPlanet = object.type === 'planet';

    // Get spectral class description
    const getSpectralDescription = (spectralType) => {
        if (!spectralType) return 'Unknown type';
        const firstLetter = spectralType.charAt(0).toUpperCase();
        const descriptions = {
            'O': 'Blue supergiant - Extremely hot (>30,000K)',
            'B': 'Blue-white giant - Very hot (10,000-30,000K)',
            'A': 'White star - Hot (7,500-10,000K)',
            'F': 'Yellow-white star - Warm (6,000-7,500K)',
            'G': 'Yellow star (like our Sun) - (5,200-6,000K)',
            'K': 'Orange star - Cool (3,700-5,200K)',
            'M': 'Red dwarf/giant - Cold (<3,700K)',
        };
        return descriptions[firstLetter] || `Spectral class ${firstLetter}`;
    };

    // Get luminosity class description
    const getLuminosityClass = (spectralType) => {
        if (!spectralType) return '';
        const match = spectralType.match(/I{1,3}|IV|V|VI/);
        if (!match) return '';
        const classes = {
            'Ia': 'Luminous Supergiant',
            'Ib': 'Less Luminous Supergiant',
            'II': 'Bright Giant',
            'III': 'Giant',
            'IV': 'Subgiant',
            'V': 'Main Sequence (Dwarf)',
            'VI': 'Subdwarf',
        };
        return classes[match[0]] || '';
    };

    // Format distance
    const formatDistance = (distance, isPlanet) => {
        if (!distance) return 'Unknown';
        if (isPlanet) {
            if (distance < 0.01) return `${(distance * 149597870.7).toFixed(0)} km`;
            return `${distance.toFixed(3)} AU`;
        }
        if (distance < 100) return `${distance.toFixed(1)} light-years`;
        if (distance < 1000) return `${distance.toFixed(0)} light-years`;
        return `${(distance / 1000).toFixed(1)}k light-years`;
    };

    // Get magnitude description
    const getMagnitudeDescription = (mag) => {
        if (mag === undefined || mag === null) return '';
        if (mag < -4) return 'Extremely bright';
        if (mag < -1) return 'Very bright';
        if (mag < 1) return 'Bright star';
        if (mag < 3) return 'Easily visible';
        if (mag < 6) return 'Visible to naked eye';
        return 'Requires telescope';
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="slide"
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                <View style={styles.modalContainer}>
                    {/* Header */}
                    <View style={styles.header}>
                        <View style={styles.headerLeft}>
                            <Text style={styles.starSymbol}>
                                {isPlanet ? object.symbol || '🪐' : '⭐'}
                            </Text>
                            <View>
                                <Text style={[styles.starName, { color: theme?.accent || '#4fc3f7' }]}>
                                    {object.name || object.id}
                                </Text>
                                {object.constellation && (
                                    <Text style={styles.constellation}>
                                        in {object.constellation}
                                    </Text>
                                )}
                            </View>
                        </View>
                        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                            <Text style={styles.closeText}>✕</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Content */}
                    <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                        {/* Quick Stats */}
                        <View style={styles.statsRow}>
                            {object.magnitude !== undefined && (
                                <View style={styles.statBox}>
                                    <Text style={styles.statValue}>{object.magnitude.toFixed(2)}</Text>
                                    <Text style={styles.statLabel}>Magnitude</Text>
                                </View>
                            )}
                            {object.distance && (
                                <View style={styles.statBox}>
                                    <Text style={styles.statValue}>{formatDistance(object.distance, isPlanet)}</Text>
                                    <Text style={styles.statLabel}>Distance</Text>
                                </View>
                            )}
                            {object.spectralType && (
                                <View style={styles.statBox}>
                                    <Text style={styles.statValue}>{object.spectralType}</Text>
                                    <Text style={styles.statLabel}>Spectral Type</Text>
                                </View>
                            )}
                        </View>

                        {/* Details List */}
                        <View style={styles.detailsList}>
                            {/* Coordinates */}
                            {object.ra !== undefined && object.dec !== undefined && (
                                <View style={styles.detailRow}>
                                    <Text style={styles.detailLabel}>Position (RA/Dec)</Text>
                                    <Text style={styles.detailValue}>
                                        {(object.ra / 15).toFixed(2)}h / {object.dec >= 0 ? '+' : ''}{object.dec.toFixed(2)}°
                                    </Text>
                                </View>
                            )}

                            {/* Magnitude description */}
                            {object.magnitude !== undefined && (
                                <View style={styles.detailRow}>
                                    <Text style={styles.detailLabel}>Visibility</Text>
                                    <Text style={styles.detailValue}>{getMagnitudeDescription(object.magnitude)}</Text>
                                </View>
                            )}

                            {/* Spectral info */}
                            {object.spectralType ? (
                                <Fragment>
                                    <View style={styles.detailRow}>
                                        <Text style={styles.detailLabel}>Star Type</Text>
                                        <Text style={styles.detailValue}>{getSpectralDescription(object.spectralType)}</Text>
                                    </View>
                                    {getLuminosityClass(object.spectralType) ? (
                                        <View style={styles.detailRow}>
                                            <Text style={styles.detailLabel}>Luminosity</Text>
                                            <Text style={styles.detailValue}>{getLuminosityClass(object.spectralType)}</Text>
                                        </View>
                                    ) : null}
                                </Fragment>
                            ) : null}

                            {/* HIP catalog ID */}
                            {object.id && object.id.startsWith('HIP') && (
                                <View style={styles.detailRow}>
                                    <Text style={styles.detailLabel}>Hipparcos ID</Text>
                                    <Text style={styles.detailValue}>{object.id.replace('HIP', 'HIP ')}</Text>
                                </View>
                            )}

                            {/* Planet-specific info */}
                            {isPlanet ? (
                                <Fragment>
                                    {object.description ? (
                                        <View style={styles.detailRow}>
                                            <Text style={styles.detailLabel}>Description</Text>
                                            <Text style={styles.detailValue}>{object.description}</Text>
                                        </View>
                                    ) : null}
                                    {object.orbitalPeriodDays ? (
                                        <View style={styles.detailRow}>
                                            <Text style={styles.detailLabel}>Orbital Period</Text>
                                            <Text style={styles.detailValue}>{object.orbitalPeriodDays < 365 ? `${object.orbitalPeriodDays.toFixed(1)} days` : `${(object.orbitalPeriodDays / 365.25).toFixed(2)} years`}</Text>
                                        </View>
                                    ) : null}
                                    {object.radiusKm ? (
                                        <View style={styles.detailRow}>
                                            <Text style={styles.detailLabel}>Radius</Text>
                                            <Text style={styles.detailValue}>{object.radiusKm.toLocaleString()} km</Text>
                                        </View>
                                    ) : null}
                                </Fragment>
                            ) : null}
                        </View>

                        {/* Fun fact */}
                        <View style={styles.funFact}>
                            <Text style={styles.funFactLabel}>💡 Did you know?</Text>
                            <Text style={styles.funFactText}>
                                {object.distance
                                    ? `Light from ${object.name || 'this object'} takes ${object.distance < 1 ? 'less than a year' : `about ${Math.round(object.distance)} years`} to reach Earth.`
                                    : `${object.name || 'This object'} is one of the many wonders of our universe!`
                                }
                            </Text>
                        </View>
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.8)',
        justifyContent: 'flex-end',
    },
    modalContainer: {
        backgroundColor: '#1a1a2e',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        maxHeight: '70%',
        paddingBottom: 30,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.1)',
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    starSymbol: {
        fontSize: 36,
    },
    starName: {
        fontSize: 24,
        fontWeight: '700',
    },
    constellation: {
        color: 'rgba(255,255,255,0.6)',
        fontSize: 14,
        marginTop: 2,
    },
    closeButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: 'rgba(255,255,255,0.1)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    closeText: {
        color: '#fff',
        fontSize: 18,
    },
    content: {
        padding: 20,
    },
    statsRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginBottom: 24,
    },
    statBox: {
        alignItems: 'center',
        backgroundColor: 'rgba(79,195,247,0.1)',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 12,
        minWidth: 80,
    },
    statValue: {
        color: '#4fc3f7',
        fontSize: 16,
        fontWeight: '600',
    },
    statLabel: {
        color: 'rgba(255,255,255,0.5)',
        fontSize: 11,
        marginTop: 4,
    },
    detailsList: {
        gap: 12,
    },
    detailRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.05)',
    },
    detailLabel: {
        color: 'rgba(255,255,255,0.5)',
        fontSize: 14,
        flex: 1,
    },
    detailValue: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '500',
        flex: 1.5,
        textAlign: 'right',
    },
    funFact: {
        marginTop: 24,
        backgroundColor: 'rgba(255,215,0,0.1)',
        padding: 16,
        borderRadius: 12,
        borderLeftWidth: 3,
        borderLeftColor: '#ffd700',
    },
    funFactLabel: {
        color: '#ffd700',
        fontSize: 13,
        fontWeight: '600',
        marginBottom: 6,
    },
    funFactText: {
        color: 'rgba(255,255,255,0.8)',
        fontSize: 14,
        lineHeight: 20,
    },
});

export default StarDetailsModal;
