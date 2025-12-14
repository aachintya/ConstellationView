# ConstellationView Architecture

> **Last Updated**: December 14, 2024  
> **Purpose**: High-level architecture overview to prevent regressions and aid development

## Overview

ConstellationView is a React Native astronomy app with a custom native Android view for hardware-accelerated star/planet rendering. The architecture follows a **hybrid approach** where React Native handles UI state and data management, while native Kotlin handles GPU-intensive rendering.

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                         React Native Layer                          │
├─────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐  │
│  │   SkyViewScreen │───▶│   NativeSkyView │───▶│  useCelestialData│  │
│  │   (index.js)    │    │   (bridge)      │    │  (data hook)    │  │
│  └─────────────────┘    └─────────────────┘    └─────────────────┘  │
│           │                      │                      │           │
│           ▼                      ▼                      ▼           │
│  ┌─────────────────────────────────────────────────────────────────┐│
│  │                    Props passed to Native                       ││
│  │  stars[], planets[], constellations[], simulatedTime, fov, etc  ││
│  └─────────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────────┐
│                          Native Bridge                               │
│                    SkyViewNativeViewManager.kt                       │
└─────────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         Native Kotlin Layer                          │
├─────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────────────┐│
│  │                     SkyViewNativeView.kt                         ││
│  │  (Main container - FrameLayout with GLSkyView + OverlayView)    ││
│  └─────────────────────────────────────────────────────────────────┘│
│           │                      │                      │           │
│           ▼                      ▼                      ▼           │
│  ┌───────────────┐      ┌───────────────┐      ┌───────────────┐   │
│  │ CelestialData │      │  CrosshairMgr │      │  TextureMgr   │   │
│  │   Manager     │      │               │      │               │   │
│  └───────────────┘      └───────────────┘      └───────────────┘   │
│           │                                                         │
│           ▼                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐│
│  │                         GLSkyView.kt                             ││
│  │              (OpenGL ES 3.0 Surface for rendering)              ││
│  └─────────────────────────────────────────────────────────────────┘│
│           │                                                         │
│           ▼                                                         │
│  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐           │
│  │  StarRenderer │  │ PlanetRenderer│  │  LineRenderer │           │
│  └───────────────┘  └───────────────┘  └───────────────┘           │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Key Components

### React Native (JavaScript)

| File | Purpose | Dependencies |
|------|---------|--------------|
| `src/screens/SkyView/index.js` | Main screen orchestrator | useSkyViewState, useNavigation, NativeSkyView |
| `src/components/NativeSkyView.js` | Bridge to native view | requireNativeComponent |
| `src/hooks/useCelestialData.js` | Loads stars, planets, constellations | starData.json, PlanetCalculator |
| `src/utils/PlanetCalculator.js` | Real-time planet positions | astronomy-engine |

### Native Kotlin

| File | Purpose | Dependencies |
|------|---------|--------------|
| `SkyViewNativeView.kt` | Main container view | GLSkyView, OverlayView, Managers |
| `GLSkyView.kt` | OpenGL rendering surface | ShaderProgram, Renderers |
| `managers/CelestialDataManager.kt` | Data validation & caching | Planet, Star models |
| `managers/CrosshairManager.kt` | Object detection at crosshair | CoordinateProjector |
| `rendering/OverlayView.kt` | 2D Canvas overlay | ButtonRenderer, CrosshairRenderer |

---

## Critical Data Flows

### 1. Star Rendering Flow
```
JS: useCelestialData loads stars.json
      ↓
JS: SkyViewScreen passes to NativeSkyView
      ↓
Native: SkyViewNativeViewManager.setStars()
      ↓
Native: CelestialDataManager.setStars() → validates, caches
      ↓
Native: GLSkyView.setStars() → uploads to GPU
      ↓
Native: StarRenderer.render() → draws each frame
```

### 2. Planet Position Update Flow (Time Travel)
```
JS: User changes time via TimeTravelSlider
      ↓
JS: state.selectedTime updates
      ↓
JS: useEffect triggers getAllCelestialBodies(selectedTime)
      ↓
JS: PlanetCalculator uses astronomy-engine for RA/Dec
      ↓
JS: state.dynamicPlanets updates → passed to NativeSkyView
      ↓
Native: setPlanets() → hasPlanetsChanged() check
      ↓
Native: Planet.computePosition() converts RA/Dec to XYZ
      ↓
Native: PlanetRenderer.render() draws with new positions
```

### 3. Crosshair Detection Flow
```
Native: crosshairUpdateRunnable runs every 100ms
      ↓
Native: CrosshairManager.updateCrosshairInfo()
      ↓
Native: updateScreenPositions() → projects XYZ to screen coords
      ↓
Native: findObjectAtScreen() → checks 100px radius
      ↓
Native: OverlayView.setCrosshairInfo(name, type)
      ↓
Native: CrosshairRenderer.draw() → renders text at bottom
```

---

## Known Issues & Fixes

| Issue | Root Cause | Fix Location |
|-------|------------|--------------|
| Flicker on prop changes | Unnecessary GPU re-uploads | CelestialDataManager change detection |
| Planets not moving | astronomy-engine import failed | PlanetCalculator.js: use require() |
| Crosshair name not showing | invalidate() didn't trigger draw | OverlayView.kt: call super.invalidate() |
| APK too large (57MB) | All 4 CPU architectures | gradle.properties: arm64-v8a only |

---

## Regression Prevention Checklist

Before merging new features, verify:

- [ ] Stars render correctly
- [ ] Planets render and move with time travel
- [ ] Crosshair shows star/planet names when hovered
- [ ] Menu/Search/Share buttons work
- [ ] Constellation lines toggle works
- [ ] Night mode toggles correctly
- [ ] Gyroscope orientation works (on device)
- [ ] No visible flicker during normal use
- [ ] Star tap events fire and show info bar
