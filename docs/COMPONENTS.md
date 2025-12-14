# React Component Documentation

> **Last Updated**: December 14, 2024  
> **Purpose**: Document React components, hooks, and JavaScript utilities

---

## Directory Structure

```
src/
├── App.js                      # Main app entry
├── components/                 # Reusable components
│   ├── NativeSkyView.js       ★ Native bridge wrapper
│   ├── TimeTravelSlider.js    ★ Time selection component
│   └── ...
├── hooks/                      # Custom React hooks
│   └── useCelestialData.js    ★ Star/planet data loading
├── screens/                    # Screen components
│   ├── SkyView/               ★ Main sky view screen (modular)
│   │   ├── index.js           ★ Main orchestrator
│   │   ├── hooks/
│   │   └── components/
│   └── SkyViewScreen.js        # Legacy redirect
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
  // - showConstellations, showPlanets, showArtwork (toggles)
  // - fov, gyroEnabled, simulatedTime, nightMode (controls)
  // - onStarTap, onMenuPress, onSearchPress, onSharePress (callbacks)
});
```

### SkyView/index.js
**Purpose**: Main screen orchestrator. Manages state and passes data to native view.

```javascript
// Location: src/screens/SkyView/index.js

// Uses these hooks:
import { useSkyViewState } from './hooks/useSkyViewState';
import { useNavigation as useSkyNavigation } from './hooks/useNavigation';
import { useStarInteraction } from './hooks/useStarInteraction';

// Key state:
// - state.selectedTime - current/simulated time
// - state.dynamicPlanets - calculated planet positions
// - state.showConstellations, state.nightMode, etc.

// Key effect (line ~82):
useEffect(() => {
  const bodies = getAllCelestialBodies(state.selectedTime, location);
  state.setDynamicPlanets(bodies);
}, [location, state.selectedTime]);
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
}

export function getPlanetPosition(planetName, date, location) {
  // Returns single planet position
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
  const [showConstellations, setShowConstellations] = useState(true);
  const [nightMode, setNightMode] = useState('off');
  const [selectedStar, setSelectedStar] = useState(null);
  // ... more
  
  return { ...state, setters };
}
```

### useNavigation (SkyView)
**Location**: `src/screens/SkyView/hooks/useNavigation.js`

Navigation state and coordinate formatting.

```javascript
function useNavigation(location, selectedTime) {
  // Calculates LST (Local Sidereal Time)
  // Formats RA/Dec coordinates for display
  // Returns: { lst, formatRA, formatDec }
}
```

### useStarInteraction
**Location**: `src/screens/SkyView/hooks/useStarInteraction.js`

Star tap handling and info bar animations.

```javascript
function useStarInteraction(stars) {
  // Handles: handleStarTap(starId, starName)
  // Manages: selectedStar state, info bar animation
  // Returns: { selectedStar, handleStarTap, infoBarAnim }
}
```

---

## UI Components

### StarInfoBar
**Location**: `src/screens/SkyView/components/StarInfoBar.js`

Animated bottom bar showing selected star info.

### CoordinatesDisplay
**Location**: `src/screens/SkyView/components/CoordinatesDisplay.js`

Shows current viewing direction coordinates.

### TimeTravelSlider
**Location**: `src/components/TimeTravelSlider.js`

Slider for selecting date/time for sky simulation.

---

## Data Files

| File | Purpose | Format |
|------|---------|--------|
| `src/data/stars.json` | ~500 named star catalog | Array of Star objects |
| `src/data/constellations.json` | Constellation definitions | Array with star connections |

---

## Unused/Legacy Files (Audit Needed)

| File | Status | Notes |
|------|--------|-------|
| `SkyViewScreen.js` | LEGACY | Redirects to SkyView/index.js |
| Various in `components/` | CHECK | May be unused legacy |
