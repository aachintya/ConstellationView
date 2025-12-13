/**
 * Constellation Display Screen
 * Simple display of ONE constellation (Leo) with its illustration and stars
 * Testing phase - minimal implementation
 */

import React, { useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Image,
    Dimensions,
    Animated,
    StatusBar,
} from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Leo constellation - main stars only
const LEO_STARS = [
    { id: 1, name: "Regulus", magnitude: 1.36, x: 0.75, y: 0.36 },
    { id: 2, name: "Algieba", magnitude: 2.01, x: 0.60, y: 0.28 },
    { id: 3, name: "Denebola", magnitude: 2.14, x: 0.13, y: 0.80 },
    { id: 4, name: "Zosma", magnitude: 2.56, x: 0.35, y: 0.35 },
    { id: 5, name: "Chertan", magnitude: 3.33, x: 0.40, y: 0.45 },
    { id: 6, name: "Adhafera", magnitude: 3.44, x: 0.55, y: 0.20 },
    { id: 7, name: "Eta Leo", magnitude: 3.52, x: 0.68, y: 0.32 },
    { id: 8, name: "Ras Elased", magnitude: 3.0, x: 0.85, y: 0.42 },
];

// Constellation lines (connecting star indices)
const LEO_LINES = [
    [0, 6], [6, 1], [1, 5], [1, 3], [3, 4], [4, 2], [0, 7]
];

// Calculate star size based on magnitude
const getStarSize = (magnitude) => {
    const normalized = Math.max(0, Math.min(1, (4 - magnitude) / 3));
    return 6 + normalized * 14; // 6 to 20 pixels
};

const ConstellationDisplayScreen = ({ onBack = null }) => {
    const imageSize = SCREEN_WIDTH - 40;
    const fadeAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
        }).start();
    }, []);

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="#0a0a1a" />

            {/* Background stars */}
            <View style={styles.bgStars}>
                {Array.from({ length: 30 }).map((_, i) => (
                    <View
                        key={i}
                        style={[
                            styles.bgStar,
                            {
                                left: `${Math.random() * 100}%`,
                                top: `${Math.random() * 100}%`,
                                width: Math.random() * 2 + 1,
                                height: Math.random() * 2 + 1,
                                opacity: Math.random() * 0.4 + 0.1,
                            },
                        ]}
                    />
                ))}
            </View>

            {/* Header */}
            <Animated.View style={[styles.header, { opacity: fadeAnim }]}>
                <Text style={styles.title}>Leo</Text>
                <Text style={styles.subtitle}>सिंहराशिः • The Lion</Text>
            </Animated.View>

            {/* Constellation Container */}
            <Animated.View
                style={[
                    styles.constellationContainer,
                    { opacity: fadeAnim, width: imageSize, height: imageSize }
                ]}
            >
                {/* Constellation Illustration */}
                <Image
                    source={require('../assets/constellations/leo.png')}
                    style={[styles.illustration, { width: imageSize, height: imageSize }]}
                    resizeMode="contain"
                    onError={(e) => console.log('Image load error:', e.nativeEvent.error)}
                    onLoad={() => console.log('Image loaded successfully!')}
                />

                {/* Constellation Lines */}
                {LEO_LINES.map(([from, to], idx) => {
                    const star1 = LEO_STARS[from];
                    const star2 = LEO_STARS[to];
                    const x1 = star1.x * imageSize;
                    const y1 = star1.y * imageSize;
                    const x2 = star2.x * imageSize;
                    const y2 = star2.y * imageSize;
                    const length = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
                    const angle = Math.atan2(y2 - y1, x2 - x1) * (180 / Math.PI);

                    return (
                        <View
                            key={`line-${idx}`}
                            style={[
                                styles.line,
                                {
                                    left: x1,
                                    top: y1,
                                    width: length,
                                    transform: [{ rotate: `${angle}deg` }],
                                },
                            ]}
                        />
                    );
                })}

                {/* Stars */}
                {LEO_STARS.map((star) => {
                    const size = getStarSize(star.magnitude);
                    return (
                        <View
                            key={star.id}
                            style={[
                                styles.starWrapper,
                                {
                                    left: star.x * imageSize - size / 2,
                                    top: star.y * imageSize - size / 2,
                                },
                            ]}
                        >
                            {/* Glow */}
                            <View style={[styles.starGlow, { width: size * 2.5, height: size * 2.5 }]} />
                            {/* Star */}
                            <View style={[styles.star, { width: size, height: size, borderRadius: size / 2 }]} />
                            {/* Label */}
                            <Text style={styles.starLabel}>{star.name}</Text>
                        </View>
                    );
                })}
            </Animated.View>

            {/* Info */}
            <Animated.View style={[styles.infoBox, { opacity: fadeAnim }]}>
                <Text style={styles.infoTitle}>Notable Stars</Text>
                <Text style={styles.infoText}>
                    ⭐ Regulus (mag 1.36) - Heart of the Lion{'\n'}
                    ⭐ Denebola (mag 2.14) - The Tail{'\n'}
                    ⭐ Algieba (mag 2.01) - The Mane
                </Text>
            </Animated.View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0a0a1a',
        alignItems: 'center',
        paddingTop: 60,
    },
    bgStars: {
        ...StyleSheet.absoluteFillObject,
    },
    bgStar: {
        position: 'absolute',
        backgroundColor: '#ffffff',
        borderRadius: 10,
    },
    header: {
        alignItems: 'center',
        marginBottom: 20,
    },
    title: {
        fontSize: 48,
        fontWeight: '800',
        color: '#ffffff',
        letterSpacing: 4,
    },
    subtitle: {
        fontSize: 18,
        color: '#ffd700',
        marginTop: 8,
    },
    constellationContainer: {
        position: 'relative',
        borderRadius: 16,
        overflow: 'hidden',
        backgroundColor: 'rgba(10, 20, 40, 0.5)',
        borderWidth: 1,
        borderColor: 'rgba(100, 150, 200, 0.3)',
    },
    illustration: {
        opacity: 0.6,
    },
    line: {
        position: 'absolute',
        height: 2,
        backgroundColor: 'rgba(100, 180, 255, 0.5)',
        transformOrigin: 'left center',
    },
    starWrapper: {
        position: 'absolute',
        alignItems: 'center',
        justifyContent: 'center',
    },
    starGlow: {
        position: 'absolute',
        backgroundColor: 'rgba(255, 220, 100, 0.3)',
        borderRadius: 100,
    },
    star: {
        backgroundColor: '#ffffff',
        shadowColor: '#ffffff',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 1,
        shadowRadius: 8,
        elevation: 8,
    },
    starLabel: {
        position: 'absolute',
        top: '100%',
        marginTop: 4,
        color: '#ffffff',
        fontSize: 10,
        fontWeight: '600',
        textShadowColor: '#000000',
        textShadowOffset: { width: 1, height: 1 },
        textShadowRadius: 2,
    },
    infoBox: {
        marginTop: 24,
        backgroundColor: 'rgba(20, 40, 60, 0.8)',
        padding: 20,
        borderRadius: 12,
        marginHorizontal: 20,
        width: SCREEN_WIDTH - 40,
    },
    infoTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#87ceeb',
        marginBottom: 12,
    },
    infoText: {
        fontSize: 14,
        color: 'rgba(255, 255, 255, 0.8)',
        lineHeight: 22,
    },
});

export default ConstellationDisplayScreen;
