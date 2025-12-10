/**
 * Enhanced Star Map with Dynamic LOD Loading
 * Features:
 * - Pinch-to-zoom with dynamic star density
 * - Tap on star to show name label
 * - Click to open detailed modal
 * - Smart culling based on field of view
 */

import React, { useMemo, useCallback, useState, useEffect, useRef } from 'react';
import { View, StyleSheet, Dimensions, Image, TouchableOpacity, Text, PanResponder, Animated } from 'react-native';
import Svg, { Circle, Line, G, Defs, RadialGradient, Stop, Text as SvgText, Rect } from 'react-native-svg';

import { getLocalSiderealTime, raDecToCartesian, getStarColorRGB, getStarSize } from '../utils/CelestialSphere';
import StarDetailsModal from './StarDetailsModal';

// Background
const MilkyWayBg = require('../assets/milkyway.png');

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
const TAP_RADIUS = 40; // Radius for star selection on tap

// FOV and zoom settings
const MIN_FOV = 20;   // Max zoom in
const MAX_FOV = 120;  // Max zoom out
const DEFAULT_FOV = 75;

// Default theme
const DEFAULT_THEME = {
    background: '#000',
    text: '#fff',
    accent: '#4fc3f7',
    constellation: '#6699cc',
};

/**
 * Get magnitude limit based on FOV (Level of Detail)
 * Wider FOV = show fewer bright stars
 * Narrower FOV (zoomed in) = show more fainter stars
 */
const getMagnitudeLimitForFOV = (fov) => {
    if (fov > 100) return 3.0;   // Very wide - only brightest stars (~15)
    if (fov > 80) return 4.0;    // Wide - bright stars (~60)
    if (fov > 60) return 5.0;    // Normal - visible stars (~200)
    if (fov > 40) return 6.0;    // Zoomed - all naked eye (~1000)
    if (fov > 25) return 7.0;    // More zoomed - binocular visible
    return 8.0;                   // Max zoom - many stars
};

/**
 * Pre-compute star data with LOD filtering
 */
