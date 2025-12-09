/**
 * High-Performance Star Map with Center Crosshair
 * Uses imperative updates to avoid React re-renders
 */

import React, { useEffect, useRef, useMemo, useCallback, useState } from 'react';
import { View, StyleSheet, Dimensions, Animated } from 'react-native';
import Svg, { Circle, Line, G, Rect, Path, Text as SvgText } from 'react-native-svg';

import { getLocalSiderealTime, raDecToCartesian, getStarColorRGB, getStarSize } from '../utils/CelestialSphere';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const CENTER_X = SCREEN_WIDTH / 2;
const CENTER_Y = SCREEN_HEIGHT / 2;
const FIELD_OF_VIEW = 75;
const FOV_RAD = (FIELD_OF_VIEW * Math.PI) / 180;
const CROSSHAIR_SIZE = 40;
const HOVER_RADIUS = 50; // Pixels from center to highlight

// Animated components
const AnimatedG = Animated.createAnimatedComponent(G);

/**
 * Pre-compute star data
 */
const precomputeStars = (stars) => {
    return stars.map(star => {
        const { x, y, z } = raDecToCartesian(star.ra, star.dec);
        const color = getStarColorRGB(star.spectralType);
        const size = getStarSize(star.magnitude);
        return {
            id: star.id,
            name: star.name,
            magnitude: star.magnitude,
            pos: { x, y, z },
            color: `rgb(${Math.round(color.r * 255)}, ${Math.round(color.g * 255)}, ${Math.round(color.b * 255)})`,
            radius: Math.max(1.5, size * 0.7),
            data: star,
        };
    });
};

/**
 * Project 3D to screen
 */
const project = (x, y, z, azimuth, altitude, lst, latitude) => {
    const azRad = (-azimuth * Math.PI) / 180;
    const altRad = ((altitude - 90) * Math.PI) / 180;
    const lstRad = (-lst * Math.PI) / 180;
    const latRad = ((90 - latitude) * Math.PI) / 180;

    // Sidereal rotation
    const cosLst = Math.cos(lstRad), sinLst = Math.sin(lstRad);
    let x1 = x * cosLst - y * sinLst;
    let y1 = x * sinLst + y * cosLst;
    let z1 = z;

    // Latitude rotation
    const cosLat = Math.cos(latRad), sinLat = Math.sin(latRad);
    let y2 = y1 * cosLat - z1 * sinLat;
    let z2 = y1 * sinLat + z1 * cosLat;

    // Azimuth rotation
    const cosAz = Math.cos(azRad), sinAz = Math.sin(azRad);
    let x3 = x1 * cosAz - y2 * sinAz;
    let y3 = x1 * sinAz + y2 * cosAz;

    // Altitude rotation
    const cosAlt = Math.cos(altRad), sinAlt = Math.sin(altRad);
    let y4 = y3 * cosAlt - z2 * sinAlt;
    let z4 = y3 * sinAlt + z2 * cosAlt;

    if (y4 <= 0.02) return null;

    const scale = SCREEN_WIDTH / (2 * Math.tan(FOV_RAD / 2));
    const sx = CENTER_X + (x3 / y4) * scale;
    const sy = CENTER_Y - (z4 / y4) * scale;

    if (sx < -100 || sx > SCREEN_WIDTH + 100 || sy < -100 || sy > SCREEN_HEIGHT + 100) {
        return null;
    }

    return { x: sx, y: sy, depth: y4 };
};

/**
 * Crosshair component
 */
