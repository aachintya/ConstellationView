/**
 * Enhanced Star Map with GPU-Accelerated Skia Rendering
 * Optimized for entry-level to mid-range devices (Samsung A14, etc.)
 * 
 * Features:
 * - GPU-accelerated star rendering via react-native-skia
 * - Pinch-to-zoom with dynamic star density (LOD)
 * - Tap on star to show name label
 * - Double-tap to open detailed modal
 * - Smooth 60fps rendering on most devices
 */

import React, { useMemo, useCallback, useState, useEffect, useRef, memo } from 'react';
import { View, StyleSheet, Dimensions, Image, TouchableOpacity, Text, Animated } from 'react-native';
import { GestureDetector, Gesture, GestureHandlerRootView } from 'react-native-gesture-handler';
import {
    Canvas,
    Circle,
    Group,
    Blur,
    Line as SkiaLine,
    vec,
    Paint,
    Skia,
    Text as SkiaText,
    useFont,
} from '@shopify/react-native-skia';

import { getLocalSiderealTime, raDecToCartesian, getStarColorRGB, getStarSize } from '../utils/CelestialSphere';
import StarDetailsModal from './StarDetailsModal';

// Planet textures
const PlanetTextures = {
    mars: require('../assets/mars.png'),
    venus: require('../assets/venus.png'),
    jupiter: require('../assets/jupiter.png'),
    saturn: require('../assets/saturn.png'),
    mercury: require('../assets/mercury.png'),
    neptune: require('../assets/neptune.png'),
    uranus: require('../assets/uranus.png'),
    moon: require('../assets/moon.png'),
    sun: require('../assets/sun.png'),
};

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const CENTER_X = SCREEN_WIDTH / 2;
const CENTER_Y = SCREEN_HEIGHT / 2;
const CROSSHAIR_SIZE = 35;
const TAP_RADIUS = 40;

// FOV and zoom settings
const MIN_FOV = 20;
const MAX_FOV = 120;
const DEFAULT_FOV = 75;

// Default theme
const DEFAULT_THEME = {
    background: '#000',
    text: '#fff',
    accent: '#4fc3f7',
    constellation: '#6699cc',
};

// Spectral colors for GPU rendering
const SPECTRAL_COLORS = {
    'O': { r: 155, g: 176, b: 255 },
    'B': { r: 170, g: 196, b: 255 },
    'A': { r: 202, g: 215, b: 255 },
    'F': { r: 248, g: 247, b: 255 },
    'G': { r: 255, g: 244, b: 234 },
    'K': { r: 255, g: 210, b: 161 },
    'M': { r: 255, g: 204, b: 111 },
};

/**
 * Get magnitude limit based on FOV (optimized for A14)
 * More conservative limits for entry-level devices
 */
const getMagnitudeLimitForFOV = (fov) => {
    if (fov > 100) return 3.0;   // ~15 stars
    if (fov > 80) return 4.0;    // ~60 stars
    if (fov > 60) return 5.0;    // ~200 stars
    if (fov > 40) return 5.5;    // ~400 stars
    if (fov > 25) return 6.0;    // ~800 stars (good for A14)
    return 6.5;                   // Max ~1200 stars
};

/**
 * Get star color as Skia color
 */
const getSkiaColor = (spectralType, alpha = 1) => {
    const type = spectralType?.charAt(0)?.toUpperCase() || 'A';
    const { r, g, b } = SPECTRAL_COLORS[type] || { r: 255, g: 255, b: 255 };
    return Skia.Color(`rgba(${r}, ${g}, ${b}, ${alpha})`);
};

/**
 * Get star radius optimized for display
 */
const getStarRadius = (magnitude) => {
    const minRadius = 0.8;
    const maxRadius = 4;
    const normalized = (6 - Math.min(magnitude, 6)) / 7.5;
    return minRadius + Math.max(0, Math.min(1, normalized)) * (maxRadius - minRadius);
};

