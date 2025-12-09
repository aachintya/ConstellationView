/**
 * StarField3D - Three.js particle-based star renderer
 * Renders all stars in a single draw call using BufferGeometry Points
 */

import React, { useRef, useMemo, useEffect } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { Canvas, useFrame, useThree } from '@react-three/fiber/native';
import * as THREE from 'three';

import { precomputeStarBuffers, getLocalSiderealTime } from '../utils/CelestialSphere';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

/**
 * Stars component - renders all stars as a single point cloud
 */
const Stars = ({ stars, orientation, location }) => {
    const pointsRef = useRef();
    const groupRef = useRef();

    // Pre-compute star buffers (positions, colors, sizes)
    const { positions, colors, sizes, count } = useMemo(() => {
        return precomputeStarBuffers(stars);
    }, [stars]);

    // Create geometry with typed arrays
    const geometry = useMemo(() => {
        const geom = new THREE.BufferGeometry();
        geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        geom.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
        geom.setAttribute('size', new THREE.Float32BufferAttribute(sizes, 1));
        return geom;
    }, [positions, colors, sizes]);

    // Custom shader for variable star sizes
    const material = useMemo(() => {
        return new THREE.ShaderMaterial({
            uniforms: {
                uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) },
            },
            vertexShader: `
                attribute float size;
                varying vec3 vColor;
                uniform float uPixelRatio;
                
                void main() {
                    vColor = color;
                    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
                    gl_PointSize = size * uPixelRatio * (300.0 / -mvPosition.z);
                    gl_PointSize = clamp(gl_PointSize, 1.0, 20.0);
                    gl_Position = projectionMatrix * mvPosition;
                }
            `,
            fragmentShader: `
                varying vec3 vColor;
                
                void main() {
                    // Circular point with soft edge
                    float dist = length(gl_PointCoord - vec2(0.5));
                    if (dist > 0.5) discard;
                    
                    // Soft glow falloff
                    float alpha = 1.0 - smoothstep(0.0, 0.5, dist);
                    gl_FragColor = vec4(vColor, alpha);
                }
            `,
            transparent: true,
            vertexColors: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
        });
    }, []);

    // Update rotation based on orientation and sidereal time
    useFrame(() => {
        if (!groupRef.current) return;

        const date = new Date();
        const lst = getLocalSiderealTime(date, location.longitude);

        // Rotate celestial sphere by LST (Earth's rotation)
        // LST determines which part of the sky is overhead
        const lstRad = (lst * Math.PI) / 180;

        // Latitude determines pole elevation
        const latRad = (location.latitude * Math.PI) / 180;

        // Device orientation
        const azRad = (-orientation.azimuth * Math.PI) / 180;
        const altRad = ((orientation.altitude - 90) * Math.PI) / 180;

        // Create rotation: celestial -> local horizon -> device orientation
        groupRef.current.rotation.set(0, 0, 0);
        groupRef.current.rotateZ(-lstRad);                    // Sidereal rotation
        groupRef.current.rotateX(Math.PI / 2 - latRad);      // Latitude correction
        groupRef.current.rotateY(azRad);                      // Device azimuth
        groupRef.current.rotateX(altRad);                     // Device altitude
    });

    return (
        <group ref={groupRef}>
            <points ref={pointsRef} geometry={geometry} material={material} />
        </group>
    );
};

/**
 * Constellation lines component
 */
const ConstellationLines = ({ constellations, starMap, orientation, location }) => {
    const groupRef = useRef();

    // Build line segments from constellation data
    const lineGeometry = useMemo(() => {
        const positions = [];

        constellations.forEach(constellation => {
            if (!constellation.lines) return;

            constellation.lines.forEach(([star1Id, star2Id]) => {
                const star1 = starMap[star1Id];
                const star2 = starMap[star2Id];

                if (!star1 || !star2) return;

                // Convert RA/Dec to 3D (same as stars)
                const sphereRadius = 99; // Slightly inside star sphere

                const ra1Rad = (star1.ra * Math.PI) / 180;
                const dec1Rad = (star1.dec * Math.PI) / 180;
                positions.push(
                    Math.cos(dec1Rad) * Math.cos(ra1Rad) * sphereRadius,
                    Math.cos(dec1Rad) * Math.sin(ra1Rad) * sphereRadius,
                    Math.sin(dec1Rad) * sphereRadius
                );

                const ra2Rad = (star2.ra * Math.PI) / 180;
                const dec2Rad = (star2.dec * Math.PI) / 180;
                positions.push(
                    Math.cos(dec2Rad) * Math.cos(ra2Rad) * sphereRadius,
                    Math.cos(dec2Rad) * Math.sin(ra2Rad) * sphereRadius,
                    Math.sin(dec2Rad) * sphereRadius
                );
            });
        });

        const geom = new THREE.BufferGeometry();
        geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        return geom;
    }, [constellations, starMap]);

    // Sync rotation with Stars group
    useFrame(() => {
        if (!groupRef.current) return;

        const date = new Date();
        const lst = getLocalSiderealTime(date, location.longitude);
        const lstRad = (lst * Math.PI) / 180;
        const latRad = (location.latitude * Math.PI) / 180;
        const azRad = (-orientation.azimuth * Math.PI) / 180;
        const altRad = ((orientation.altitude - 90) * Math.PI) / 180;

        groupRef.current.rotation.set(0, 0, 0);
        groupRef.current.rotateZ(-lstRad);
        groupRef.current.rotateX(Math.PI / 2 - latRad);
        groupRef.current.rotateY(azRad);
        groupRef.current.rotateX(altRad);
    });

    return (
        <group ref={groupRef}>
            <lineSegments geometry={lineGeometry}>
                <lineBasicMaterial color="#334466" transparent opacity={0.4} />
            </lineSegments>
        </group>
    );
};

/**
 * Scene setup with camera
 */
const Scene = ({ stars, constellations, starMap, orientation, location, showConstellations }) => {
    const { camera } = useThree();

    useEffect(() => {
        // Position camera at center of celestial sphere, looking outward
        camera.position.set(0, 0, 0);
        camera.near = 0.1;
        camera.far = 200;
        camera.fov = 60;
        camera.updateProjectionMatrix();
    }, [camera]);

    return (
        <>
            <color attach="background" args={['#000008']} />
            {showConstellations && (
                <ConstellationLines
                    constellations={constellations}
                    starMap={starMap}
                    orientation={orientation}
                    location={location}
                />
            )}
            <Stars
                stars={stars}
                orientation={orientation}
                location={location}
            />
        </>
    );
};

/**
 * Main StarField3D component
 */
const StarField3D = ({
    stars = [],
    constellations = [],
    starMap = {},
    orientation = { azimuth: 0, altitude: 45 },
    location = { latitude: 28.6, longitude: 77.2 },
    showConstellations = true,
    theme,
}) => {
    return (
        <View style={styles.container}>
            <Canvas
                gl={{ antialias: true }}
                camera={{ fov: 60, near: 0.1, far: 200 }}
                style={{ flex: 1 }}
            >
                <Scene
                    stars={stars}
                    constellations={constellations}
                    starMap={starMap}
                    orientation={orientation}
                    location={location}
                    showConstellations={showConstellations}
                />
            </Canvas>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000008',
    },
});

export default StarField3D;
