# SkyView MVP - React Native Astronomy App

A 2D star map application built with bare React Native that allows users to identify stars, constellations, and planets using device orientation (gyroscope/accelerometer).

![SkyView App](./screenshots/app.png)

## Features

- **2D Star Map**: View over 90 of the brightest stars in the night sky
- **Gyroscope Navigation**: Move your phone to explore different parts of the sky
- **Constellation Lines**: See the connections between stars forming constellations
- **Planet Tracking**: View current positions of planets (Mercury through Neptune)
- **Object Information**: Tap on any star or planet to see detailed information
- **Search**: Find specific stars, planets, or constellations
- **Night Mode**: Red-tinted interface to preserve dark adaptation

## Tech Stack

- **React Native CLI** (bare workflow)
- **react-native-svg** for 2D rendering
- **react-native-sensors** for gyroscope/accelerometer
- **Bundled JSON data** for offline operation

## Project Structure

```
SkyViewApp/
├── src/
│   ├── components/
│   │   ├── StarMap.js          # Main 2D star map canvas
│   │   ├── InfoPanel.js        # Object details panel
│   │   ├── SearchBar.js        # Search functionality
│   │   ├── ControlPanel.js     # Toggle controls
│   │   └── OrientationDisplay.js
│   ├── data/
│   │   ├── stars.json          # ~90 brightest stars
│   │   ├── constellations.json # 34 constellations
│   │   └── planets.json        # Solar system planets
│   ├── hooks/
│   │   ├── useGyroscope.js     # Sensor fusion hook
│   │   └── useCelestialData.js # Data management
│   ├── utils/
│   │   ├── coordinates.js      # RA/Dec conversions
│   │   └── astronomy.js        # Planet positions
│   ├── screens/
│   │   └── SkyViewScreen.js    # Main screen
│   ├── styles/
│   │   └── theme.js            # Light/Night themes
│   └── App.js
├── android/                    # Native Android code
├── ios/                        # Native iOS code
└── package.json
```

## Prerequisites

- Node.js >= 18
- React Native CLI
- Android Studio with SDK (for Android)
- Xcode (for iOS, macOS only)

## Installation

1. Clone or navigate to the project:
   ```bash
   cd SkyViewApp
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. For iOS (macOS only):
   ```bash
   cd ios && pod install && cd ..
   ```

## Running the App

### Android

```bash
# Start Metro bundler
npm start

# In another terminal, run on Android
npm run android
```

### iOS (macOS only)

```bash
npm run ios
```

## Building Release APK

1. Generate a signing key (first time only):
   ```bash
   cd android/app
   keytool -genkeypair -v -storetype PKCS12 -keystore my-upload-key.keystore -alias my-key-alias -keyalg RSA -keysize 2048 -validity 10000
   ```

2. Configure signing in `android/gradle.properties`:
   ```properties
   MYAPP_UPLOAD_STORE_FILE=my-upload-key.keystore
   MYAPP_UPLOAD_KEY_ALIAS=my-key-alias
   MYAPP_UPLOAD_STORE_PASSWORD=*****
   MYAPP_UPLOAD_KEY_PASSWORD=*****
   ```

3. Build the APK:
   ```bash
   cd android
   ./gradlew assembleRelease
   ```

4. Find the APK at:
   ```
   android/app/build/outputs/apk/release/app-release.apk
   ```

## Data Sources

All celestial data is bundled with the app for offline operation:

| Data | Source | License |
|------|--------|---------|
| Stars | [HYG Database](https://github.com/astronexus/HYG-Database) derivative | CC BY-SA 2.5 |
| Constellations | [IAU](https://www.iau.org/public/themes/constellations/) | Public Domain |
| Planets | Orbital elements from [NASA JPL](https://ssd.jpl.nasa.gov/) | Public Domain |

## How It Works

### Coordinate System
1. Stars are stored in **equatorial coordinates** (Right Ascension, Declination)
2. Device sensors provide **orientation** (azimuth/heading, altitude/tilt)
3. The app converts RA/Dec → horizontal coordinates (Az/Alt) based on:
   - Observer's location (latitude/longitude)
   - Current date/time
4. **Stereographic projection** maps the sky dome onto the 2D screen

### Gyroscope Integration
- Accelerometer determines device tilt (altitude)
- Magnetometer provides compass heading (azimuth)
- Sensor fusion combines both for stable orientation
- Exponential smoothing reduces jitter

## Customization

### Adding More Stars
Edit `src/data/stars.json` to add entries:
```json
{
  "id": "HIP12345",
  "name": "Star Name",
  "constellation": "ORI",
  "ra": 123.456,
  "dec": -12.345,
  "magnitude": 2.5,
  "spectralType": "G2V",
  "distance": 100
}
```

### Changing Default Location
Edit `src/hooks/useGyroscope.js`:
```javascript
const DEFAULT_LOCATION = {
  latitude: YOUR_LATITUDE,
  longitude: YOUR_LONGITUDE,
};
```

## Known Limitations

- Simplified planet positions (mean orbital elements, not full ephemeris)
- No satellite tracking in MVP
- Requires device with accelerometer and magnetometer
- Star catalog limited to ~90 brightest stars

## Future Enhancements

- [ ] Full Hipparcos catalog (9000+ stars)
- [ ] AR camera overlay
- [ ] Time travel (view sky at different dates)
- [ ] Satellite tracking (ISS, etc.)
- [ ] GPS-based automatic location

## License

MIT License - Feel free to use and modify for your needs.

## Credits

- Astronomical calculations based on Jean Meeus' "Astronomical Algorithms"
- Star data from the HYG Database project
- Constellation data from the International Astronomical Union
