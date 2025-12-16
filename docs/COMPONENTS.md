# React Component Documentation

> **Last Updated**: December 15, 2024  
> **App Name**: Stello
> **Purpose**: Document React components, hooks, and JavaScript utilities

---

## Directory Structure

```
src/
├── App.js                      # Main app entry
├── components/                 # Reusable components
│   ├── NativeSkyView.js       ★ Native bridge wrapper
│   ├── SearchDrawer.js        ★ Star/planet search UI
│   ├── SceneControlsPanel.js  ★ Scene controls (constellations, time)
│   ├── SettingsPanel.js       ★ Location settings
│   ├── StarDetailsModal.js    ★ Star details popup
│   └── shared/                 # Shared UI components
├── hooks/                      # Custom React hooks
│   ├── useCelestialData.js    ★ Star/planet data loading
│   ├── useGyroscope.js        ★ Device orientation
│   └── useLocation.js         ★ GPS location
├── screens/                    # Screen components
│   ├── SkyView/               ★ Main sky view screen (modular)
│   │   ├── index.js           ★ Main orchestrator
│   │   ├── hooks/
│   │   │   ├── useSkyViewState.js
│   │   │   ├── useNavigation.js
│   │   │   └── useStarInteraction.js
│   │   └── components/
│   │       ├── StarInfoBar.js
│   │       └── CoordinatesDisplay.js
│   └── SkyViewScreen.js        # Re-export for backward compat
└── utils/                      # Utility functions
    └── PlanetCalculator.js    ★ Astronomy calculations
```

★ = Active/Critical files

---

## Critical Components

### NativeSkyView.js
**Purpose**: Wrapper for the native Android SkyViewNativeView.

```javascript
// Location: src/components/NativeSkyView.js

const NativeSkyView = React.memo(function NativeSkyView(props) {
  // Wraps requireNativeComponent('SkyViewNativeView')
  // Handles callback props for buttons and star taps
  
  // Props:
  // - stars, planets, constellations (data arrays)
  // - fov, gyroEnabled, simulatedTime, nightMode (controls)
  // - navigateToCoordinates (RA/Dec for camera navigation)
  // - onStarTap, onMenuPress, onSearchPress, onSharePress (callbacks)
});
```

### SkyView/index.js
**Purpose**: Main screen orchestrator. Manages state and passes data to native view.

```javascript
// Location: src/screens/SkyView/index.js

// Uses these hooks:
import { useSkyViewState } from './hooks/useSkyViewState';
import { useNavigation } from './hooks/useNavigation';
import { useStarInteraction } from './hooks/useStarInteraction';

// Key state:
// - state.selectedTime - current/simulated time
// - state.dynamicPlanets - calculated planet positions
// - state.nightMode, state.showSearchDrawer, etc.

// Key effect:
useEffect(() => {
  const bodies = getAllCelestialBodies(state.selectedTime, location);
  state.setDynamicPlanets(bodies);
}, [location, state.selectedTime]);
```

### SearchDrawer.js
**Purpose**: Modern search UI for finding stars, planets, and constellations.

```javascript
// Location: src/components/SearchDrawer.js

// Features:
// - Search bar with real-time filtering
// - Filter chips (Stars, Planets, Constellations)
// - Rich result cards with magnitude info
// - Popular stars section when no search query
// - Includes Sun in planet results
```

### useCelestialData.js
**Purpose**: Loads static star/constellation data. Planets are calculated separately.

```javascript
// Location: src/hooks/useCelestialData.js

function useCelestialData(location) {
  // Returns:
  // - stars: { list: Star[], loading, error }
  // - constellations: { list: Constellation[], loading, error }
  // - planets: { list: Planet[] } - STATIC defaults, not real-time
}
```

**Note**: Real-time planet positions are calculated in SkyView/index.js using PlanetCalculator.

### PlanetCalculator.js
**Purpose**: Calculates real-time planet positions using astronomy-engine.

```javascript
// Location: src/utils/PlanetCalculator.js

// CRITICAL: Must use require() not import
const Astronomy = require('astronomy-engine');

export function getAllCelestialBodies(date, location) {
  // Returns array of planet objects with RA/Dec for given date/time
  // Excludes Sun for rendering (added separately for search)
}

export function getSunPosition(date, location) {
  // Returns Sun position for search functionality
}
```

---

## Custom Hooks

### useSkyViewState
**Location**: `src/screens/SkyView/hooks/useSkyViewState.js`

Central state management for SkyView screen.

```javascript
function useSkyViewState() {
  // State includes:
  const [selectedTime, setSelectedTime] = useState(new Date());
  const [dynamicPlanets, setDynamicPlanets] = useState([]);
  const [nightMode, setNightMode] = useState('off');
  const [selectedStar, setSelectedStar] = useState(null);
  const [showSearchDrawer, setShowSearchDrawer] = useState(false);
  const [showSceneControls, setShowSceneControls] = useState(false);
  // ... more
  
  return { ...state, setters };
}
```

### useNavigation (SkyView)
**Location**: `src/screens/SkyView/hooks/useNavigation.js`

Navigation state and coordinate formatting.

```javascript
function useNavigation(location, setOrientation, setTargetObject, setShowCoordinates) {
  // Calculates LST (Local Sidereal Time)
  // Formats RA/Dec coordinates for display
  // Navigates camera to celestial object
  // Returns: { navigateToObject }
}
```

### useStarInteraction
**Location**: `src/screens/SkyView/hooks/useStarInteraction.js`

Star tap handling and info bar animations.

```javascript
function useStarInteraction(infoBarAnim, selectedStar, setSelectedStar, setShowStarModal) {
  // Handles: handleStarTap(starData)
  // Manages: info bar animation, star selection
  // Returns: { handleStarTap, handleCloseInfoBar, handleShowDetails }
}
```

---

## UI Components

### StarInfoBar
**Location**: `src/screens/SkyView/components/StarInfoBar.js`

Modern glassmorphism bottom bar showing selected star info with:
- Dynamic accent color based on spectral type
- Quick stats (magnitude, RA/Dec)
- Info and close buttons

### StarDetailsModal
**Location**: `src/components/StarDetailsModal.js`

Full-screen modal with detailed star information:
- Card-based stats layout
- Spectral type coloring
- Physical properties section

### SceneControlsPanel
**Location**: `src/components/SceneControlsPanel.js`

Controls for scene settings:
- Constellation lines toggle
- Night mode selection
- Time travel picker

### CoordinatesDisplay
**Location**: `src/screens/SkyView/components/CoordinatesDisplay.js`

Shows RA/Dec coordinates when navigating to objects.

---

## Data Files

| File | Purpose | Format |
|------|---------|--------|
| `src/data/stars_tiered.json` | Full star catalog (~119K stars) | Tiered by magnitude |
| `src/data/planets.json` | Planet visual properties | Array with textures |

---

## Deleted Files (Cleanup Dec 15, 2024)

| File | Reason |
|------|--------|
| `HYGdata.csv` | 33MB raw data, only used by scripts |
| `src/data/stars_100.json` | Replaced by stars_tiered.json |
| `src/utils/astronomy.js` | Unused |
| `src/utils/coordinates.js` | Unused |
| `appicons/` | Icons already copied to mipmap |