const Crosshair = ({ theme }) => (
    <G>
        {/* Outer circle */}
        <Circle
            cx={CENTER_X}
            cy={CENTER_Y}
            r={CROSSHAIR_SIZE}
            stroke={theme.accent || '#4fc3f7'}
            strokeWidth={1}
            fill="none"
            opacity={0.5}
        />
        {/* Center dot */}
        <Circle
            cx={CENTER_X}
            cy={CENTER_Y}
            r={3}
            fill={theme.accent || '#4fc3f7'}
            opacity={0.8}
        />
        {/* Crosshair lines */}
        <Line x1={CENTER_X - 15} y1={CENTER_Y} x2={CENTER_X - 8} y2={CENTER_Y} stroke={theme.accent || '#4fc3f7'} strokeWidth={1.5} opacity={0.7} />
        <Line x1={CENTER_X + 8} y1={CENTER_Y} x2={CENTER_X + 15} y2={CENTER_Y} stroke={theme.accent || '#4fc3f7'} strokeWidth={1.5} opacity={0.7} />
        <Line x1={CENTER_X} y1={CENTER_Y - 15} x2={CENTER_X} y2={CENTER_Y - 8} stroke={theme.accent || '#4fc3f7'} strokeWidth={1.5} opacity={0.7} />
        <Line x1={CENTER_X} y1={CENTER_Y + 8} x2={CENTER_X} y2={CENTER_Y + 15} stroke={theme.accent || '#4fc3f7'} strokeWidth={1.5} opacity={0.7} />
    </G>
);

/**
 * Main StarMap Component - Optimized for performance
 */
