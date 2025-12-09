/**
 * Optimized Star Map Component
 * Uses batched SVG rendering with memoization for performance
 * Applies pre-computed celestial sphere calculations
 */

import React, { useMemo, useCallback, memo } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Svg, { Circle, Line, Text as SvgText, G, Defs, RadialGradient, Stop } from 'react-native-svg';

import { getLocalSiderealTime, raDecToCartesian, getStarColorRGB, getStarSize } from '../utils/CelestialSphere';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const FIELD_OF_VIEW = 60;
const FOV_RAD = (FIELD_OF_VIEW * Math.PI) / 180;

/**
 * Pre-compute star 3D positions (only once when stars change)
 */
const precomputeStarPositions = (stars) => {
    return stars.map(star => {
        const { x, y, z } = raDecToCartesian(star.ra, star.dec);
        const color = getStarColorRGB(star.spectralType);
        const size = getStarSize(star.magnitude);
        return {
            ...star,
            pos3d: { x, y, z },
            colorHex: `rgb(${Math.round(color.r * 255)}, ${Math.round(color.g * 255)}, ${Math.round(color.b * 255)})`,
            radius: size * 0.5,
        };
    });
};

/**
 * Transform 3D position to screen coordinates
 * All rotation is applied via matrix operations for efficiency
 */
const projectToScreen = (x, y, z, azimuth, altitude, lst, latitude) => {
    // Convert angles to radians
    const azRad = (-azimuth * Math.PI) / 180;
    const altRad = ((altitude - 90) * Math.PI) / 180;
    const lstRad = (-lst * Math.PI) / 180;
    const latRad = ((90 - latitude) * Math.PI) / 180;

    // Apply sidereal rotation (Earth's rotation)
    const cosLst = Math.cos(lstRad);
    const sinLst = Math.sin(lstRad);
    let x1 = x * cosLst - y * sinLst;
    let y1 = x * sinLst + y * cosLst;
    let z1 = z;

    // Apply latitude rotation
    const cosLat = Math.cos(latRad);
    const sinLat = Math.sin(latRad);
    let x2 = x1;
    let y2 = y1 * cosLat - z1 * sinLat;
    let z2 = y1 * sinLat + z1 * cosLat;

    // Apply device azimuth rotation
    const cosAz = Math.cos(azRad);
    const sinAz = Math.sin(azRad);
    let x3 = x2 * cosAz - y2 * sinAz;
    let y3 = x2 * sinAz + y2 * cosAz;
    let z3 = z2;

    // Apply device altitude rotation
    const cosAlt = Math.cos(altRad);
    const sinAlt = Math.sin(altRad);
    let x4 = x3;
    let y4 = y3 * cosAlt - z3 * sinAlt;
    let z4 = y3 * sinAlt + z3 * cosAlt;

    // Only show if in front of camera
    if (y4 <= 0.01) {
        return null;
    }

    // Perspective projection
    const scale = SCREEN_WIDTH / (2 * Math.tan(FOV_RAD / 2));
    const screenX = SCREEN_WIDTH / 2 + (x4 / y4) * scale;
    const screenY = SCREEN_HEIGHT / 2 - (z4 / y4) * scale;

    // Check bounds
    const margin = 50;
    if (screenX < -margin || screenX > SCREEN_WIDTH + margin ||
        screenY < -margin || screenY > SCREEN_HEIGHT + margin) {
        return null;
    }

    return { x: screenX, y: screenY, depth: y4 };
};

/**
 * Memoized Star component for individual stars
 */
const Star = memo(({ x, y, radius, color, isSelected, onPress }) => (
    <Circle
        cx={x}
        cy={y}
        r={radius}
        fill={color}
        opacity={0.95}
        onPress={onPress}
    />
));

/**
 * Main StarMap Component - Optimized SVG with batched calculations
 */
