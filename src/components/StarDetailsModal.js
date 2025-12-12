/**
 * Star Details Modal - Minimalist professional info view
 * Shows detailed astronomical information about a selected celestial object
 */

import React from 'react';
import {
    View,
    Text,
    Modal,
    TouchableOpacity,
    StyleSheet,
    Dimensions,
    ScrollView,
    StatusBar,
} from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const StarDetailsModal = ({ visible, object, onClose, theme, nightMode = 'off' }) => {
    if (!object) return null;

    const isPlanet = object.type === 'planet';

    // Night mode colors - refined palette
    const getColors = () => {
        switch (nightMode) {
            case 'red':
                return { primary: '#ff5252', accent: '#ff8a80', dim: 'rgba(255,255,255,0.4)' };
            case 'green':
                return { primary: '#69f0ae', accent: '#b9f6ca', dim: 'rgba(255,255,255,0.4)' };
            default:
                return { primary: '#4fc3f7', accent: '#81d4fa', dim: 'rgba(255,255,255,0.45)' };
        }
    };
    const colors = getColors();

    // Get star color based on spectral type
    const getStarGlowColor = (spectralType) => {
        if (!spectralType) return colors.primary;
        const type = spectralType.charAt(0).toUpperCase();
        const starColors = {
            'O': '#9bb0ff', 'B': '#aabfff', 'A': '#cad7ff',
            'F': '#f8f7ff', 'G': '#fff4e8', 'K': '#ffdab5', 'M': '#ffbd6f'
        };
        return starColors[type] || colors.primary;
    };

    // Format RA as hours/min/sec
    const formatRA = (ra) => {
        if (ra === undefined || ra === null) return '—';
        const hours = ra / 15;
        const h = Math.floor(hours);
        const m = Math.floor((hours - h) * 60);
        const s = Math.round(((hours - h) * 60 - m) * 60);
        return `${h}h ${m}m ${s}s`;
    };

    // Format Dec as degrees/arcmin/arcsec
    const formatDec = (dec) => {
        if (dec === undefined || dec === null) return '—';
        const sign = dec >= 0 ? '+' : '−';
        const absDec = Math.abs(dec);
        const d = Math.floor(absDec);
        const m = Math.floor((absDec - d) * 60);
        const s = Math.round(((absDec - d) * 60 - m) * 60);
        return `${sign}${d}° ${m}′ ${s}″`;
    };

    // Format distance
    const formatDistance = (distance, isPlanet) => {
        if (!distance || distance === 0) return '—';
        if (isPlanet) {
            if (distance < 0.01) return `${(distance * 149597870.7).toFixed(0)} km`;
            return `${distance.toFixed(3)} AU`;
        }
        if (distance < 100) return `${distance.toFixed(1)} ly`;
        if (distance < 1000) return `${distance.toFixed(0)} ly`;
        return `${(distance / 1000).toFixed(2)}k ly`;
    };

    // Get spectral class description
    const getSpectralDescription = (spectralType) => {
        if (!spectralType) return null;
        const firstLetter = spectralType.charAt(0).toUpperCase();
        const descriptions = {
            'O': 'Blue supergiant',
            'B': 'Blue-white giant',
            'A': 'White star',
            'F': 'Yellow-white',
            'G': 'Yellow (Sun-like)',
            'K': 'Orange star',
            'M': 'Red dwarf/giant',
        };
        return descriptions[firstLetter];
    };

    const starGlowColor = getStarGlowColor(object.spectralType);

    // InfoRow component - cleaner design
    const InfoRow = ({ label, value }) => {
        if (!value || value === '—') return null;
        return (
            <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>{label}</Text>
                <Text style={[styles.infoValue, { color: colors.primary }]}>{value}</Text>
            </View>
        );
    };

    return (
        <Modal
            visible={visible}
            animationType="fade"
            presentationStyle="fullScreen"
            onRequestClose={onClose}
        >
            <StatusBar barStyle="light-content" backgroundColor="#000" />
            <View style={styles.container}>
                {/* Minimal Header */}
                <View style={styles.header}>
                    <View style={styles.headerContent}>
                        <Text style={[styles.objectName, { color: colors.primary }]}>
                            {object.name || object.id}
                        </Text>
                        <Text style={styles.objectSubtitle}>
                            {object.constellation ? object.constellation : isPlanet ? 'Planet' : 'Star'}
                        </Text>
                    </View>
                    <TouchableOpacity style={styles.closeButton} onPress={onClose} activeOpacity={0.7}>
                        <Text style={styles.closeText}>✕</Text>
                    </TouchableOpacity>
                </View>

                <ScrollView
                    style={styles.scrollView}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.scrollContent}
                >
                    {/* Refined Glow Visualization */}
                    <View style={styles.glowContainer}>
                        <View style={[styles.glowOuter, { backgroundColor: `${starGlowColor}08` }]} />
                        <View style={[styles.glowMiddle, { backgroundColor: `${starGlowColor}18` }]} />
                        <View style={[styles.glowCore, { backgroundColor: starGlowColor, shadowColor: starGlowColor }]} />
                    </View>

                    {/* Info Grid - Professional Layout */}
                    <View style={styles.infoList}>
                        <InfoRow label="Right Ascension" value={formatRA(object.ra)} />
                        <InfoRow label="Declination" value={formatDec(object.dec)} />
                        <InfoRow label="Distance" value={formatDistance(object.distance, isPlanet)} />
                        <InfoRow label="Magnitude" value={object.magnitude?.toFixed(2)} />
                        {object.spectralType && (
                            <InfoRow label="Spectral Type" value={object.spectralType} />
                        )}
                        {object.spectralType && getSpectralDescription(object.spectralType) && (
                            <InfoRow label="Classification" value={getSpectralDescription(object.spectralType)} />
                        )}
                        {object.id !== object.name && object.id && (
                            <InfoRow label="Catalog ID" value={object.id} />
                        )}
                    </View>
                </ScrollView>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        paddingTop: 56,
        paddingHorizontal: 28,
        paddingBottom: 20,
    },
    headerContent: {
        flex: 1,
    },
    objectName: {
        fontSize: 32,
        fontWeight: '200',
        letterSpacing: 0.5,
    },
    objectSubtitle: {
        color: 'rgba(255,255,255,0.4)',
        fontSize: 13,
        marginTop: 6,
        fontWeight: '400',
        letterSpacing: 0.5,
    },
    closeButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: 'rgba(255,255,255,0.08)',
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 16,
    },
    closeText: {
        color: 'rgba(255,255,255,0.7)',
        fontSize: 16,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingBottom: 40,
    },
    glowContainer: {
        height: 260,
        justifyContent: 'center',
        alignItems: 'center',
        marginVertical: 32,
    },
    glowOuter: {
        position: 'absolute',
        width: 200,
        height: 200,
        borderRadius: 100,
    },
    glowMiddle: {
        position: 'absolute',
        width: 140,
        height: 140,
        borderRadius: 70,
    },
    glowCore: {
        width: 80,
        height: 80,
        borderRadius: 40,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.9,
        shadowRadius: 35,
        elevation: 15,
    },
    infoList: {
        paddingHorizontal: 28,
        paddingTop: 8,
    },
    infoRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 16,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: 'rgba(255,255,255,0.06)',
    },
    infoLabel: {
        color: 'rgba(255,255,255,0.4)',
        fontSize: 13,
        fontWeight: '400',
        flex: 1,
        letterSpacing: 0.3,
    },
    infoValue: {
        fontSize: 15,
        fontWeight: '500',
        textAlign: 'right',
        flex: 1,
        letterSpacing: 0.2,
    },
});

export default StarDetailsModal;