const StarMap = ({
    orientation,
    location,
    stars = [],
    constellations = [],
    planets = [],
    onSelectObject,
    selectedObject,
    showConstellations = true,
    showLabels = true,
    theme,
    getOrientation, // Imperative getter from useGyroscope
}) => {
    const svgRef = useRef(null);
    const frameRef = useRef(null);
    const [hoveredObject, setHoveredObject] = useState(null);
    const [renderedStars, setRenderedStars] = useState([]);
    const [renderedLines, setRenderedLines] = useState([]);
    const [renderedPlanets, setRenderedPlanets] = useState([]);

    // Pre-compute star positions (only once)
    const precomputed = useMemo(() => precomputeStars(stars), [stars]);

    // LST calculation (update every 2 seconds for performance)
    const lstRef = useRef(getLocalSiderealTime(new Date(), location.longitude));
    useEffect(() => {
        const interval = setInterval(() => {
            lstRef.current = getLocalSiderealTime(new Date(), location.longitude);
        }, 2000);
        return () => clearInterval(interval);
    }, [location.longitude]);

    // Main render loop - imperative updates
    useEffect(() => {
        let running = true;
        let lastAzimuth = -999;
        let lastAltitude = -999;

        const renderFrame = () => {
            if (!running) return;

            // Get current orientation (no re-render)
            const orient = getOrientation ? getOrientation() : orientation;
            const azimuth = orient.azimuth;
            const altitude = orient.altitude;

            // Only update if orientation changed significantly
            const azDiff = Math.abs(azimuth - lastAzimuth);
            const altDiff = Math.abs(altitude - lastAltitude);
            if (azDiff > 0.3 || altDiff > 0.3 || lastAzimuth === -999) {
                lastAzimuth = azimuth;
                lastAltitude = altitude;

                const lst = lstRef.current;
                const lat = location.latitude;

                // Project stars
                const visibleStars = [];
                const positionCache = {};

                for (const star of precomputed) {
                    const pos = project(star.pos.x, star.pos.y, star.pos.z, azimuth, altitude, lst, lat);
                    if (pos) {
                        positionCache[star.id] = pos;
                        // Calculate distance from center
                        const dx = pos.x - CENTER_X;
                        const dy = pos.y - CENTER_Y;
                        const distFromCenter = Math.sqrt(dx * dx + dy * dy);

                        visibleStars.push({
                            ...star,
                            x: pos.x,
                            y: pos.y,
                            depth: pos.depth,
                            distFromCenter,
                            isNearCenter: distFromCenter < HOVER_RADIUS,
                        });
                    }
                }

                // Sort back-to-front
                visibleStars.sort((a, b) => b.depth - a.depth);

                // Find closest to center for hover effect
                let closest = null;
                let closestDist = HOVER_RADIUS;
                for (const star of visibleStars) {
                    if (star.distFromCenter < closestDist) {
                        closestDist = star.distFromCenter;
                        closest = star;
                    }
                }

                // Project constellation lines
                const lines = [];
                if (showConstellations) {
                    for (const const_ of constellations) {
                        if (!const_.lines) continue;
                        for (const [id1, id2] of const_.lines) {
                            const p1 = positionCache[id1];
                            const p2 = positionCache[id2];
                            if (p1 && p2) {
                                lines.push({ x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y, key: `${id1}-${id2}` });
                            }
                        }
                    }
                }

                // Project planets
                const visiblePlanets = [];
                for (const planet of planets) {
                    if (!planet.ra) continue;
                    const pos3d = raDecToCartesian(planet.ra, planet.dec);
                    const pos = project(pos3d.x, pos3d.y, pos3d.z, azimuth, altitude, lst, lat);
                    if (pos) {
                        const dx = pos.x - CENTER_X;
                        const dy = pos.y - CENTER_Y;
                        const dist = Math.sqrt(dx * dx + dy * dy);
                        visiblePlanets.push({
                            ...planet,
                            x: pos.x,
                            y: pos.y,
                            isNearCenter: dist < HOVER_RADIUS,
                        });
                        if (dist < closestDist) {
                            closestDist = dist;
                            closest = { ...planet, type: 'planet' };
                        }
                    }
                }

                // Update state (batched)
                setRenderedStars(visibleStars);
                setRenderedLines(lines);
                setRenderedPlanets(visiblePlanets);
                setHoveredObject(closest);
            }

            frameRef.current = requestAnimationFrame(renderFrame);
        };

        frameRef.current = requestAnimationFrame(renderFrame);

        return () => {
            running = false;
            if (frameRef.current) cancelAnimationFrame(frameRef.current);
        };
    }, [precomputed, constellations, planets, location, showConstellations, getOrientation, orientation]);

    // Handle tap on star/planet
    const handleObjectPress = useCallback((obj) => {
        if (onSelectObject) {
            onSelectObject(obj.data || obj);
        }
    }, [onSelectObject]);

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            <Svg width={SCREEN_WIDTH} height={SCREEN_HEIGHT} ref={svgRef}>
                {/* Constellation lines */}
                <G opacity={0.5}>
                    {renderedLines.map((line) => (
                        <Line
                            key={line.key}
                            x1={line.x1}
                            y1={line.y1}
                            x2={line.x2}
                            y2={line.y2}
                            stroke={theme.constellation || '#336699'}
                            strokeWidth={1}
                        />
                    ))}
                </G>

                {/* Stars */}
                <G>
                    {renderedStars.map((star) => (
                        <Circle
                            key={star.id}
                            cx={star.x}
                            cy={star.y}
                            r={star.isNearCenter ? star.radius * 1.5 : star.radius}
                            fill={star.color}
                            opacity={star.isNearCenter ? 1 : 0.9}
                            onPress={() => handleObjectPress(star)}
                        />
                    ))}
                </G>

                {/* Planets */}
                <G>
                    {renderedPlanets.map((planet) => (
                        <Circle
                            key={planet.id}
                            cx={planet.x}
                            cy={planet.y}
                            r={planet.isNearCenter ? 10 : 7}
                            fill={planet.color}
                            onPress={() => handleObjectPress(planet)}
                        />
                    ))}
                </G>

                {/* Crosshair in center */}
                <Crosshair theme={theme} />

                {/* Hovered object label - only show when something is near center */}
                {hoveredObject && hoveredObject.name && (
                    <G>
                        <Rect
                            x={CENTER_X - 60}
                            y={CENTER_Y + CROSSHAIR_SIZE + 10}
                            width={120}
                            height={24}
                            rx={4}
                            fill="rgba(0,0,0,0.7)"
                        />
                        <SvgText
                            x={CENTER_X}
                            y={CENTER_Y + CROSSHAIR_SIZE + 27}
                            textAnchor="middle"
                            fill={theme.text || '#ffffff'}
                            fontSize={14}
                            fontWeight="600"
                        >
                            {hoveredObject.name}
                        </SvgText>
                    </G>
                )}
            </Svg>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
});

export default React.memo(StarMap);