const StarMap = ({
    orientation,
    location,
    stars = [],
    constellations = [],
    planets = [],
    starMap = {},
    onSelectObject,
    selectedObject,
    showConstellations = true,
    showLabels = true,
    theme,
}) => {
    // Pre-compute star 3D positions (memoized)
    const precomputedStars = useMemo(() => {
        return precomputeStarPositions(stars);
    }, [stars]);

    // Calculate LST once per frame
    const lst = useMemo(() => {
        return getLocalSiderealTime(new Date(), location.longitude);
    }, [location.longitude, Math.floor(Date.now() / 1000)]); // Update every second

    // Project all visible stars to screen coordinates
    const visibleStars = useMemo(() => {
        return precomputedStars.map(star => {
            const pos = projectToScreen(
                star.pos3d.x,
                star.pos3d.y,
                star.pos3d.z,
                orientation.azimuth,
                orientation.altitude,
                lst,
                location.latitude
            );

            if (!pos) return null;

            return {
                ...star,
                screenX: pos.x,
                screenY: pos.y,
                depth: pos.depth,
            };
        }).filter(Boolean).sort((a, b) => b.depth - a.depth); // Render back-to-front
    }, [precomputedStars, orientation.azimuth, orientation.altitude, lst, location.latitude]);

    // Project constellation lines
    const constellationLines = useMemo(() => {
        if (!showConstellations) return [];

        const lines = [];

        constellations.forEach(constellation => {
            if (!constellation.lines) return;

            constellation.lines.forEach(([star1Id, star2Id]) => {
                const star1 = starMap[star1Id];
                const star2 = starMap[star2Id];

                if (!star1 || !star2) return;

                const pos3d1 = raDecToCartesian(star1.ra, star1.dec);
                const pos3d2 = raDecToCartesian(star2.ra, star2.dec);

                const screen1 = projectToScreen(
                    pos3d1.x, pos3d1.y, pos3d1.z,
                    orientation.azimuth, orientation.altitude,
                    lst, location.latitude
                );
                const screen2 = projectToScreen(
                    pos3d2.x, pos3d2.y, pos3d2.z,
                    orientation.azimuth, orientation.altitude,
                    lst, location.latitude
                );

                if (screen1 || screen2) {
                    lines.push({
                        x1: screen1?.x ?? screen2.x,
                        y1: screen1?.y ?? screen2.y,
                        x2: screen2?.x ?? screen1.x,
                        y2: screen2?.y ?? screen1.y,
                    });
                }
            });
        });

        return lines;
    }, [constellations, starMap, orientation.azimuth, orientation.altitude, lst, location.latitude, showConstellations]);

    // Project planets
    const visiblePlanets = useMemo(() => {
        return planets.map(planet => {
            if (!planet.ra) return null;

            const pos3d = raDecToCartesian(planet.ra, planet.dec);
            const screen = projectToScreen(
                pos3d.x, pos3d.y, pos3d.z,
                orientation.azimuth, orientation.altitude,
                lst, location.latitude
            );

            if (!screen) return null;

            return {
                ...planet,
                screenX: screen.x,
                screenY: screen.y,
            };
        }).filter(Boolean);
    }, [planets, orientation.azimuth, orientation.altitude, lst, location.latitude]);

    // Handlers
    const handleStarPress = useCallback((star) => {
        if (onSelectObject) {
            onSelectObject({ type: 'star', ...star });
        }
    }, [onSelectObject]);

    const handlePlanetPress = useCallback((planet) => {
        if (onSelectObject) {
            onSelectObject({ type: 'planet', ...planet });
        }
    }, [onSelectObject]);

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            <Svg width={SCREEN_WIDTH} height={SCREEN_HEIGHT}>
                {/* Constellation lines - render first (behind stars) */}
                <G>
                    {constellationLines.map((line, idx) => (
                        <Line
                            key={`line-${idx}`}
                            x1={line.x1}
                            y1={line.y1}
                            x2={line.x2}
                            y2={line.y2}
                            stroke={theme.constellation || '#334466'}
                            strokeWidth={1}
                            opacity={0.5}
                        />
                    ))}
                </G>

                {/* Stars - batched render */}
                <G>
                    {visibleStars.map((star) => (
                        <Circle
                            key={star.id}
                            cx={star.screenX}
                            cy={star.screenY}
                            r={star.radius}
                            fill={star.colorHex}
                            opacity={0.95}
                            onPress={() => handleStarPress(star)}
                        />
                    ))}
                </G>

                {/* Star labels for bright stars */}
                {showLabels && (
                    <G>
                        {visibleStars
                            .filter(star => star.magnitude < 1.5 && star.name)
                            .map(star => (
                                <SvgText
                                    key={`label-${star.id}`}
                                    x={star.screenX + star.radius + 5}
                                    y={star.screenY + 4}
                                    fill={theme.textSecondary || '#888888'}
                                    fontSize={10}
                                >
                                    {star.name}
                                </SvgText>
                            ))
                        }
                    </G>
                )}

                {/* Planets */}
                <G>
                    {visiblePlanets.map((planet) => (
                        <G key={planet.id}>
                            <Circle
                                cx={planet.screenX}
                                cy={planet.screenY}
                                r={6}
                                fill={planet.color}
                                onPress={() => handlePlanetPress(planet)}
                            />
                            {showLabels && (
                                <SvgText
                                    x={planet.screenX + 10}
                                    y={planet.screenY + 4}
                                    fill={planet.color}
                                    fontSize={11}
                                    fontWeight="bold"
                                >
                                    {planet.name}
                                </SvgText>
                            )}
                        </G>
                    ))}
                </G>
            </Svg>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
});

export default memo(StarMap);
