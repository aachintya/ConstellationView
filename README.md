# Stello - Native Android Astronomy App

A high-performance star map application built with **React Native** and **native Android Kotlin** (OpenGL ES 3.0) rendering. Point your phone at the sky to identify stars, constellations, and planets in real-time.

## ✨ Features

- **60fps OpenGL ES Rendering** - Hardware-accelerated star field with 119K+ stars
- **Gyroscope Navigation** - Smooth sensor-based sky tracking with sensor fusion
- **119,000+ Stars** - Complete HYG star catalog with spectral-accurate colors
- **Constellation Lines** - 88 IAU-recognized constellation patterns
- **Constellation Artwork** - Beautiful mythological artwork overlays
- **Planet Tracking** - Real-time positions of Sun, Moon, Mercury through Neptune
- **Photorealistic Planets** - High-quality texture rendering for solar system objects
- **Time Travel** - View the sky at any date/time with wheel picker controls
- **Night Mode** - Red tinted display for dark adaptation
- **Search** - Find stars, planets, and constellations by name
- **Tap to Identify** - Tap any celestial object for detailed information
- **Modern UI** - Glassmorphism info bars, card-based details modal

## 🏗️ Architecture

This is an **Android-only** app using a hybrid architecture:

| Layer | Technology | Purpose |
|-------|------------|---------|
| UI Controls | React Native | Panels, modals, search |
| Sky Rendering | Native Kotlin (OpenGL ES 3.0) | 60fps star/planet rendering |
| Sensor Fusion | Native Kotlin | Gyroscope smoothing |
| Data | Bundled JSON | Offline star/constellation data |

### Native Kotlin Modules

```
android/app/src/main/java/com/skyviewapp/starfield/
├── SkyViewNativeView.kt        # Main view orchestrator
├── SkyViewNativeViewManager.kt # React Native bridge
├── GLSkyView.kt                # OpenGL surface
├── models/
│   └── CelestialModels.kt      # Star, Planet data classes
├── gl/
│   ├── GLSkyRenderer.kt        # Main OpenGL renderer
│   ├── renderers/              # Star, Planet, Constellation renderers
│   └── ...
├── managers/
│   ├── CelestialDataManager.kt # Data validation/caching
│   ├── CrosshairManager.kt     # Object detection
│   └── TextureManager.kt       # Planet textures
├── projection/
│   └── CoordinateProjector.kt  # RA/Dec → screen coordinate math
├── input/
│   └── GestureHandler.kt       # Touch, drag, pinch-to-zoom
└── sensors/
    └── OrientationManager.kt   # Gyroscope with smoothing
```

### React Native Components

```
src/
├── screens/SkyView/
│   ├── index.js               # Main screen orchestrator
│   ├── hooks/                 # State management hooks
│   └── components/            # StarInfoBar, CoordinatesDisplay
├── components/
│   ├── NativeSkyView.js       # Native view wrapper
│   ├── SearchDrawer.js        # Modern search UI
│   ├── SceneControlsPanel.js  # Settings panel
│   ├── StarDetailsModal.js    # Object info modal
│   └── shared/                # Reusable UI components
├── hooks/
│   ├── useCelestialData.js    # Star/constellation loading
│   └── useGyroscope.js        # Gyro state management
└── utils/
    └── PlanetCalculator.js    # Real-time planet positions
```

## 📱 Requirements

- **Android** device or emulator (API 24+)
- Node.js ≥ 18
- Java 17
- Android Studio with SDK

> ⚠️ This app is **Android-only**. iOS is not supported.

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Start Metro bundler
npm start

# Run on Android (in another terminal)
npm run android
```

## 📦 Building Release APK

```bash
cd android
./gradlew assembleRelease
```

APK location: `android/app/build/outputs/apk/release/app-release.apk`

## 📊 Data Sources

| Data | Source | Count |
|------|--------|-------|
| Stars | [HYG Database](https://github.com/astronexus/HYG-Database) | 119,614 stars |
| Constellations | [Stellarium](https://stellarium.org/) | 88 patterns |
| Planets | astronomy-engine npm package | 10 objects |
| Planet Textures | Custom assets | 10 PNG files |

## 🎮 Controls

| Action | Gesture |
|--------|---------|
| Look around | Move phone (gyro mode) or drag (touch mode) |
| Zoom | Pinch to zoom |
| Identify object | Tap on star/planet, or hover crosshair |
| Open controls | Tap menu button |
| Search | Tap search button |

## 📁 Key Data Files

- `src/data/stars_tiered.json` - Full star catalog (119K stars)
- `src/hooks/useCelestialData.js` - Constellation line data loading
- `src/data/planets.json` - Planet visual properties
- `android/app/src/main/assets/planets/` - Planet texture PNGs
- `android/app/src/main/assets/constellations_artwork.json` - Artwork config

## 📚 Documentation

See the `docs/` folder for detailed documentation:

- [ARCHITECTURE.md](docs/ARCHITECTURE.md) - System architecture
- [COMPONENTS.md](docs/COMPONENTS.md) - React component docs
- [FEATURES.md](docs/FEATURES.md) - Feature catalog
- [NATIVE_API.md](docs/NATIVE_API.md) - Native module API reference

## 📜 License

MIT License

## 🙏 Credits

- Star data: [HYG Database](https://www.astronexus.com/projects/hyg) (CC BY-SA 4.0)
- Constellation patterns: [Stellarium](https://stellarium.org/)
- Planet positions: [astronomy-engine](https://github.com/cosinekitty/astronomy)
- Astronomical algorithms: Jean Meeus