/**
 * Pre-compute star data
 */
const precomputeStars = (stars, magnitudeLimit) => {
    return stars
        .filter(star => star.magnitude <= magnitudeLimit)
        .map(star => {
            const { x, y, z } = raDecToCartesian(star.ra, star.dec);
            return {
                id: star.id,
                name: star.name,
                magnitude: star.magnitude,
                constellation: star.constellation,
                spectralType: star.spectralType,
                distance: star.distance,
                ra: star.ra,
                dec: star.dec,
                pos: { x, y, z },
                radius: getStarRadius(star.magnitude),
                data: star,
            };
        });
};

/**
 * Project 3D to screen with configurable FOV
 */
const project = (x, y, z, azimuth, altitude, lst, latitude, fov) => {
    const azRad = (-azimuth * Math.PI) / 180;
    const altRad = (altitude * Math.PI) / 180;
    const lstRad = (-lst * Math.PI) / 180;
    const latRad = ((90 - latitude) * Math.PI) / 180;
    const fovRad = (fov * Math.PI) / 180;

    // Rotate by LST
    const cosLst = Math.cos(lstRad);
    const sinLst = Math.sin(lstRad);
    const x1 = x * cosLst - y * sinLst;
    const y1 = x * sinLst + y * cosLst;
    const z1 = z;

    // Rotate by latitude
    const cosLat = Math.cos(latRad);
    const sinLat = Math.sin(latRad);
    const y2 = y1 * cosLat - z1 * sinLat;
    const z2 = y1 * sinLat + z1 * cosLat;

    // Rotate by azimuth
    const cosAz = Math.cos(azRad);
    const sinAz = Math.sin(azRad);
    const x3 = x1 * cosAz - y2 * sinAz;
    const y3 = x1 * sinAz + y2 * cosAz;

    // Rotate by altitude
    const cosAlt = Math.cos(altRad);
    const sinAlt = Math.sin(altRad);
    const y4 = y3 * cosAlt - z2 * sinAlt;
    const z4 = y3 * sinAlt + z2 * cosAlt;

    if (y4 <= 0.02) return null;

    const scale = SCREEN_WIDTH / (2 * Math.tan(fovRad / 2));
    const sx = CENTER_X + (x3 / y4) * scale;
    const sy = CENTER_Y - (z4 / y4) * scale;

    const margin = 50;
    if (sx < -margin || sx > SCREEN_WIDTH + margin ||
        sy < -margin || sy > SCREEN_HEIGHT + margin) {
        return null;
    }

    return { x: sx, y: sy, depth: y4 };
};

/**
 * Main StarMap Component with Skia GPU Rendering
 */