const precomputeStars = (stars, magnitudeLimit) => {
    return stars
        .filter(star => star.magnitude <= magnitudeLimit)
        .map(star => {
            const { x, y, z } = raDecToCartesian(star.ra, star.dec);
            const color = getStarColorRGB(star.spectralType);
            const size = getStarSize(star.magnitude);
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
                color: `rgb(${Math.round(color.r * 255)}, ${Math.round(color.g * 255)}, ${Math.round(color.b * 255)})`,
                radius: Math.max(1.2, size * 0.6),
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

    const cosLst = Math.cos(lstRad), sinLst = Math.sin(lstRad);
    let x1 = x * cosLst - y * sinLst;
    let y1 = x * sinLst + y * cosLst;
    let z1 = z;

    const cosLat = Math.cos(latRad), sinLat = Math.sin(latRad);
    let y2 = y1 * cosLat - z1 * sinLat;
    let z2 = y1 * sinLat + z1 * cosLat;

    const cosAz = Math.cos(azRad), sinAz = Math.sin(azRad);
    let x3 = x1 * cosAz - y2 * sinAz;
    let y3 = x1 * sinAz + y2 * cosAz;

    const cosAlt = Math.cos(altRad), sinAlt = Math.sin(altRad);
    let y4 = y3 * cosAlt - z2 * sinAlt;
    let z4 = y3 * sinAlt + z2 * cosAlt;

    if (y4 <= 0.02) return null;

    const scale = SCREEN_WIDTH / (2 * Math.tan(fovRad / 2));
    const sx = CENTER_X + (x3 / y4) * scale;
    const sy = CENTER_Y - (z4 / y4) * scale;

    if (sx < -100 || sx > SCREEN_WIDTH + 100 || sy < -100 || sy > SCREEN_HEIGHT + 100) {
        return null;
    }

    return { x: sx, y: sy, depth: y4 };
};

/**
 * Crosshair
 */
const Crosshair = ({ theme }) => (
    <G>
        <Circle cx={CENTER_X} cy={CENTER_Y} r={CROSSHAIR_SIZE} stroke="rgba(255,255,255,0.3)" strokeWidth={1} fill="none" />
    </G>
);

/**
 * Star Name Label (appears on tap)
 */
const StarLabel = ({ star, theme }) => {
    if (!star || !star.showLabel) return null;

    const labelWidth = (star.name?.length || 5) * 8 + 16;

    return (
        <G>
            {/* Label background */}
            <Rect
                x={star.x - labelWidth / 2}
                y={star.y - star.radius - 28}
                width={labelWidth}
                height={22}
                rx={11}
                fill="rgba(0,0,0,0.7)"
            />
            {/* Label text */}
            <SvgText
                x={star.x}
                y={star.y - star.radius - 13}
                fill={theme.accent}
                fontSize={12}
                fontWeight="600"
                textAnchor="middle"
            >
                {star.name}
            </SvgText>
            {/* Connector line */}
            <Line
                x1={star.x}
                y1={star.y - star.radius - 6}
                x2={star.x}
                y2={star.y - star.radius - 2}
                stroke={theme.accent}
                strokeWidth={1}
            />
        </G>
    );
};

/**
 * Object Info (bottom left) - minimal version
 */
const ObjectInfo = ({ object, starCount, fov, theme }) => {
    return (
        <View style={styles.objectInfo}>
            {object ? (
                <>
                    <Text style={[styles.objectName, { color: theme.accent }]}>{object.name || object.id}</Text>
                    <Text style={styles.objectDescription}>
                        {object.type === 'planet'
                            ? 'Tap for details'
                            : `Mag ${object.magnitude?.toFixed(1)} • Tap for details`
                        }
                    </Text>
                </>
            ) : (
                <Text style={styles.objectDescription}>
                    {starCount} stars visible • FOV {fov.toFixed(0)}°
                </Text>
            )}
        </View>
    );
};

/**
 * Zoom Indicator
 */
const ZoomIndicator = ({ fov }) => {
    const zoomLevel = Math.round((MAX_FOV - fov) / (MAX_FOV - MIN_FOV) * 100);

    return (
        <View style={styles.zoomIndicator}>
            <View style={styles.zoomBar}>
                <View style={[styles.zoomFill, { height: `${zoomLevel}%` }]} />
            </View>
            <Text style={styles.zoomText}>{zoomLevel > 50 ? '🔭' : '👁️'}</Text>
        </View>
    );
};

/**
 * Main StarMap Component
 */
const StarMap = ({
    orientation,
    location,
    stars = [],
    constellations = [],
    planets = [],
    onSelectObject,
    showConstellations = true,
    theme = DEFAULT_THEME,
    onTouchStart,
    onTouchMove,
    onTouchEnd,
    onMenuPress,
    onSearchPress,
    onSharePress,
    onCalibratePress,
    gyroEnabled = false,
    isCalibrated = false,
}) => {
    // State
    const [fov, setFov] = useState(DEFAULT_FOV);
    const [labeledStars, setLabeledStars] = useState({}); // {starId: true} for stars with labels
    const [selectedObjectForModal, setSelectedObjectForModal] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [selectedObject, setSelectedObject] = useState(null);

    // Pinch gesture tracking
    const lastPinchDistance = useRef(null);
    const tapStartTime = useRef(null);
    const tapStartPosition = useRef(null);

    // Get magnitude limit based on current FOV
    const magnitudeLimit = useMemo(() => getMagnitudeLimitForFOV(fov), [fov]);

    // Pre-compute stars with LOD filtering
    const precomputed = useMemo(() => precomputeStars(stars, magnitudeLimit), [stars, magnitudeLimit]);

    // LST
    const [lst, setLst] = useState(() => getLocalSiderealTime(new Date(), location.longitude));
    useEffect(() => {
        const interval = setInterval(() => {
            setLst(getLocalSiderealTime(new Date(), location.longitude));
        }, 2000);
        return () => clearInterval(interval);
    }, [location.longitude]);

    // Calculate distance between two touch points
    const getDistance = (touches) => {
        if (touches.length < 2) return null;
        const dx = touches[0].pageX - touches[1].pageX;
        const dy = touches[0].pageY - touches[1].pageY;
        return Math.sqrt(dx * dx + dy * dy);
    };

    // Find star near tap position
    const findStarNearPosition = useCallback((x, y, starsList) => {
        let closest = null;
        let minDist = TAP_RADIUS;

        for (const star of starsList) {
            const dist = Math.sqrt((star.x - x) ** 2 + (star.y - y) ** 2);
            if (dist < minDist) {
                minDist = dist;
                closest = star;
            }
        }
        return closest;
    }, []);

    // Pan and pinch gesture responder
    const panResponder = useMemo(() => PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,

        onPanResponderGrant: (evt) => {
            const touches = evt.nativeEvent.touches;
            tapStartTime.current = Date.now();
            tapStartPosition.current = { x: evt.nativeEvent.pageX, y: evt.nativeEvent.pageY };

            if (touches.length === 2) {
                lastPinchDistance.current = getDistance(touches);
            } else {
                onTouchStart?.(evt.nativeEvent.pageX, evt.nativeEvent.pageY);
            }
        },

        onPanResponderMove: (evt) => {
            const touches = evt.nativeEvent.touches;

            if (touches.length === 2) {
                // Pinch to zoom
                const currentDistance = getDistance(touches);
                if (lastPinchDistance.current && currentDistance) {
                    const scale = currentDistance / lastPinchDistance.current;
                    setFov(prevFov => {
                        const newFov = prevFov / scale;
                        return Math.min(MAX_FOV, Math.max(MIN_FOV, newFov));
                    });
                    lastPinchDistance.current = currentDistance;
                }
            } else {
                // Pan
                onTouchMove?.(evt.nativeEvent.pageX, evt.nativeEvent.pageY);
            }
        },

        onPanResponderRelease: (evt) => {
            const tapDuration = Date.now() - tapStartTime.current;
            const tapEnd = { x: evt.nativeEvent.pageX, y: evt.nativeEvent.pageY };
            const tapDistance = tapStartPosition.current
                ? Math.sqrt((tapEnd.x - tapStartPosition.current.x) ** 2 + (tapEnd.y - tapStartPosition.current.y) ** 2)
                : 0;

            // Detect tap (short duration, small movement)
            if (tapDuration < 300 && tapDistance < 20) {
                // Handle tap - find star at position
                const tappedStar = findStarNearPosition(tapEnd.x, tapEnd.y, visibleStars);
                if (tappedStar) {
                    // First tap: show label, second tap: open modal
                    if (labeledStars[tappedStar.id]) {
                        // Open modal
                        setSelectedObjectForModal({ ...tappedStar, type: 'star' });
                        setShowModal(true);
                    } else {
                        // Show label
                        setLabeledStars(prev => ({ ...prev, [tappedStar.id]: true }));
                        setSelectedObject({ ...tappedStar, type: 'star' });
                        // Auto-hide label after 5 seconds
                        setTimeout(() => {
                            setLabeledStars(prev => {
                                const next = { ...prev };
                                delete next[tappedStar.id];
                                return next;
                            });
                        }, 5000);
                    }
                } else {
                    // Check for planet tap
                    const tappedPlanet = visiblePlanets.find(p => {
                        const dist = Math.sqrt((p.x - tapEnd.x) ** 2 + (p.y - tapEnd.y) ** 2);
                        return dist < 40;
                    });
                    if (tappedPlanet) {
                        setSelectedObjectForModal({ ...tappedPlanet, type: 'planet' });
                        setShowModal(true);
                    }
                }
            }

            lastPinchDistance.current = null;
            tapStartTime.current = null;
            tapStartPosition.current = null;
            onTouchEnd?.();
        },

        onPanResponderTerminate: () => {
            lastPinchDistance.current = null;
            onTouchEnd?.();
        },
    }), [onTouchStart, onTouchMove, onTouchEnd, findStarNearPosition, labeledStars]);

    // Project visible stars
    const visibleStars = useMemo(() => {
        const result = [];
        for (const star of precomputed) {
            const pos = project(star.pos.x, star.pos.y, star.pos.z, orientation.azimuth, orientation.altitude, lst, location.latitude, fov);
            if (pos) {
                const dx = pos.x - CENTER_X;
                const dy = pos.y - CENTER_Y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                result.push({
                    ...star,
                    x: pos.x,
                    y: pos.y,
                    depth: pos.depth,
                    distFromCenter: dist,
                    showLabel: labeledStars[star.id] || false,
                });
            }
        }
        return result.sort((a, b) => b.depth - a.depth);
    }, [precomputed, orientation.azimuth, orientation.altitude, lst, location.latitude, fov, labeledStars]);

    // Find object under crosshair
    useEffect(() => {
        let closest = null;
        let minDist = 60;

        for (const star of visibleStars) {
            if (star.distFromCenter < minDist && star.name) {
                minDist = star.distFromCenter;
                closest = { ...star, type: 'star' };
            }
        }

        setSelectedObject(closest);
    }, [visibleStars]);

    // Constellation lines
    const constellationLines = useMemo(() => {
        if (!showConstellations) return [];
        const lines = [];
        const cache = {};
        for (const star of precomputed) {
            const pos = project(star.pos.x, star.pos.y, star.pos.z, orientation.azimuth, orientation.altitude, lst, location.latitude, fov);
            if (pos) cache[star.id] = pos;
        }
        for (const c of constellations) {
            if (!c.lines) continue;
            for (const [id1, id2] of c.lines) {
                if (cache[id1] && cache[id2]) {
                    lines.push({ x1: cache[id1].x, y1: cache[id1].y, x2: cache[id2].x, y2: cache[id2].y, key: `${id1}-${id2}` });
                }
            }
        }
        return lines;
    }, [constellations, precomputed, orientation.azimuth, orientation.altitude, lst, location.latitude, showConstellations, fov]);

    // Visible planets
    const visiblePlanets = useMemo(() => {
        return planets.map(planet => {
            if (!planet.ra) return null;
            const pos3d = raDecToCartesian(planet.ra, planet.dec);
            const pos = project(pos3d.x, pos3d.y, pos3d.z, orientation.azimuth, orientation.altitude, lst, location.latitude, fov);
            if (!pos) return null;
            return { ...planet, x: pos.x, y: pos.y };
        }).filter(Boolean);
    }, [planets, orientation.azimuth, orientation.altitude, lst, location.latitude, fov]);

    // Background offset
    const bgOffsetX = -(orientation.azimuth / 360) * SCREEN_WIDTH * 2;

    // Close modal
    const handleCloseModal = useCallback(() => {
        setShowModal(false);
        setSelectedObjectForModal(null);
    }, []);

    return (
        <View style={styles.container} {...panResponder.panHandlers}>
            {/* Milky Way Background */}
            <Image source={MilkyWayBg} style={[styles.background, { transform: [{ translateX: bgOffsetX }] }]} resizeMode="cover" />

            {/* Star Field */}
            <Svg width={SCREEN_WIDTH} height={SCREEN_HEIGHT} style={styles.starField}>
                <Defs>
                    <RadialGradient id="starGlow" cx="50%" cy="50%" r="50%">
                        <Stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
                        <Stop offset="50%" stopColor="#ffffff" stopOpacity="0.5" />
                        <Stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
                    </RadialGradient>
                </Defs>

                {/* Constellation lines */}
                <G opacity={0.3}>
                    {constellationLines.map(line => (
                        <Line key={line.key} x1={line.x1} y1={line.y1} x2={line.x2} y2={line.y2} stroke="#6699cc" strokeWidth={0.8} />
                    ))}
                </G>

                {/* Stars */}
                <G>
                    {visibleStars.map(star => (
                        <G key={star.id}>
                            {/* Glow for bright stars */}
                            {star.magnitude < 2 && (
                                <Circle cx={star.x} cy={star.y} r={star.radius * 4} fill="url(#starGlow)" opacity={0.4} />
                            )}
                            {/* Star circle - slightly larger when labeled */}
                            <Circle
                                cx={star.x}
                                cy={star.y}
                                r={star.showLabel ? star.radius * 1.8 : star.radius}
                                fill={star.showLabel ? theme.accent : star.color}
                            />
                        </G>
                    ))}
                </G>

                {/* Star Labels */}
                <G>
                    {visibleStars.filter(s => s.showLabel && s.name).map(star => (
                        <StarLabel key={`label-${star.id}`} star={star} theme={theme} />
                    ))}
                </G>

                {/* Crosshair */}
                <Crosshair theme={theme} />
            </Svg>

            {/* Planets as Images */}
            {visiblePlanets.map(planet => {
                const texture = PlanetTextures[planet.id];
                const baseSize = planet.id === 'sun' ? 50 : planet.id === 'jupiter' ? 35 : 25;
                // Scale planet size with zoom
                const size = baseSize * (DEFAULT_FOV / fov);
                return (
                    <TouchableOpacity
                        key={planet.id}
                        style={[styles.planet, { left: planet.x - size / 2, top: planet.y - size / 2 }]}
                        onPress={() => {
                            setSelectedObjectForModal({ ...planet, type: 'planet' });
                            setShowModal(true);
                        }}
                        activeOpacity={0.8}
                    >
                        {texture ? (
                            <Image source={texture} style={{ width: size, height: size, borderRadius: size / 2 }} />
                        ) : (
                            <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: planet.color || '#fff' }} />
                        )}
                    </TouchableOpacity>
                );
            })}

            {/* Object Info */}
            <ObjectInfo object={selectedObject} starCount={visibleStars.length} fov={fov} theme={theme} />

            {/* Zoom Indicator */}
            <ZoomIndicator fov={fov} />

            {/* Side Buttons */}
            <View style={styles.sideButtons}>
                <TouchableOpacity style={styles.sideButton} onPress={onMenuPress}>
                    <Text style={styles.sideButtonIcon}>☰</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.sideButton} onPress={onSearchPress}>
                    <Text style={styles.sideButtonIcon}>🔍</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.sideButton} onPress={onSharePress}>
                    <Text style={styles.sideButtonIcon}>↗</Text>
                </TouchableOpacity>
            </View>

            {/* Gyro/Calibrate Button */}
            <TouchableOpacity style={[styles.calibrateButton, gyroEnabled && styles.calibrateActive]} onPress={onCalibratePress}>
                <Text style={styles.calibrateText}>{gyroEnabled ? (isCalibrated ? '✓ Calibrated' : '⟳ Calibrate') : '📱 Gyro Off'}</Text>
            </TouchableOpacity>

            {/* Star Details Modal */}
            <StarDetailsModal
                visible={showModal}
                object={selectedObjectForModal}
                onClose={handleCloseModal}
                theme={theme}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#000' },
    background: { position: 'absolute', width: SCREEN_WIDTH * 3, height: SCREEN_HEIGHT, opacity: 0.6 },
    starField: { position: 'absolute', top: 0, left: 0 },
    planet: { position: 'absolute' },
    objectInfo: { position: 'absolute', bottom: 80, left: 20 },
    objectName: { fontSize: 24, fontWeight: '600' },
    objectDescription: { color: 'rgba(255,255,255,0.7)', fontSize: 14, marginTop: 4 },
    sideButtons: { position: 'absolute', right: 20, top: SCREEN_HEIGHT / 2 - 80, gap: 25 },
    sideButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center' },
    sideButtonIcon: { fontSize: 20, color: 'rgba(255,255,255,0.8)' },
    calibrateButton: { position: 'absolute', bottom: 30, alignSelf: 'center', backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20 },
    calibrateActive: { backgroundColor: 'rgba(79, 195, 247, 0.3)' },
    calibrateText: { color: '#fff', fontSize: 14, fontWeight: '500' },
    zoomIndicator: {
        position: 'absolute',
        left: 20,
        top: SCREEN_HEIGHT / 2 - 60,
        alignItems: 'center',
        gap: 8,
    },
    zoomBar: {
        width: 6,
        height: 100,
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderRadius: 3,
        overflow: 'hidden',
        justifyContent: 'flex-end',
    },
    zoomFill: {
        width: '100%',
        backgroundColor: '#4fc3f7',
        borderRadius: 3,
    },
    zoomText: {
        fontSize: 16,
    },
});

export default React.memo(StarMap);
