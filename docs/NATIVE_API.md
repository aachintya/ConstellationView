# Native Module API Reference

> **Last Updated**: December 14, 2024  
> **Purpose**: Document the JS ↔ Native bridge interface for SkyViewNativeView

---

## Overview

The native view is exposed via `requireNativeComponent('SkyViewNativeView')` and managed by `SkyViewNativeViewManager.kt`.

---

## Props (JS → Native)

### Data Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `stars` | `Array<Star>` | Yes | Star catalog data |
| `planets` | `Array<Planet>` | Yes | Planet position data |
| `constellations` | `Array<Constellation>` | No | Constellation line data |

#### Star Object
```typescript
interface Star {
  id: string;           // Unique identifier (e.g., "HIP 32349")
  name?: string;        // Common name (e.g., "Sirius")
  ra: number;           // Right Ascension in degrees (0-360)
  dec: number;          // Declination in degrees (-90 to +90)
  magnitude: number;    // Apparent magnitude (e.g., -1.46)
  spectralType?: string; // Spectral classification (e.g., "A1V")
}
```

#### Planet Object
```typescript
interface Planet {
  id: string;           // "sun", "moon", "mercury", etc.
  name: string;         // Display name
  ra: number;           // Right Ascension in degrees
  dec: number;          // Declination in degrees
  size?: number;        // Display size multiplier (default: 1.0)
  color?: string;       // Hex color (e.g., "#FF6B35")
  textureId?: string;   // Texture asset name
}
```

### Display Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `showConstellations` | `boolean` | `true` | Show constellation lines |
| `showArtwork` | `boolean` | `false` | Show constellation artwork |
| `artworkOpacity` | `number` | `0.5` | Artwork opacity (0.0-1.0) |
| `showGrid` | `boolean` | `false` | Show RA/Dec grid |
| `showPlanets` | `boolean` | `true` | Show planets |

### Control Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `fov` | `number` | `60.0` | Field of view in degrees |
| `gyroEnabled` | `boolean` | `true` | Enable gyroscope control |
| `simulatedTime` | `number` | `Date.now()` | Time for sky calculation (ms) |
| `nightMode` | `string` | `"off"` | Night mode: "off", "low", "high" |
| `starBrightness` | `number` | `0.5` | Star brightness (0.0-1.0) |
| `planetScale` | `number` | `0.5` | Planet size scale (0.0-1.0) |

---

## Events (Native → JS)

### `onStarTap`
Fired when user taps on a star.

```javascript
onStarTap={(event) => {
  const { starId, starName } = event.nativeEvent;
  console.log(`Tapped: ${starName} (${starId})`);
}}
```

### `onMenuPress`
Fired when menu button is tapped.

```javascript
onMenuPress={() => {
  // Open menu
}}
```

### `onSearchPress`
Fired when search button is tapped.

### `onSharePress`
Fired when share button is tapped.

---

## Native View Manager (SkyViewNativeViewManager.kt)

### @ReactProp Setters

| Method | Prop | Type |
|--------|------|------|
| `setStars()` | `stars` | ReadableArray |
| `setPlanets()` | `planets` | ReadableArray |
| `setConstellations()` | `constellations` | ReadableArray |
| `setShowConstellations()` | `showConstellations` | Boolean |
| `setShowArtwork()` | `showArtwork` | Boolean |
| `setArtworkOpacity()` | `artworkOpacity` | Float |
| `setFov()` | `fov` | Float |
| `setGyroEnabled()` | `gyroEnabled` | Boolean |
| `setSimulatedTime()` | `simulatedTime` | Double |
| `setNightMode()` | `nightMode` | String |
| `setStarBrightness()` | `starBrightness` | Float |
| `setPlanetScale()` | `planetScale` | Float |

### Event Exports

```kotlin
override fun getExportedCustomBubblingEventTypeConstants(): Map<String, Any> {
    return mapOf(
        "onStarTap" to mapOf(
            "phasedRegistrationNames" to mapOf("bubbled" to "onStarTap")
        ),
        "onMenuPress" to ...,
        "onSearchPress" to ...,
        "onSharePress" to ...
    )
}
```

---

## Usage Example

```jsx
import { requireNativeComponent } from 'react-native';

const SkyViewNativeView = requireNativeComponent('SkyViewNativeView');

function SkyView() {
  const [planets, setPlanets] = useState([]);
  const [selectedTime, setSelectedTime] = useState(new Date());
  
  return (
    <SkyViewNativeView
      style={{ flex: 1 }}
      stars={starData}
      planets={planets}
      constellations={constellationData}
      showConstellations={true}
      showPlanets={true}
      fov={60}
      gyroEnabled={true}
      simulatedTime={selectedTime.getTime()}
      nightMode="off"
      onStarTap={(e) => handleStarTap(e.nativeEvent)}
      onMenuPress={() => openMenu()}
    />
  );
}
```

---

## Performance Notes

1. **Change Detection**: Native side implements change detection to avoid re-uploading unchanged data to GPU:
   - `CelestialDataManager.hasPlanetsChanged()` checks RA/Dec delta > 0.01°
   - Stars/constellations only update on count change

2. **Memoization**: JS side should memoize array props with `useMemo` to prevent unnecessary bridge traffic

3. **Invalidation**: Call patterns must ensure proper view invalidation:
   - `OverlayView.invalidate()` → must call `super.invalidate()`
   - `GLSkyView.requestRender()` → requests next frame