const StarMap = ({
    orientation = { azimuth: 180, altitude: 30 },
    location = { latitude: 28.6139, longitude: 77.209 },
    stars = [],
    constellations = [],
    planets = [],
    showConstellations = true,
    theme = DEFAULT_THEME,
    onTouchStart,
    onTouchMove,
    onTouchEnd,
    onMenuPress,
    onSearchPress,
    onSharePress,
    onCalibratePress,
    onGyroToggle,
    gyroEnabled = false,
    isCalibrated,
    targetObject,
    simulatedTime = null, // For time travel feature
}) => {
    // State
    const [fov, setFov] = useState(DEFAULT_FOV);
    const [lst, setLst] = useState(() => getLocalSiderealTime(new Date(), location.longitude));
    const [selectedStar, setSelectedStar] = useState(null);
    const [starLabel, setStarLabel] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [crosshairConstellation, setCrosshairConstellation] = useState(null);

    // Refs
    const lastTapTime = useRef(0);
    const labelTimeout = useRef(null);
    const initialPinchDistance = useRef(null);
    const initialFov = useRef(fov);

    // Magnitude limit for LOD
    const magnitudeLimit = useMemo(() => getMagnitudeLimitForFOV(fov), [fov]);

    // Pre-compute stars
    const precomputedStars = useMemo(() =>
        precomputeStars(stars, magnitudeLimit),
        [stars, magnitudeLimit]
    );

    // Update LST based on simulated time or current time
    useEffect(() => {
        const timeToUse = simulatedTime || new Date();
        setLst(getLocalSiderealTime(timeToUse, location.longitude));
    }, [location.longitude, simulatedTime]);

    // Project visible stars
    const visibleStars = useMemo(() => {
        const result = [];
        for (const star of precomputedStars) {
            const screen = project(
                star.pos.x, star.pos.y, star.pos.z,
                orientation.azimuth, orientation.altitude,
                lst, location.latitude, fov
            );
            if (screen) {
                result.push({
                    ...star,
                    screenX: screen.x,
                    screenY: screen.y,
                    depth: screen.depth,
                    color: getSkiaColor(star.spectralType),
                    glowColor: getSkiaColor(star.spectralType, 0.4),
                });
            }
        }
        return result.sort((a, b) => b.depth - a.depth);
    }, [precomputedStars, orientation.azimuth, orientation.altitude, lst, location.latitude, fov]);

    // Project planets
    const visiblePlanets = useMemo(() => {
        return planets.map(planet => {
            if (planet.ra === undefined || planet.dec === undefined) return null;
            const { x, y, z } = raDecToCartesian(planet.ra, planet.dec);
            const screen = project(
                x, y, z,
                orientation.azimuth, orientation.altitude,
                lst, location.latitude, fov
            );
            if (screen) {
                const baseSize = 16;
                const zoomFactor = Math.max(0.5, (DEFAULT_FOV / fov));
                return {
                    ...planet,
                    screenX: screen.x,
                    screenY: screen.y,
                    depth: screen.depth,
                    size: baseSize * zoomFactor,
                };
            }
            return null;
        }).filter(Boolean);
    }, [planets, orientation, lst, location, fov]);

    // Constellation lines
    const constellationLines = useMemo(() => {
        if (!showConstellations) return [];
        const lines = [];
        const starPositions = {};

        for (const star of visibleStars) {
            starPositions[star.id] = { x: star.screenX, y: star.screenY };
        }

        for (const star of precomputedStars) {
            if (!starPositions[star.id]) {
                const screen = project(
                    star.pos.x, star.pos.y, star.pos.z,
                    orientation.azimuth, orientation.altitude,
                    lst, location.latitude, fov
                );
                if (screen) {
                    starPositions[star.id] = { x: screen.x, y: screen.y };
                }
            }
        }

        for (const constellation of constellations) {
            if (!constellation.lines) continue;
            for (const [id1, id2] of constellation.lines) {
                const pos1 = starPositions[id1];
                const pos2 = starPositions[id2];
                if (pos1 && pos2) {
                    lines.push({ x1: pos1.x, y1: pos1.y, x2: pos2.x, y2: pos2.y });
                }
            }
        }
        return lines;
    }, [constellations, precomputedStars, visibleStars, showConstellations, orientation, lst, location, fov]);

    // Detect constellation under crosshair (center of screen)
    useEffect(() => {
        if (!showConstellations || constellations.length === 0) {
            setCrosshairConstellation(null);
            return;
        }

        // Build star positions map
        const starPositions = {};
        for (const star of visibleStars) {
            starPositions[star.id] = { x: star.screenX, y: star.screenY };
        }
        for (const star of precomputedStars) {
            if (!starPositions[star.id]) {
                const screen = project(
                    star.pos.x, star.pos.y, star.pos.z,
                    orientation.azimuth, orientation.altitude,
                    lst, location.latitude, fov
                );
                if (screen) {
                    starPositions[star.id] = { x: screen.x, y: screen.y };
                }
            }
        }

        // For each constellation, calculate its center and check distance to crosshair
        let closestConstellation = null;
        let closestDistance = Infinity;
        const DETECTION_RADIUS = 100; // Pixels from constellation center

        for (const constellation of constellations) {
            if (!constellation.lines || constellation.lines.length === 0) continue;

            // Collect all visible stars in this constellation
            const visibleConstellationStars = [];
            const allStarIds = new Set();

            for (const [id1, id2] of constellation.lines) {
                allStarIds.add(id1);
                allStarIds.add(id2);
            }

            for (const starId of allStarIds) {
                const pos = starPositions[starId];
                if (pos) {
                    visibleConstellationStars.push(pos);
                }
            }

            // Need at least 2 visible stars to detect constellation
            if (visibleConstellationStars.length < 2) continue;

            // Calculate center of constellation
            const centerX = visibleConstellationStars.reduce((sum, p) => sum + p.x, 0) / visibleConstellationStars.length;
            const centerY = visibleConstellationStars.reduce((sum, p) => sum + p.y, 0) / visibleConstellationStars.length;

            // Distance from crosshair (center of screen) to constellation center
            const dist = Math.sqrt((centerX - CENTER_X) ** 2 + (centerY - CENTER_Y) ** 2);

            // Check if crosshair is near this constellation
            if (dist < DETECTION_RADIUS && dist < closestDistance) {
                closestDistance = dist;
                closestConstellation = constellation;
            }
        }

        setCrosshairConstellation(closestConstellation);
    }, [constellations, precomputedStars, visibleStars, showConstellations, orientation, lst, location, fov]);

    // Handle tap on stars (defined before gesture handlers that use it)
    const handleTap = useCallback((x, y) => {
        const now = Date.now();
        const tapRadius = TAP_RADIUS * (DEFAULT_FOV / fov);

        // Find closest star
        let closestStar = null;
        let minDist = tapRadius;

        for (const star of visibleStars) {
            const dist = Math.sqrt((star.screenX - x) ** 2 + (star.screenY - y) ** 2);
            if (dist < minDist) {
                minDist = dist;
                closestStar = star;
            }
        }

        // Check planets too (they need closer tap - within their visual size)
        let closestPlanet = null;
        for (const planet of visiblePlanets) {
            const planetTapRadius = planet.size / 2 + 15; // Planet size + margin
            const dist = Math.sqrt((planet.screenX - x) ** 2 + (planet.screenY - y) ** 2);
            if (dist < planetTapRadius) {
                closestPlanet = planet;
                break;
            }
        }

        // Priority: planet > star > empty space
        if (closestPlanet) {
            setSelectedStar(closestPlanet);
            setShowModal(true);
            setStarLabel(null);
            lastTapTime.current = now;
            return;
        }

        if (closestStar) {
            // Check for double-tap (tap on already labeled star or quick successive tap)
            const isDoubleTap = (starLabel?.id === closestStar.id) ||
                (now - lastTapTime.current < 400 && lastTapTime.current > 0);

            if (isDoubleTap) {
                // Double tap - show modal
                setSelectedStar(closestStar);
                setShowModal(true);
                setStarLabel(null);
            } else {
                // Single tap - show label
                setStarLabel({
                    id: closestStar.id,
                    name: closestStar.name || closestStar.id,
                    x: closestStar.screenX,
                    y: closestStar.screenY,
                });

                // Auto-hide label after 4 seconds
                clearTimeout(labelTimeout.current);
                labelTimeout.current = setTimeout(() => setStarLabel(null), 4000);
            }
            lastTapTime.current = now;
        } else {
            // Tap on empty space - clear any label
            if (starLabel) {
                setStarLabel(null);
            }
            lastTapTime.current = 0;
        }
    }, [visibleStars, visiblePlanets, starLabel, fov]);

    // Track if we're pinching to prevent accidental taps
    const isPinching = useRef(false);

    // Gesture handlers using react-native-gesture-handler
    const pinchGesture = useMemo(() =>
        Gesture.Pinch()
            .onStart(() => {
                isPinching.current = true;
                initialFov.current = fov;
            })
            .onUpdate((e) => {
                // Only update if scale changed significantly
                if (Math.abs(e.scale - 1) > 0.01) {
                    const newFov = Math.max(MIN_FOV, Math.min(MAX_FOV, initialFov.current / e.scale));
                    setFov(newFov);
                }
            })
            .onEnd(() => {
                // Delay resetting to prevent tap from firing
                setTimeout(() => {
                    isPinching.current = false;
                }, 200);
            })
            .runOnJS(true),
        [fov]);

    const panGesture = useMemo(() =>
        Gesture.Pan()
            .onStart((e) => {
                onTouchStart?.(e.absoluteX, e.absoluteY);
            })
            .onUpdate((e) => {
                onTouchMove?.(e.absoluteX, e.absoluteY);
            })
            .onEnd(() => {
                onTouchEnd?.();
            })
            .runOnJS(true),
        [onTouchStart, onTouchMove, onTouchEnd]);

    const tapGesture = useMemo(() =>
        Gesture.Tap()
            .onEnd((e) => {
                // Don't fire tap if we were just pinching
                if (!isPinching.current) {
                    handleTap(e.x, e.y);
                }
            })
            .runOnJS(true),
        [handleTap]);

    // Combine gestures:
    // - Pinch has exclusive priority (when pinching, nothing else works)
    // - Pan and Tap run simultaneously (pan for drag, tap for selection)
    const panAndTap = Gesture.Simultaneous(panGesture, tapGesture);
    const composedGesture = Gesture.Race(pinchGesture, panAndTap);


    // Cleanup
    useEffect(() => {
        return () => clearTimeout(labelTimeout.current);
    }, []);

    return (
        <GestureHandlerRootView style={styles.container}>
            <GestureDetector gesture={composedGesture}>
                <View style={styles.container}>
                    {/* Dark space background */}
                    <View style={styles.background} />

                    {/* GPU-Accelerated Star Field */}
                    <Canvas style={styles.canvas}>
                        {/* Constellation lines */}
                        <Group>
                            {constellationLines.map((line, i) => (
                                <SkiaLine
                                    key={`line-${i}`}
                                    p1={vec(line.x1, line.y1)}
                                    p2={vec(line.x2, line.y2)}
                                    color="rgba(102, 153, 204, 0.3)"
                                    strokeWidth={0.8}
                                />
                            ))}
                        </Group>

                        {/* Stars with glow (GPU-accelerated) */}
                        <Group>
                            {visibleStars.map((star) => (
                                <Group key={star.id}>
                                    {/* Glow for bright stars (limited for performance) */}
                                    {star.magnitude < 1.5 && (
                                        <Circle
                                            cx={star.screenX}
                                            cy={star.screenY}
                                            r={star.radius * 4}
                                            color={star.glowColor}
                                        >
                                            <Blur blur={star.radius * 2} />
                                        </Circle>
                                    )}
                                    {/* Main star */}
                                    <Circle
                                        cx={star.screenX}
                                        cy={star.screenY}
                                        r={starLabel?.id === star.id ? star.radius * 1.5 : star.radius}
                                        color={starLabel?.id === star.id ? Skia.Color('#4fc3f7') : star.color}
                                    />
                                </Group>
                            ))}
                        </Group>

                        {/* Crosshair */}
                        <Circle
                            cx={CENTER_X}
                            cy={CENTER_Y}
                            r={CROSSHAIR_SIZE}
                            color="transparent"
                            style="stroke"
                            strokeWidth={1}
                        >
                            <Paint color="rgba(255,255,255,0.3)" />
                        </Circle>
                    </Canvas>

                    {/* Planets (using Image components for textures) */}
                    {visiblePlanets.map(planet => {
                        const texture = PlanetTextures[planet.id?.toLowerCase()] || PlanetTextures.mars;
                        const planetRadius = planet.size / 2;
                        return (
                            <TouchableOpacity
                                key={planet.id}
                                style={[
                                    styles.planet,
                                    {
                                        left: planet.screenX - planetRadius,
                                        top: planet.screenY - planetRadius,
                                        width: planet.size,
                                        height: planet.size,
                                        borderRadius: planetRadius,
                                    }
                                ]}
                                onPress={() => {
                                    setSelectedStar(planet);
                                    setShowModal(true);
                                }}
                            >
                                <Image
                                    source={texture}
                                    style={[styles.planetImage, { borderRadius: planetRadius }]}
                                />
                            </TouchableOpacity>
                        );
                    })}

                    {/* Star label */}
                    {starLabel && (
                        <View style={[styles.starLabel, { left: starLabel.x - 50, top: starLabel.y - 30 }]}>
                            <Text style={styles.starLabelText}>{starLabel.name}</Text>
                        </View>
                    )}

                    {/* UI Controls */}
                    <View style={styles.controls}>
                        <TouchableOpacity style={styles.controlButton} onPress={onMenuPress}>
                            <Text style={styles.controlIcon}>☰</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.controlButton} onPress={onSearchPress}>
                            <Text style={styles.controlIcon}>🔍</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.controlButton} onPress={onSharePress}>
                            <Text style={styles.controlIcon}>📤</Text>
                        </TouchableOpacity>
                        {/* Gyroscope Toggle Button */}
                        <TouchableOpacity
                            style={[
                                styles.controlButton,
                                gyroEnabled && styles.controlButtonActive
                            ]}
                            onPress={onGyroToggle}
                        >
                            <Text style={styles.controlIcon}>📱</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Gyro mode indicator */}
                    {gyroEnabled && (
                        <View style={styles.gyroIndicator}>
                            <Text style={styles.gyroText}>GYRO MODE</Text>
                            <Text style={styles.gyroHint}>Point at the sky</Text>
                        </View>
                    )}

                    {/* Zoom indicator */}
                    <View style={styles.zoomIndicator}>
                        <Text style={styles.zoomText}>{Math.round(fov)}°</Text>
                        <View style={styles.zoomBar}>
                            <View style={[styles.zoomFill, { height: `${((MAX_FOV - fov) / (MAX_FOV - MIN_FOV)) * 100}%` }]} />
                        </View>
                    </View>

                    {/* Constellation info - shows when crosshair is over a constellation */}
                    {crosshairConstellation && (
                        <View style={styles.constellationInfo}>
                            <View style={styles.constellationHeader}>
                                <Text style={styles.constellationName}>{crosshairConstellation.name}</Text>
                                <TouchableOpacity
                                    style={styles.infoButton}
                                    onPress={() => {
                                        setSelectedStar({
                                            ...crosshairConstellation,
                                            type: 'constellation'
                                        });
                                        setShowModal(true);
                                    }}
                                >
                                    <Text style={styles.infoButtonText}>ⓘ</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={styles.closeButton}
                                    onPress={() => setCrosshairConstellation(null)}
                                >
                                    <Text style={styles.closeButtonText}>✕</Text>
                                </TouchableOpacity>
                            </View>
                            <Text style={styles.constellationType}>Constellation, above horizon</Text>
                            {crosshairConstellation.meaning && (
                                <Text style={styles.constellationMeaning}>
                                    "{crosshairConstellation.meaning}"
                                </Text>
                            )}
                        </View>
                    )}

                    {/* Object info - only show when no constellation is selected */}
                    {!crosshairConstellation && (
                        <View style={styles.objectInfo}>
                            <Text style={styles.infoText}>
                                ⭐ {visibleStars.length} stars visible
                            </Text>
                        </View>
                    )}

                    {/* Star Details Modal */}
                    <StarDetailsModal
                        visible={showModal}
                        object={selectedStar}
                        onClose={() => {
                            setShowModal(false);
                            setSelectedStar(null);
                        }}
                        theme={theme}
                    />
                </View>
            </GestureDetector>
        </GestureHandlerRootView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
    background: {
        position: 'absolute',
        width: SCREEN_WIDTH,
        height: SCREEN_HEIGHT,
        opacity: 0.4,
    },
    canvas: {
        position: 'absolute',
        top: 0,
        left: 0,
        width: SCREEN_WIDTH,
        height: SCREEN_HEIGHT,
    },
    planet: {
        position: 'absolute',
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 50,
        overflow: 'hidden',
    },
    planetImage: {
        width: '100%',
        height: '100%',
        resizeMode: 'cover',
        borderRadius: 50,
    },
    starLabel: {
        position: 'absolute',
        backgroundColor: 'rgba(0,0,0,0.7)',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
        minWidth: 100,
        alignItems: 'center',
    },
    starLabelText: {
        color: '#4fc3f7',
        fontSize: 12,
        fontWeight: '600',
    },
    controls: {
        position: 'absolute',
        right: 20,
        top: SCREEN_HEIGHT / 2 - 80,
        gap: 16,
    },
    controlButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    controlButtonActive: {
        backgroundColor: 'rgba(79, 195, 247, 0.8)',
        borderWidth: 2,
        borderColor: '#4fc3f7',
    },
    controlIcon: {
        fontSize: 20,
    },
    gyroIndicator: {
        position: 'absolute',
        top: 60,
        alignSelf: 'center',
        backgroundColor: 'rgba(79, 195, 247, 0.2)',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#4fc3f7',
        alignItems: 'center',
    },
    gyroText: {
        color: '#4fc3f7',
        fontSize: 12,
        fontWeight: '700',
        letterSpacing: 1,
    },
    gyroHint: {
        color: 'rgba(255,255,255,0.6)',
        fontSize: 10,
        marginTop: 2,
    },
    zoomIndicator: {
        position: 'absolute',
        left: 20,
        top: SCREEN_HEIGHT / 2 - 60,
        alignItems: 'center',
    },
    zoomText: {
        color: 'rgba(255,255,255,0.6)',
        fontSize: 11,
        marginBottom: 8,
    },
    zoomBar: {
        width: 4,
        height: 100,
        backgroundColor: 'rgba(255,255,255,0.2)',
        borderRadius: 2,
    },
    zoomFill: {
        width: '100%',
        backgroundColor: '#4fc3f7',
        borderRadius: 2,
    },
    objectInfo: {
        position: 'absolute',
        bottom: 40,
        left: 20,
        backgroundColor: 'rgba(0,0,0,0.5)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
    },
    infoText: {
        color: 'rgba(255,255,255,0.7)',
        fontSize: 12,
    },
    // Constellation info panel (like SkyView)
    constellationInfo: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: 'rgba(20, 20, 30, 0.95)',
        paddingHorizontal: 20,
        paddingVertical: 16,
        paddingBottom: 30,
        borderTopLeftRadius: 16,
        borderTopRightRadius: 16,
    },
    constellationHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4,
    },
    constellationName: {
        color: '#4fc3f7',
        fontSize: 22,
        fontWeight: '600',
        flex: 1,
    },
    constellationType: {
        color: 'rgba(255,255,255,0.6)',
        fontSize: 14,
        marginBottom: 6,
    },
    constellationMeaning: {
        color: 'rgba(255,255,255,0.5)',
        fontSize: 13,
        fontStyle: 'italic',
    },
    infoButton: {
        width: 32,
        height: 32,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#4fc3f7',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    infoButtonText: {
        color: '#4fc3f7',
        fontSize: 16,
    },
    closeButton: {
        width: 32,
        height: 32,
        justifyContent: 'center',
        alignItems: 'center',
    },
    closeButtonText: {
        color: 'rgba(255,255,255,0.6)',
        fontSize: 20,
    },
});

export default memo(StarMap);

