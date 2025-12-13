/**
 * Star Map Screen
 * Full sky view with 7 constellations and 100+ stars
 * Pannable and zoomable like SkyView
 */

import React, { useRef, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Image,
    Dimensions,
    ScrollView,
    Animated,
    StatusBar,
    TouchableOpacity,
} from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Sky map dimensions (larger than screen for panning)
const SKY_WIDTH = SCREEN_WIDTH * 3;
const SKY_HEIGHT = SCREEN_HEIGHT * 2;

// ============== CONSTELLATION DATA ==============
const CONSTELLATIONS = [
    {
        id: 'leo',
        name: 'Leo',
        nativeName: 'सिंहराशिः',
        image: require('../assets/constellations/leo.png'),
        x: 0.15, y: 0.25,
        size: 200,
        stars: [
            { name: "Regulus", mag: 1.36, x: 0.75, y: 0.36 },
            { name: "Algieba", mag: 2.01, x: 0.60, y: 0.28 },
            { name: "Denebola", mag: 2.14, x: 0.13, y: 0.80 },
            { name: "Zosma", mag: 2.56, x: 0.35, y: 0.35 },
        ],
        lines: [[0, 1], [1, 3], [3, 2], [0, 3]],
    },
    {
        id: 'aries',
        name: 'Aries',
        nativeName: 'मेषराशिः',
        image: require('../assets/constellations/aries.png'),
        x: 0.55, y: 0.15,
        size: 160,
        stars: [
            { name: "Hamal", mag: 2.01, x: 0.3, y: 0.4 },
            { name: "Sheratan", mag: 2.64, x: 0.6, y: 0.35 },
            { name: "Mesarthim", mag: 3.88, x: 0.75, y: 0.45 },
        ],
        lines: [[0, 1], [1, 2]],
    },
    {
        id: 'taurus',
        name: 'Taurus',
        nativeName: 'वृषराशिः',
        image: require('../assets/constellations/taurus.png'),
        x: 0.35, y: 0.45,
        size: 220,
        stars: [
            { name: "Aldebaran", mag: 0.87, x: 0.45, y: 0.55 },
            { name: "Elnath", mag: 1.65, x: 0.15, y: 0.25 },
            { name: "Alcyone", mag: 2.85, x: 0.7, y: 0.3 },
            { name: "Tianguan", mag: 3.0, x: 0.2, y: 0.4 },
        ],
        lines: [[0, 1], [0, 2], [0, 3]],
    },
    {
        id: 'gemini',
        name: 'Gemini',
        nativeName: 'मिथुनराशिः',
        image: require('../assets/constellations/gemini.png'),
        x: 0.65, y: 0.40,
        size: 180,
        stars: [
            { name: "Castor", mag: 1.58, x: 0.35, y: 0.2 },
            { name: "Pollux", mag: 1.16, x: 0.55, y: 0.25 },
            { name: "Alhena", mag: 1.93, x: 0.45, y: 0.7 },
            { name: "Mebsuta", mag: 2.98, x: 0.25, y: 0.5 },
        ],
        lines: [[0, 1], [0, 3], [1, 2], [3, 2]],
    },
    {
        id: 'scorpius',
        name: 'Scorpius',
        nativeName: 'वृश्चिकराशिः',
        image: require('../assets/constellations/scorpius.png'),
        x: 0.10, y: 0.60,
        size: 240,
        stars: [
            { name: "Antares", mag: 1.06, x: 0.4, y: 0.3 },
            { name: "Shaula", mag: 1.62, x: 0.15, y: 0.75 },
            { name: "Sargas", mag: 1.86, x: 0.25, y: 0.6 },
            { name: "Dschubba", mag: 2.29, x: 0.5, y: 0.2 },
        ],
        lines: [[3, 0], [0, 2], [2, 1]],
    },
    {
        id: 'sagittarius',
        name: 'Sagittarius',
        nativeName: 'धनूराशिः',
        image: require('../assets/constellations/sagittarius.png'),
        x: 0.45, y: 0.65,
        size: 200,
        stars: [
            { name: "Kaus Australis", mag: 1.79, x: 0.5, y: 0.6 },
            { name: "Nunki", mag: 2.05, x: 0.3, y: 0.35 },
            { name: "Ascella", mag: 2.60, x: 0.45, y: 0.45 },
            { name: "Kaus Media", mag: 2.72, x: 0.6, y: 0.5 },
        ],
        lines: [[1, 2], [2, 0], [2, 3], [0, 3]],
    },
    {
        id: 'ursa-major',
        name: 'Ursa Major',
        nativeName: 'ऋक्षः',
        image: require('../assets/constellations/ursa-major.png'),
        x: 0.60, y: 0.08,
        size: 250,
        stars: [
            { name: "Dubhe", mag: 1.81, x: 0.7, y: 0.3 },
            { name: "Merak", mag: 2.34, x: 0.65, y: 0.45 },
            { name: "Phecda", mag: 2.41, x: 0.5, y: 0.5 },
            { name: "Megrez", mag: 3.32, x: 0.45, y: 0.35 },
            { name: "Alioth", mag: 1.76, x: 0.3, y: 0.3 },
            { name: "Mizar", mag: 2.23, x: 0.2, y: 0.25 },
            { name: "Alkaid", mag: 1.85, x: 0.1, y: 0.2 },
        ],
        lines: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [3, 0]],
    },
];

