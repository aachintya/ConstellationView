/**
 * Star Details Modal - Premium astronomical info view
 * Clean, modern design without sphere visualization
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
    Platform,
} from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

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
    const getStarColor = (spectralType) => {
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
        if (ra === undefined || ra === null) return null;
        const hours = ra / 15;
        const h = Math.floor(hours);
        const m = Math.floor((hours - h) * 60);
        const s = Math.round(((hours - h) * 60 - m) * 60);
        return `${h}h ${m}m ${s}s`;
    };

    // Format Dec as degrees/arcmin/arcsec
    const formatDec = (dec) => {
        if (dec === undefined || dec === null) return null;
        const sign = dec >= 0 ? '+' : '−';
        const absDec = Math.abs(dec);
        const d = Math.floor(absDec);
        const m = Math.floor((absDec - d) * 60);
        const s = Math.round(((absDec - d) * 60 - m) * 60);
        return `${sign}${d}° ${m}′ ${s}″`;
    };

    // Format distance
    const formatDistance = (distance, isPlanet) => {
        if (!distance || distance === 0) return null;
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

    const starColor = getStarColor(object.spectralType);

    // InfoCard component - modern card design
    const InfoCard = ({ label, value, accent = false }) => {
        if (!value) return null;
        return (
            <View style={styles.infoCard}>
                <Text style={styles.cardLabel}>{label}</Text>
                <Text style={[styles.cardValue, accent && { color: starColor }]}>{value}</Text>
            </View>
        );
    };

    // InfoRow for coordinate-style data
    const InfoRow = ({ label, value }) => {
        if (!value) return null;
        return (
            <View style={styles.infoRow}>
                <Text style={styles.rowLabel}>{label}</Text>
                <Text style={[styles.rowValue, { color: starColor }]}>{value}</Text>
            </View>
        );
    };

    const spectralDesc = getSpectralDescription(object.spectralType);

    return (
        <Modal
            visible={visible}
            animationType="slide"
            presentationStyle="fullScreen"
            onRequestClose={onClose}
        >
            <StatusBar barStyle="light-content" backgroundColor="#0a0a0f" />
            <View style={styles.container}>
                {/* Header */}
                <View style={styles.header}>
                    <View style={styles.headerContent}>
                        <View style={styles.titleRow}>
                            <View style={[styles.typeIndicator, { backgroundColor: starColor }]} />
                            <Text style={[styles.objectName, { color: starColor }]}>
                                {object.name || object.id}
                            </Text>
                        </View>
                        <Text style={styles.objectSubtitle}>
                            {object.constellation || (isPlanet ? 'Planet' : 'Star')}
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
                    {/* Quick Stats Cards */}
                    <View style={styles.statsGrid}>
                        <InfoCard
                            label="Magnitude"
                            value={object.magnitude?.toFixed(2)}
                            accent
                        />
                        <InfoCard
                            label="Distance"
                            value={formatDistance(object.distance, isPlanet)}
                            accent
                        />
                        {object.spectralType && (
                            <InfoCard
                                label="Spectral Type"
                                value={object.spectralType}
                                accent
                            />
                        )}
                        {spectralDesc && (
                            <InfoCard
                                label="Classification"
                                value={spectralDesc}
                            />
                        )}
                    </View>

                    {/* Coordinates Section */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Celestial Coordinates</Text>
                        <View style={styles.coordCard}>
                            <InfoRow label="Right Ascension" value={formatRA(object.ra)} />
                            <View style={styles.divider} />
                            <InfoRow label="Declination" value={formatDec(object.dec)} />
                        </View>
                    </View>

                    {/* Additional Info */}
                    {object.id !== object.name && object.id && (
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Catalog Information</Text>
                            <View style={styles.coordCard}>
                                <InfoRow label="Catalog ID" value={object.id} />
                            </View>
                        </View>
                    )}

                    {/* Bottom spacing */}
                    <View style={styles.bottomSpacer} />
                </ScrollView>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0a0a0f',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        paddingTop: Platform.OS === 'ios' ? 60 : 48,
        paddingHorizontal: 24,
        paddingBottom: 24,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.06)',
    },
    headerContent: {
        flex: 1,
    },
    titleRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    typeIndicator: {
        width: 10,
        height: 10,
        borderRadius: 5,
        marginRight: 12,
        shadowColor: '#fff',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.6,
        shadowRadius: 6,
        elevation: 5,
    },
    objectName: {
        fontSize: 28,
        fontWeight: '600',
        letterSpacing: 0.5,
    },
    objectSubtitle: {
        color: 'rgba(255,255,255,0.4)',
        fontSize: 14,
        marginTop: 6,
        marginLeft: 22,
        fontWeight: '400',
        letterSpacing: 0.5,
    },
    closeButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.08)',
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 16,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    closeText: {
        color: 'rgba(255,255,255,0.6)',
        fontSize: 16,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: 24,
        paddingTop: 24,
    },
    statsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginHorizontal: -6,
        marginBottom: 24,
    },
    infoCard: {
        width: (SCREEN_WIDTH - 48 - 24) / 2,
        backgroundColor: 'rgba(255,255,255,0.03)',
        borderRadius: 16,
        padding: 16,
        margin: 6,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.06)',
    },
    cardLabel: {
        color: 'rgba(255,255,255,0.4)',
        fontSize: 11,
        fontWeight: '600',
        letterSpacing: 0.8,
        textTransform: 'uppercase',
        marginBottom: 8,
    },
    cardValue: {
        color: 'rgba(255,255,255,0.9)',
        fontSize: 18,
        fontWeight: '600',
    },
    section: {
        marginBottom: 24,
    },
    sectionTitle: {
        color: 'rgba(255,255,255,0.35)',
        fontSize: 12,
        fontWeight: '600',
        letterSpacing: 1,
        textTransform: 'uppercase',
        marginBottom: 12,
    },
    coordCard: {
        backgroundColor: 'rgba(255,255,255,0.03)',
        borderRadius: 16,
        padding: 4,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.06)',
    },
    infoRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 14,
        paddingHorizontal: 16,
    },
    rowLabel: {
        color: 'rgba(255,255,255,0.4)',
        fontSize: 14,
        fontWeight: '400',
    },
    rowValue: {
        fontSize: 15,
        fontWeight: '600',
        textAlign: 'right',
    },
    divider: {
        height: 1,
        backgroundColor: 'rgba(255,255,255,0.06)',
        marginHorizontal: 16,
    },
    bottomSpacer: {
        height: 40,
    },
});

export default StarDetailsModal;
