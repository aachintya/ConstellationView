# Native API Reference

> **Last Updated**: December 15, 2024  
> **App Name**: Stello
> **Purpose**: Document the React Native to Kotlin native bridge API

---

## Overview

The native view is exposed via `requireNativeComponent('SkyViewNativeView')` and managed by `SkyViewNativeViewManager.kt`.

---

## Props API

### Data Props

| Prop | Type | Description |
|------|------|-------------|
| `stars` | `Array<Star>` | Star catalog with RA/Dec coordinates |
| `planets` | `Array<Planet>` | Planet data with real-time positions |
| `constellations` | `Array<Constellation>` | Constellation line definitions |

### Star Object
```javascript
{
  id: string,          // Unique identifier
  name: string,        // Display name (optional)
  ra: number,          // Right Ascension in degrees (0-360)
  dec: number,         // Declination in degrees (-90 to +90)
  magnitude: number,   // Apparent magnitude
  spectralType: string // e.g., "G2V", "M1III"
}
```

### Planet Object
```javascript
{
  id: string,          // e.g., "mars", "saturn"
  name: string,        // Display name
  ra: number,          // Right Ascension in degrees
  dec: number,         // Declination in degrees
  magnitude: number,   // Apparent magnitude
  size: number,        // Relative size (0.1-2.0)
  color: string,       // Hex color fallback
  textureId: string,   // Asset name for texture
  type: string         // "planet", "moon", "sun"
}
```

### Control Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `fov` | `number` | 75 | Field of view in degrees |
| `latitude` | `number` | 28.6 | Observer latitude |
| `longitude` | `number` | 77.2 | Observer longitude |
| `gyroEnabled` | `boolean` | true | Enable gyroscope control |
| `nightMode` | `string` | "off" | Night mode: "off", "low", "high" |
| `simulatedTime` | `number` | null | Unix timestamp for time travel |
| `starBrightness` | `number` | 0.5 | Star brightness multiplier |
| `planetScale` | `number` | 0.5 | Planet size multiplier |
| `navigateToCoordinates` | `object` | null | `{ra, dec}` for camera navigation |

---

## Event Props

### onStarTap
Fired when user taps on a star or planet.

```javascript
onStarTap={(event) => {
  const { id, name, type, magnitude, ra, dec, spectralType } = event.nativeEvent;
  // Handle star/planet selection
}}
```

### Button Events
```javascript
onMenuPress={() => console.log('Menu pressed')}
onSearchPress={() => console.log('Search pressed')}
onSharePress={() => console.log('Share pressed')}
```

---

## Native File Structure

```
android/app/src/main/java/com/skyviewapp/starfield/
├── SkyViewNativeView.kt         # Main container view
├── SkyViewNativeViewManager.kt  # React Native ViewManager
├── GLSkyView.kt                 # OpenGL surface
├── data/
│   └── ConstellationDataLoader.kt
├── gl/
│   ├── GLSkyRenderer.kt         # Main GL renderer
│   ├── ShaderProgram.kt
│   ├── StarBuffer.kt
│   ├── LineBuffer.kt
│   ├── SphereMesh.kt
│   ├── RingMesh.kt
│   ├── ConstellationArtworkMesh.kt
│   ├── GalacticBandMesh.kt
│   ├── animation/
│   │   └── TimeAnimator.kt
│   ├── renderers/
│   │   ├── StarRenderer.kt
│   │   ├── PlanetRenderer.kt
│   │   ├── ConstellationRenderer.kt
│   │   ├── MilkyWayRenderer.kt
│   │   └── ...
│   └── utils/
│       ├── MatrixUtils.kt
│       ├── ShaderUtils.kt
│       └── TextureUtils.kt
├── input/
│   └── GestureHandler.kt        # Touch/gesture handling
├── managers/
│   ├── CelestialDataManager.kt  # Data validation/caching
│   ├── CrosshairManager.kt      # Object detection
│   ├── DynamicStarManager.kt    # Dynamic star loading
│   └── TextureManager.kt        # Texture loading
├── models/
│   └── CelestialModels.kt       # Star, Planet data classes
├── projection/
│   └── CoordinateProjector.kt   # Coordinate transforms
├── rendering/
│   ├── OverlayView.kt           # 2D canvas overlay
│   └── overlay/
│       ├── ButtonRenderer.kt
│       ├── CrosshairRenderer.kt
│       └── ...
└── sensors/
    └── OrientationManager.kt    # Gyroscope/sensor handling
```

---

## Shader Assets

Located in `android/app/src/main/res/raw/`:

| Shader | Purpose |
|--------|---------|
| `star_vertex.glsl`, `star_fragment.glsl` | Star point rendering |
| `planet_vertex.glsl`, `planet_fragment.glsl` | Planet sphere rendering |
| `line_vertex.glsl`, `line_fragment.glsl` | Constellation lines |
| `artwork_vertex.glsl`, `artwork_fragment.glsl` | Constellation artwork |
| `milkyway_vertex.glsl`, `milkyway_fragment.glsl` | Milky Way rendering |

---

## Performance Notes

1. **Change Detection**: `CelestialDataManager` caches data and only updates GPU when data actually changes
2. **Memo Comparison**: `NativeSkyView.js` uses `React.memo` with custom comparison to prevent unnecessary re-renders
3. **60fps Target**: Native rendering maintains 60fps via requestRender() pattern
4. **Crosshair Update**: Runs every 100ms to reduce overhead

---

## Debugging Tips

1. **Enable Logging**: Search for `Log.d` calls in Kotlin files
2. **Check Bridge**: ViewManager logs prop updates with `DEBUG_FLICKER` tag
3. **GL Errors**: Check `glGetError()` calls in renderers
4. **React DevTools**: Monitor prop changes to native view