// Generate 100 random background stars
const generateBackgroundStars = () => {
    const stars = [];
    for (let i = 0; i < 100; i++) {
        stars.push({
            id: `bg-${i}`,
            x: Math.random(),
            y: Math.random(),
            size: Math.random() * 3 + 1,
            opacity: Math.random() * 0.6 + 0.2,
            twinkleSpeed: Math.random() * 2000 + 1500,
        });
    }
    return stars;
};

const BACKGROUND_STARS = generateBackgroundStars();

// Star size based on magnitude
const getStarSize = (mag) => {
    const normalized = Math.max(0, Math.min(1, (4 - mag) / 3.5));
    return 4 + normalized * 12;
};

// Constellation Component
const Constellation = ({ data, onPress }) => {
    const { name, nativeName, image, x, y, size, stars, lines } = data;
    const posX = x * SKY_WIDTH;
    const posY = y * SKY_HEIGHT;

    return (
        <TouchableOpacity
            style={[styles.constellation, { left: posX, top: posY, width: size, height: size }]}
            onPress={() => onPress(data)}
            activeOpacity={0.8}
        >
            {/* Constellation Image */}
            <Image
                source={image}
                style={[styles.constellationImage, { width: size, height: size }]}
                resizeMode="contain"
            />

            {/* Constellation Lines */}
            {lines.map(([from, to], idx) => {
                const star1 = stars[from];
                const star2 = stars[to];
                const x1 = star1.x * size;
                const y1 = star1.y * size;
                const x2 = star2.x * size;
                const y2 = star2.y * size;
                const length = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
                const angle = Math.atan2(y2 - y1, x2 - x1) * (180 / Math.PI);

                return (
                    <View
                        key={`line-${idx}`}
                        style={[
                            styles.constellationLine,
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
            {stars.map((star, idx) => {
                const starSize = getStarSize(star.mag);
                return (
                    <View
                        key={idx}
                        style={[
                            styles.starContainer,
                            {
                                left: star.x * size - starSize / 2,
                                top: star.y * size - starSize / 2,
                            },
                        ]}
                    >
                        <View style={[styles.starGlow, { width: starSize * 2.5, height: starSize * 2.5 }]} />
                        <View style={[styles.star, { width: starSize, height: starSize, borderRadius: starSize / 2 }]} />
                    </View>
                );
            })}

            {/* Name Label */}
            <View style={styles.constellationLabel}>
                <Text style={styles.constellationName}>{name}</Text>
                <Text style={styles.constellationNative}>{nativeName}</Text>
            </View>
        </TouchableOpacity>
    );
};

// Background Star Component
const BackgroundStar = ({ star }) => {
    const opacity = useRef(new Animated.Value(star.opacity)).current;

    React.useEffect(() => {
        const twinkle = Animated.loop(
            Animated.sequence([
                Animated.timing(opacity, {
                    toValue: star.opacity * 0.3,
                    duration: star.twinkleSpeed,
                    useNativeDriver: true,
                }),
                Animated.timing(opacity, {
                    toValue: star.opacity,
                    duration: star.twinkleSpeed,
                    useNativeDriver: true,
                }),
            ])
        );
        twinkle.start();
        return () => twinkle.stop();
    }, []);

    return (
        <Animated.View
            style={[
                styles.bgStar,
                {
                    left: star.x * SKY_WIDTH,
                    top: star.y * SKY_HEIGHT,
                    width: star.size,
                    height: star.size,
                    opacity,
                },
            ]}
        />
    );
};

// Main Screen
const StarMapScreen = () => {
    const [selectedConstellation, setSelectedConstellation] = useState(null);
    const scrollViewRef = useRef(null);

    // Center the view on load
    React.useEffect(() => {
        setTimeout(() => {
            scrollViewRef.current?.scrollTo({
                x: (SKY_WIDTH - SCREEN_WIDTH) / 2,
                y: (SKY_HEIGHT - SCREEN_HEIGHT) / 2,
                animated: false,
            });
        }, 100);
    }, []);

    const handleConstellationPress = (constellation) => {
        setSelectedConstellation(constellation);
    };

    const closeModal = () => {
        setSelectedConstellation(null);
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="#050510" />

            {/* Scrollable Star Map */}
            <ScrollView
                ref={scrollViewRef}
                style={styles.scrollView}
                contentContainerStyle={[styles.sky, { width: SKY_WIDTH, height: SKY_HEIGHT }]}
                horizontal
                showsHorizontalScrollIndicator={false}
                showsVerticalScrollIndicator={false}
                bounces={false}
                scrollEventThrottle={16}
            >
                <ScrollView
                    nestedScrollEnabled
                    showsVerticalScrollIndicator={false}
                    bounces={false}
                    contentContainerStyle={{ width: SKY_WIDTH, height: SKY_HEIGHT }}
                >
                    {/* Background Stars */}
                    {BACKGROUND_STARS.map((star) => (
                        <BackgroundStar key={star.id} star={star} />
                    ))}

                    {/* Constellations */}
                    {CONSTELLATIONS.map((constellation) => (
                        <Constellation
                            key={constellation.id}
                            data={constellation}
                            onPress={handleConstellationPress}
                        />
                    ))}
                </ScrollView>
            </ScrollView>

            {/* Header Overlay */}
            <View style={styles.header}>
                <Text style={styles.headerTitle}>✨ Star Map</Text>
                <Text style={styles.headerSubtitle}>Pan to explore • Tap constellation for details</Text>
            </View>

            {/* Compass Indicator */}
            <View style={styles.compass}>
                <Text style={styles.compassText}>N</Text>
            </View>

            {/* Constellation Count */}
            <View style={styles.statsBox}>
                <Text style={styles.statsText}>⭐ 100+ Stars</Text>
                <Text style={styles.statsText}>✦ 7 Constellations</Text>
            </View>

            {/* Selected Constellation Modal */}
            {selectedConstellation && (
                <TouchableOpacity style={styles.modalOverlay} onPress={closeModal} activeOpacity={1}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>{selectedConstellation.name}</Text>
                        <Text style={styles.modalNative}>{selectedConstellation.nativeName}</Text>
                        <View style={styles.modalDivider} />
                        <Text style={styles.modalStarsTitle}>Notable Stars:</Text>
                        {selectedConstellation.stars.map((star, idx) => (
                            <Text key={idx} style={styles.modalStar}>
                                ⭐ {star.name} (mag {star.mag.toFixed(2)})
                            </Text>
                        ))}
                        <TouchableOpacity style={styles.modalClose} onPress={closeModal}>
                            <Text style={styles.modalCloseText}>Close</Text>
                        </TouchableOpacity>
                    </View>
                </TouchableOpacity>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#050510',
    },
    scrollView: {
        flex: 1,
    },
    sky: {
        backgroundColor: '#050510',
    },
    bgStar: {
        position: 'absolute',
        backgroundColor: '#ffffff',
        borderRadius: 10,
    },
    constellation: {
        position: 'absolute',
    },
    constellationImage: {
        opacity: 0.5,
    },
    constellationLine: {
        position: 'absolute',
        height: 1.5,
        backgroundColor: 'rgba(100, 180, 255, 0.6)',
        transformOrigin: 'left center',
        shadowColor: '#4488ff',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.8,
        shadowRadius: 4,
    },
    starContainer: {
        position: 'absolute',
        alignItems: 'center',
        justifyContent: 'center',
    },
    starGlow: {
        position: 'absolute',
        backgroundColor: 'rgba(255, 220, 100, 0.25)',
        borderRadius: 100,
    },
    star: {
        backgroundColor: '#ffffff',
        shadowColor: '#ffffff',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 1,
        shadowRadius: 6,
        elevation: 5,
    },
    constellationLabel: {
        position: 'absolute',
        bottom: -30,
        left: 0,
        right: 0,
        alignItems: 'center',
    },
    constellationName: {
        color: '#ffffff',
        fontSize: 14,
        fontWeight: '700',
        textShadowColor: '#000',
        textShadowOffset: { width: 1, height: 1 },
        textShadowRadius: 3,
    },
    constellationNative: {
        color: '#ffd700',
        fontSize: 11,
        fontWeight: '500',
    },
    header: {
        position: 'absolute',
        top: 50,
        left: 0,
        right: 0,
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 28,
        fontWeight: '800',
        color: '#ffffff',
        textShadowColor: 'rgba(100, 180, 255, 0.5)',
        textShadowOffset: { width: 0, height: 2 },
        textShadowRadius: 8,
    },
    headerSubtitle: {
        fontSize: 12,
        color: 'rgba(255, 255, 255, 0.6)',
        marginTop: 4,
    },
    compass: {
        position: 'absolute',
        top: 50,
        right: 20,
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.3)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    compassText: {
        color: '#ff6b6b',
        fontSize: 16,
        fontWeight: '700',
    },
    statsBox: {
        position: 'absolute',
        bottom: 30,
        left: 20,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
    },
    statsText: {
        color: 'rgba(255, 255, 255, 0.7)',
        fontSize: 12,
    },
    modalOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        backgroundColor: '#0d1a2d',
        borderRadius: 20,
        padding: 24,
        width: SCREEN_WIDTH - 60,
        borderWidth: 1,
        borderColor: 'rgba(100, 180, 255, 0.3)',
    },
    modalTitle: {
        fontSize: 32,
        fontWeight: '800',
        color: '#ffffff',
        textAlign: 'center',
    },
    modalNative: {
        fontSize: 20,
        color: '#ffd700',
        textAlign: 'center',
        marginTop: 4,
    },
    modalDivider: {
        height: 1,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        marginVertical: 16,
    },
    modalStarsTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#87ceeb',
        marginBottom: 8,
    },
    modalStar: {
        fontSize: 14,
        color: 'rgba(255, 255, 255, 0.8)',
        marginVertical: 4,
    },
    modalClose: {
        marginTop: 20,
        backgroundColor: 'rgba(100, 180, 255, 0.2)',
        paddingVertical: 12,
        borderRadius: 10,
        alignItems: 'center',
    },
    modalCloseText: {
        color: '#4fc3f7',
        fontSize: 16,
        fontWeight: '600',
    },
});

export default StarMapScreen;
