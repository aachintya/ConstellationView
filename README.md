# ConstellationView - Native Android Astronomy App

A high-performance star map application built with **React Native** and **native Android Kotlin** rendering. Point your phone at the sky to identify stars, constellations, and planets in real-time.

## ✨ Features

- **60fps Native Rendering** - Hardware-accelerated star field using Android Canvas
- **Gyroscope Navigation** - Smooth sensor-based sky tracking with complementary filter
- **2,000+ Stars** - High-quality HYG star catalog with spectral-accurate colors
- **Constellation Lines** - 88 IAU-recognized constellation patterns
- **Planet Tracking** - Real-time positions of Sun, Moon, Mercury through Neptune
- **Photorealistic Planets** - High-quality texture rendering for solar system objects
- **Time Travel** - View the sky at any date/time with wheel picker controls
- **Night Mode** - Red/green tinted display for dark adaptation
- **Search** - Find stars, planets, and constellations by name
- **Tap to Identify** - Tap any celestial object for detailed information

## 🏗️ Architecture

This is an **Android-only** app using a hybrid architecture:

| Layer | Technology | Purpose |
|-------|------------|---------|
| UI Controls | React Native | Panels, modals, search |
| Star Rendering | Native Kotlin (Canvas) | 60fps star field |
| Sensor Fusion | Native Kotlin | Gyroscope smoothing |
| Data | Bundled JSON | Offline star/constellation data |

### Native Kotlin Modules

```
android/app/src/main/java/com/skyviewapp/starfield/
├── SkyViewNativeView.kt        # Main view orchestrator (~320 lines)
├── SkyViewNativeViewManager.kt # React Native bridge
├── models/
│   └── CelestialModels.kt      # Star, Planet, ConstellationLine data classes
├── rendering/
│   ├── SkyRenderer.kt          # Canvas drawing logic
│   └── PaintFactory.kt         # Color/paint configuration
├── projection/
│   └── CoordinateProjector.kt  # RA/Dec → screen coordinate math
├── input/
│   └── GestureHandler.kt       # Touch, drag, pinch-to-zoom
└── sensors/
    └── OrientationManager.kt   # Gyroscope with smoothing
```

### React Native Components

```
src/components/
├── NativeStarMap.js         # Main screen with controls
├── NativeSkyView.js         # Native view wrapper
├── SceneControlsPanel.js    # Settings panel
├── TimeTravelControls.js    # Date/time picker
├── SearchDrawer.js          # Search modal
├── StarDetailsModal.js      # Object info modal
└── shared/                  # Reusable UI components
    ├── WheelColumn.js
    ├── CustomSlider.js
    ├── NightModeColors.js
    └── DateTimeGenerators.js
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
| Stars | [HYG Database](https://github.com/astronexus/HYG-Database) | 9,110 stars |
| Constellations | [Stellarium](https://stellarium.org/) | 88 patterns |
| Planets | Orbital elements from NASA JPL | 10 objects |
| Planet Textures | Custom assets | 10 PNG files |

## 🎮 Controls

| Action | Gesture |
|--------|---------|
| Look around | Move phone (gyro mode) or drag (touch mode) |
| Zoom | Pinch to zoom |
| Identify object | Tap on star/planet |
| Open controls | Tap settings button |
| Search | Tap search button |

## 📁 Key Data Files

- `src/data/hyg_stars_full.json` - Full star catalog (2,000 stars)
- `src/data/constellations_full.json` - Constellation line data
- `src/data/planets.json` - Planet orbital elements
- `android/app/src/main/assets/planets/` - Planet texture PNGs

## 🛠️ Development

### Adding Custom Stars
Edit `src/data/hyg_stars_full.json`:
```json
{
  "id": "HIP12345",
  "name": "Star Name",
  "ra": 123.456,
  "dec": -12.345,
  "magnitude": 2.5,
  "spectralType": "G2V"
}
```

### Modifying Native Rendering
Key files in `android/app/src/main/java/com/skyviewapp/starfield/`:
- `rendering/SkyRenderer.kt` - Drawing logic
- `rendering/PaintFactory.kt` - Colors and paint styles

## 📜 License

MIT License

## 🙏 Credits

- Star data: [HYG Database](https://www.astronexus.com/projects/hyg) (CC BY-SA 4.0)
- Constellation patterns: [Stellarium](https://stellarium.org/)
- Planet ephemeris: NASA JPL
- Astronomical algorithms: Jean Meeus
