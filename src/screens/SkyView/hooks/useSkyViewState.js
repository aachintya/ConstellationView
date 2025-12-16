/**
 * useSkyViewState - Central state management for SkyViewScreen
 */
import { useState, useRef } from 'react';
import { Animated } from 'react-native';

export const useSkyViewState = () => {
    // Display state
    const [showConstellations, setShowConstellations] = useState(true);
    const [dynamicPlanets, setDynamicPlanets] = useState([]);
    const [showSearchDrawer, setShowSearchDrawer] = useState(false);
    const [targetObject, setTargetObject] = useState(null);
    const [showCoordinates, setShowCoordinates] = useState(false);
    const [showSceneControls, setShowSceneControls] = useState(false);
    const [nightMode, setNightMode] = useState('off');
    const [showLabels, setShowLabels] = useState(true);
    const [starBrightness, setStarBrightness] = useState(0.7);
    const [planetVisibility, setPlanetVisibility] = useState(0.7);
    const [cardinalPointsVisible, setCardinalPointsVisible] = useState(true);
    const [azimuthalGridVisible, setAzimuthalGridVisible] = useState(false);
    const [showConstellationArtwork, setShowConstellationArtwork] = useState(true);
    const [showConstellationLines, setShowConstellationLines] = useState(true);

    // Time Travel state
    const [selectedTime, setSelectedTime] = useState(() => new Date());
    const [showTimeTravel, setShowTimeTravel] = useState(false);

    // Star details state
    const [selectedStar, setSelectedStar] = useState(null);
    const [showStarModal, setShowStarModal] = useState(false);

    // Info bar animation
    const infoBarAnim = useRef(new Animated.Value(0)).current;
    const infoBarTranslateY = infoBarAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [150, 0],
    });
    const infoBarOpacity = infoBarAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0, 1],
    });

    // Hint animation  
    const hintOpacity = useRef(new Animated.Value(1)).current;

    return {
        // Display state
        showConstellations, setShowConstellations,
        dynamicPlanets, setDynamicPlanets,
        showSearchDrawer, setShowSearchDrawer,
        targetObject, setTargetObject,
        showCoordinates, setShowCoordinates,
        showSceneControls, setShowSceneControls,
        nightMode, setNightMode,
        showLabels, setShowLabels,
        starBrightness, setStarBrightness,
        planetVisibility, setPlanetVisibility,
        cardinalPointsVisible, setCardinalPointsVisible,
        azimuthalGridVisible, setAzimuthalGridVisible,
        showConstellationArtwork, setShowConstellationArtwork,
        showConstellationLines, setShowConstellationLines,
        // Time state
        selectedTime, setSelectedTime,
        showTimeTravel, setShowTimeTravel,
        // Star details state
        selectedStar, setSelectedStar,
        showStarModal, setShowStarModal,
        // Animations
        infoBarAnim, infoBarTranslateY, infoBarOpacity,
        hintOpacity,
    };
};

export default useSkyViewState;
