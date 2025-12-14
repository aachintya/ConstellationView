/**
 * useStarInteraction - Star tap handling and info bar logic
 */
import { useCallback } from 'react';
import { Animated } from 'react-native';

export const useStarInteraction = (
    infoBarAnim,
    selectedStar, setSelectedStar,
    setShowStarModal
) => {
    // Handle star tap from native view - show bottom info bar with animation
    const handleStarTap = useCallback((starData) => {
        console.log('[SkyView] Star tapped:', starData);
        if (starData && (starData.name || starData.id)) {
            infoBarAnim.setValue(0);
            setSelectedStar(starData);
            Animated.spring(infoBarAnim, {
                toValue: 1,
                tension: 65,
                friction: 10,
                useNativeDriver: true,
            }).start();
        }
    }, [infoBarAnim, setSelectedStar]);

    // Open full modal when "i" button is pressed
    const handleOpenStarModal = useCallback(() => {
        if (selectedStar) {
            setShowStarModal(true);
        }
    }, [selectedStar, setShowStarModal]);

    // Close star details modal
    const handleCloseStarModal = useCallback(() => {
        setShowStarModal(false);
    }, [setShowStarModal]);

    // Dismiss the bottom info bar with animation
    const handleDismissStarInfo = useCallback(() => {
        Animated.timing(infoBarAnim, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
        }).start(() => {
            setSelectedStar(null);
            setShowStarModal(false);
        });
    }, [infoBarAnim, setSelectedStar, setShowStarModal]);

    return {
        handleStarTap,
        handleOpenStarModal,
        handleCloseStarModal,
        handleDismissStarInfo,
    };
};

export default useStarInteraction;
