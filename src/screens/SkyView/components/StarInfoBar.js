/**
 * StarInfoBar - Premium bottom info bar showing tapped star details
 * Features: Gradient background, subtle glow, micro-animations
 */
import React from 'react';
import { View, Text, TouchableOpacity, Animated, StyleSheet, Platform } from 'react-native';

const StarInfoBar = ({
    star,
    showModal,
    translateY,
    opacity,
    onInfoPress,
    onDismiss,
}) => {
    if (!star || showModal) return null;

    const subtitle = star.type === 'planet' ? 'Planet' :
        star.constellation ? `Star in ${star.constellation}` :
            star.spectralType ? `${star.spectralType}-class Star` : 'Star';

    // Get accent color based on spectral type
    const getAccentColor = () => {
        if (star.type === 'planet') return '#FFD54F';
        if (!star.spectralType) return '#4FC3F7';
        const type = star.spectralType.charAt(0).toUpperCase();
        const colors = {
            'O': '#9BB0FF', 'B': '#AABFFF', 'A': '#CAD7FF',
            'F': '#F8F7FF', 'G': '#FFF4E8', 'K': '#FFDAB5', 'M': '#FFBD6F'
        };
        return colors[type] || '#4FC3F7';
    };

    const accentColor = getAccentColor();

    return (
        <Animated.View style={[
            styles.container,
            { transform: [{ translateY }], opacity }
        ]}>
            {/* Top accent line with glow effect */}
            <View style={[styles.accentLine, { backgroundColor: accentColor }]} />

            <View style={styles.innerContainer}>
                {/* Star info section */}
                <View style={styles.content}>
                    <View style={styles.nameRow}>
                        <View style={[styles.starIndicator, {
                            backgroundColor: accentColor,
                            shadowColor: accentColor,
                        }]} />
                        <Text style={[styles.name, { color: accentColor }]} numberOfLines={1}>
                            {star.name || star.id}
                        </Text>
                    </View>
                    <Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text>

                    {/* Quick stats row */}
                    {(star.magnitude !== undefined || star.distance) && (
                        <View style={styles.statsRow}>
                            {star.magnitude !== undefined && (
                                <View style={styles.statItem}>
                                    <Text style={styles.statLabel}>MAG</Text>
                                    <Text style={[styles.statValue, { color: accentColor }]}>
                                        {star.magnitude.toFixed(1)}
                                    </Text>
                                </View>
                            )}
                            {star.distance > 0 && (
                                <View style={styles.statItem}>
                                    <Text style={styles.statLabel}>DIST</Text>
                                    <Text style={[styles.statValue, { color: accentColor }]}>
                                        {star.distance < 100 ? `${star.distance.toFixed(1)} ly` : `${Math.round(star.distance)} ly`}
                                    </Text>
                                </View>
                            )}
                        </View>
                    )}
                </View>

                {/* Action buttons */}
                <View style={styles.buttons}>
                    <TouchableOpacity
                        style={[styles.infoButton, {
                            backgroundColor: accentColor,
                            shadowColor: accentColor,
                        }]}
                        onPress={onInfoPress}
                        activeOpacity={0.8}
                    >
                        <Text style={styles.infoButtonText}>i</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={styles.closeButton}
                        onPress={onDismiss}
                        activeOpacity={0.7}
                    >
                        <Text style={styles.closeButtonText}>✕</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: 'rgba(6, 10, 20, 0.97)',
        overflow: 'hidden',
        // Subtle top shadow for depth
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.5,
        shadowRadius: 12,
        elevation: 24,
    },
    accentLine: {
        height: 2,
        opacity: 0.9,
        // Glow effect for the line
        shadowColor: '#4FC3F7',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.8,
        shadowRadius: 8,
    },
    innerContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: 16,
        paddingBottom: Platform.OS === 'ios' ? 34 : 24,
    },
    content: {
        flex: 1,
        marginRight: 16,
    },
    nameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4,
    },
    starIndicator: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginRight: 10,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.8,
        shadowRadius: 6,
        elevation: 4,
    },
    name: {
        fontSize: 20,
        fontWeight: '600',
        letterSpacing: 0.5,
        flex: 1,
    },
    subtitle: {
        color: 'rgba(255,255,255,0.5)',
        fontSize: 13,
        marginLeft: 18,
        letterSpacing: 0.3,
    },
    statsRow: {
        flexDirection: 'row',
        marginTop: 10,
        marginLeft: 18,
        gap: 20,
    },
    statItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    statLabel: {
        color: 'rgba(255,255,255,0.3)',
        fontSize: 10,
        fontWeight: '600',
        letterSpacing: 1,
    },
    statValue: {
        fontSize: 13,
        fontWeight: '600',
    },
    buttons: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    infoButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.4,
        shadowRadius: 6,
        elevation: 6,
    },
    infoButtonText: {
        color: '#000',
        fontSize: 18,
        fontWeight: '700',
        fontStyle: 'italic',
    },
    closeButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.06)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
    },
    closeButtonText: {
        color: 'rgba(255,255,255,0.5)',
        fontSize: 16,
    },
});

export default StarInfoBar;
