# ConstellationView Feature Catalog

> **Last Updated**: December 14, 2024  
> **Purpose**: Complete list of features with file locations and function names

---

## Table of Contents
1. [Star Rendering](#1-star-rendering)
2. [Planet Rendering](#2-planet-rendering)
3. [Constellation Lines](#3-constellation-lines)
4. [Constellation Artwork](#4-constellation-artwork)
5. [Time Travel](#5-time-travel)
6. [Crosshair Detection](#6-crosshair-detection)
7. [Gyroscope Control](#7-gyroscope-control)
8. [Touch/Gesture Control](#8-touchgesture-control)
9. [Night Mode](#9-night-mode)
10. [Star Tap & Info](#10-star-tap--info)
11. [UI Controls](#11-ui-controls)
12. [Search Feature](#12-search-feature)

---

## 1. Star Rendering

**Description**: Renders ~500 stars as points with magnitude-based sizing and proper positioning.

### Files & Functions

| Layer | File | Function/Method | Purpose |
|-------|------|-----------------|---------|
| JS | `src/hooks/useCelestialData.js` | `useCelestialData()` | Loads star data |
| JS | `src/data/stars.json` | (data file) | Star catalog |
| Native | `managers/CelestialDataManager.kt` | `setStars()` | Validates & caches stars |
| Native | `gl/StarBuffer.kt` | `setStars()` | Uploads star positions to GPU |
| Native | `gl/renderers/StarRenderer.kt` | `render()` | Draws stars with shaders |
| Native | `models/Star.kt` | `Star.fromMap()` | Parses star data model |

### Props
- `stars`: Array of `{id, name, ra, dec, magnitude, spectralType}`

---

## 2. Planet Rendering

**Description**: Renders 8 planets + Sun + Moon with 3D spheres and Saturn rings.

### Files & Functions

| Layer | File | Function/Method | Purpose |
|-------|------|-----------------|---------|
| JS | `src/utils/PlanetCalculator.js` | `getAllCelestialBodies()` | Calculates real-time positions |
| JS | `src/screens/SkyView/index.js` | `useEffect` (line ~82) | Updates planets on time change |
| Native | `managers/CelestialDataManager.kt` | `setPlanets()` | Validates & checks for changes |
| Native | `gl/renderers/PlanetRenderer.kt` | `setPlanets()` | Stores planet list, detects overlap |
| Native | `gl/renderers/PlanetRenderer.kt` | `render()` | Draws planet spheres |
| Native | `gl/SphereMesh.kt` | `SphereMesh` | 3D sphere geometry |
| Native | `gl/RingMesh.kt` | `RingMesh` | Saturn ring geometry |
| Native | `models/Planet.kt` | `Planet.computePosition()` | RA/Dec → XYZ conversion |

### Props
- `planets`: Array of `{id, name, ra, dec, size, color, textureId}`

### Critical Dependencies
- **astronomy-engine** npm package (MUST use `require()` not `import`)

---

## 3. Constellation Lines

**Description**: Renders constellation stick figures connecting stars.

### Files & Functions

| Layer | File | Function/Method | Purpose |
|-------|------|-----------------|---------|
| JS | `src/hooks/useCelestialData.js` | loads `constellations.json` | Constellation data |
| Native | `managers/CelestialDataManager.kt` | `setConstellations()` | Caches constellation data |
| Native | `GLSkyView.kt` | `setConstellations()` | Passes to renderer |
| Native | `gl/LineBuffer.kt` | `setConstellations()` | Creates line buffers |
| Native | `gl/renderers/ConstellationRenderer.kt` | `render()` | Draws lines |

### Props
- `constellations`: Array of `{id, name, stars[]}`
- `showConstellations`: Boolean toggle

---

## 4. Constellation Artwork

**Description**: Overlays constellation artwork images on the sky.

### Files & Functions

| Layer | File | Function/Method | Purpose |
|-------|------|-----------------|---------|
| Native | `managers/TextureManager.kt` | `loadConstellationTextures()` | Loads artwork bitmaps |
| Native | `rendering/overlay/CanvasArtworkRenderer.kt` | `draw()` | Renders artwork on canvas |
| Native | `rendering/OverlayView.kt` | `setConstellationArtworks()` | Sets artwork data |

### Props
- `showArtwork`: Boolean toggle
- `artworkOpacity`: Float 0.0-1.0

---

## 5. Time Travel

**Description**: Allows viewing the sky at any date/time in past or future.

### Files & Functions

| Layer | File | Function/Method | Purpose |
|-------|------|-----------------|---------|
| JS | `src/components/TimeTravelSlider.js` | Component | Time selection UI |
| JS | `src/screens/SkyView/hooks/useSkyViewState.js` | `selectedTime` state | Stores selected time |
| JS | `src/utils/PlanetCalculator.js` | `getPlanetPosition()` | Calculates position for any date |
| Native | (receives updated planet props) | - | Re-renders with new positions |

### Props
- `simulatedTime`: Unix timestamp (milliseconds)

---

## 6. Crosshair Detection

**Description**: Detects and displays name of star/planet at screen center.

### Files & Functions

| Layer | File | Function/Method | Purpose |
|-------|------|-----------------|---------|
| Native | `SkyViewNativeView.kt` | `crosshairUpdateRunnable` | Runs detection every 100ms |
| Native | `managers/CrosshairManager.kt` | `updateCrosshairInfo()` | Coordinates detection |
| Native | `managers/CrosshairManager.kt` | `updateScreenPositions()` | Projects XYZ to screen |
| Native | `managers/CrosshairManager.kt` | `findObjectAtScreen()` | Finds object in 100px radius |
| Native | `rendering/OverlayView.kt` | `setCrosshairInfo()` | Sets renderer data |
| Native | `rendering/overlay/CrosshairRenderer.kt` | `draw()` | Renders name at bottom-left |

### Critical Note
- `OverlayView.invalidate()` MUST call `super.invalidate()` for text to appear

---

## 7. Gyroscope Control

**Description**: Device orientation controls view direction.

### Files & Functions

| Layer | File | Function/Method | Purpose |
|-------|------|-----------------|---------|
| Native | `sensors/OrientationManager.kt` | `OrientationManager` | Manages sensor fusion |
| Native | `SkyViewNativeView.kt` | lifecycle methods | Starts/stops orientation |
| Native | `GLSkyView.kt` | `setRotationMatrix()` | Updates view matrix |

### Props
- `gyroEnabled`: Boolean toggle

---

## 8. Touch/Gesture Control

**Description**: Touch gestures for panning, pinching (zoom), and tapping.

### Files & Functions

| Layer | File | Function/Method | Purpose |
|-------|------|-----------------|---------|
| Native | `input/GestureHandler.kt` | `GestureHandler` | Handles touch events |
| Native | `SkyViewNativeView.kt` | `onTouchEvent()` | Delegates to handler |
| Native | `projection/CoordinateProjector.kt` | `screenToSkyDirection()` | Touch → sky coords |

---

## 9. Night Mode

**Description**: Red tint mode to preserve night vision.

### Files & Functions

| Layer | File | Function/Method | Purpose |
|-------|------|-----------------|---------|
| Native | `SkyViewNativeView.kt` | `setNightMode()` | Receives mode from JS |
| Native | `GLSkyView.kt` | `setNightModeIntensity()` | Adjusts GL rendering |
| Native | `rendering/OverlayView.kt` | `setNightMode()` | Adjusts overlay colors |
| Native | `rendering/overlay/CrosshairRenderer.kt` | `setNightMode()` | Red crosshair colors |

### Props
- `nightMode`: String ("off", "low", "high")

---

## 10. Star Tap & Info

**Description**: Tapping a star shows info bar at bottom of screen.

### Files & Functions

| Layer | File | Function/Method | Purpose |
|-------|------|-----------------|---------|
| Native | `input/GestureHandler.kt` | detects single tap | Triggers star search |
| Native | `managers/CrosshairManager.kt` | `findObjectAtScreen()` | Finds tapped star |
| Native | `SkyViewNativeViewManager.kt` | `onStarTap` event | Sends event to JS |
| JS | `src/screens/SkyView/index.js` | `handleStarTap()` | Handles star tap |
| JS | `src/screens/SkyView/hooks/useStarInteraction.js` | hook | Manages star selection |
| JS | `src/screens/SkyView/components/StarInfoBar.js` | Component | Displays star info |

### JS Events
- `onStarTap`: Callback `(starId, starName) => void`

---

## 11. UI Controls

**Description**: Menu, search, and share buttons at top of screen.

### Files & Functions

| Layer | File | Function/Method | Purpose |
|-------|------|-----------------|---------|
| Native | `rendering/overlay/ButtonRenderer.kt` | `draw()` | Draws button icons |
| Native | `rendering/OverlayView.kt` | `isTouchOnButton()` | Hit detection |
| Native | `SkyViewNativeViewManager.kt` | button events | Sends to JS |
| JS | `src/components/NativeSkyView.js` | button callbacks | Handles button taps |

### JS Events
- `onMenuPress`, `onSearchPress`, `onSharePress`

---

## 12. Search Feature

**Description**: Search for stars/constellations and center view on them.

### Files & Functions

| Layer | File | Function/Method | Purpose |
|-------|------|-----------------|---------|
| JS | `src/screens/SearchScreen.js` | Component | Search UI |
| JS | (navigation) | - | Navigates to searched object |

---

## Unused/Legacy Code (Candidates for Removal)

| File | Reason | Notes |
|------|--------|-------|
| `src/screens/SkyViewScreen.js` | Redirects to SkyView/index.js | Keep for backward compat |
| Check `src/components/` for unused | Some may be legacy | Audit needed |

---

## Feature Dependencies Graph

```
Time Travel ──────────▶ Planet Rendering
                              │
                              ▼
Star Rendering ◀──────── CelestialDataManager ──────▶ Constellation Lines
       │                      │
       ▼                      ▼
Crosshair Detection ◀──── CoordinateProjector
       │
       ▼
Star Tap & Info
```
