package com.skyviewapp.starfield.managers

import android.util.Log
import com.skyviewapp.starfield.GLSkyView
import com.skyviewapp.starfield.models.Star

/**
 * Manages dynamic star loading based on FOV (zoom level)
 * 
 * Uses SMOOTH magnitude-based filtering (not tier-based):
 * - Calculates a "limiting magnitude" based on current FOV
 * - Stars dimmer than the limit are hidden
 * - As FOV decreases (zoom in), limiting magnitude increases, showing more stars
 * 
 * This provides smooth, gradual star appearance like Stellarium.
 * 
 * Limiting magnitude formula:
 * - FOV 120°: mag limit 2.5 (brightest ~80 stars)
 * - FOV 60°:  mag limit 3.5 (~300 stars)
 * - FOV 30°:  mag limit 4.5 (~700 stars)
 * - FOV 15°:  mag limit 5.5 (~1300 stars)
 * - FOV 5°:   mag limit 6.5 (~2100 stars - naked eye limit)
 */
class DynamicStarManager(private val glSkyView: GLSkyView) {
    companion object {
        private const val TAG = "DynamicStarManager"
        
        // Magnitude limits at different FOV values (for interpolation)
        // Wide view: show more stars (not too sparse)
        // Deep zoom: show ALL stars including dimmest
        private const val MAG_AT_FOV_150 = 3.8f   // Ultra-wide: ~500 stars visible (not sparse)
        private const val MAG_AT_FOV_75 = 5.0f    // Normal view: ~2000 stars
        private const val MAG_AT_FOV_5 = 8.0f     // Deep zoom: ALL stars (7833+)
        
        // FOV range for interpolation
        private const val FOV_MAX = 150f
        private const val FOV_MIN = 0.1f  // Extended to support extreme zoom
        
        // Minimum change in limiting magnitude to trigger update (for performance)
        private const val MAG_CHANGE_THRESHOLD = 0.2f
    }
    
    // All stars (complete catalog)
    private val allStars = mutableListOf<Star>()
    
    // Current visible stars (filtered by magnitude)
    private val visibleStars = mutableListOf<Star>()
    
    // Map for quick lookup
    val starMap = mutableMapOf<String, Star>()
    
    // Current state
    private var currentFov = 75f
    private var currentLimitingMag = 3.0f
    private var lastAppliedMag = 0f
    
    // Callbacks
    var onStarsUpdated: (() -> Unit)? = null
    
    /**
     * Set star data from JSON
     */
    fun setStars(starData: List<Map<String, Any>>) {
        allStars.clear()
        starMap.clear()
        
        for (data in starData) {
            val star = Star.fromMap(data)
            allStars.add(star)
            starMap[star.id] = star
        }
        
        // Sort by magnitude (brightest first) for efficient filtering
        allStars.sortBy { it.magnitude }
        
        Log.d(TAG, "Loaded ${allStars.size} stars, sorted by magnitude")
        Log.d(TAG, "Magnitude range: ${allStars.firstOrNull()?.magnitude} to ${allStars.lastOrNull()?.magnitude}")
        
        // Initial update with current FOV
        lastAppliedMag = 0f  // Force update
        updateVisibleStars(currentFov)
    }
    
    /**
     * Set tiered star data (backwards compatibility)
     */
    fun setTieredStars(tieredData: Map<String, List<Map<String, Any>>>) {
        val allData = mutableListOf<Map<String, Any>>()
        tieredData["tier1"]?.let { allData.addAll(it) }
        tieredData["tier2"]?.let { allData.addAll(it) }
        tieredData["tier3"]?.let { allData.addAll(it) }
        tieredData["tier4"]?.let { allData.addAll(it) }
        tieredData["tier5"]?.let { allData.addAll(it) }
        tieredData["tier6"]?.let { allData.addAll(it) }  // Extended tier for deep zoom
        setStars(allData)
    }
    
    /**
     * Calculate limiting magnitude based on FOV
     * Uses piecewise interpolation for better star density at all zoom levels
     */
    private fun calculateLimitingMagnitude(fov: Float): Float {
        // Clamp FOV to valid range
        val clampedFov = fov.coerceIn(FOV_MIN, FOV_MAX)
        
        // Piecewise interpolation for better star density control:
        // - Wide view (150° - 75°): mag 3.8 to 5.0 (~500 to ~2000 stars)
        // - Normal view (75° - 20°): mag 5.0 to 6.5 (~2000 to ~5800 stars)  
        // - Close view (20° - 5°): mag 6.5 to 7.5 (~5800 to ~7800 stars)
        // - Deep zoom (< 5°): mag 7.5 to 8.0 (all stars)
        
        val limitingMag = when {
            clampedFov >= 75f -> {
                // Wide view: 150° -> 3.8, 75° -> 5.0
                val t = (150f - clampedFov) / (150f - 75f)
                3.8f + t * (5.0f - 3.8f)
            }
            clampedFov >= 20f -> {
                // Normal to medium zoom: 75° -> 5.0, 20° -> 6.5
                val t = (75f - clampedFov) / (75f - 20f)
                5.0f + t * (6.5f - 5.0f)
            }
            clampedFov >= 5f -> {
                // Close zoom: 20° -> 6.5, 5° -> 7.5
                val t = (20f - clampedFov) / (20f - 5f)
                6.5f + t * (7.5f - 6.5f)
            }
            else -> {
                // Deep zoom (< 5°): 5° -> 7.5, 0.1° -> 8.0 (show ALL stars)
                val t = (5f - clampedFov) / (5f - FOV_MIN)
                7.5f + t * (8.0f - 7.5f)
            }
        }
        
        return limitingMag
    }
    
    /**
     * Update visible stars based on current FOV
     * Call this when FOV changes
     */
    fun updateVisibleStars(fov: Float) {
        currentFov = fov
        val newLimitingMag = calculateLimitingMagnitude(fov)
        currentLimitingMag = newLimitingMag
        
        // Only rebuild if magnitude changed significantly (for performance)
        val magDelta = kotlin.math.abs(newLimitingMag - lastAppliedMag)
        if (magDelta < MAG_CHANGE_THRESHOLD && visibleStars.isNotEmpty()) {
            return
        }
        
        rebuildVisibleStars(newLimitingMag)
    }
    
    /**
     * Force a complete rebuild of visible stars
     */
    fun forceUpdate() {
        lastAppliedMag = 0f
        updateVisibleStars(currentFov)
    }
    
    /**
     * Rebuild the visible star list based on limiting magnitude
     */
    private fun rebuildVisibleStars(limitingMag: Float) {
        val startTime = System.currentTimeMillis()
        val oldCount = visibleStars.size
        
        visibleStars.clear()
        
        // Since stars are sorted by magnitude, we can stop early
        for (star in allStars) {
            if (star.magnitude <= limitingMag) {
                visibleStars.add(star)
            } else {
                // All remaining stars are dimmer, stop here
                break
            }
        }
        
        lastAppliedMag = limitingMag
        
        val elapsed = System.currentTimeMillis() - startTime
        Log.d(TAG, "FOV: ${"%.1f".format(currentFov)}° -> limit mag ${"%.2f".format(limitingMag)}, " +
                   "$oldCount -> ${visibleStars.size} stars (${elapsed}ms)")
        
        // IMPORTANT: Pass a copy of the list to avoid race conditions with GL thread
        val starsCopy = ArrayList(visibleStars)
        
        // Update the GL renderer with the copy
        glSkyView.setStars(starsCopy)
        
        // Notify listeners
        onStarsUpdated?.invoke()
    }
    
    /**
     * Get all currently visible stars
     */
    fun getVisibleStars(): List<Star> = visibleStars
    
    /**
     * Get all stars (unfiltered)
     */
    fun getAllStars(): List<Star> = allStars
    
    /**
     * Get current limiting magnitude
     */
    fun getLimitingMagnitude(): Float = currentLimitingMag
    
    /**
     * Get star counts
     */
    fun getStarCounts(): Map<String, Int> = mapOf(
        "visible" to visibleStars.size,
        "total" to allStars.size,
        "limitingMag" to currentLimitingMag.toInt()
    )
    
    /**
     * Find star by ID
     */
    fun findStarById(id: String): Star? = starMap[id]
    
    /**
     * Find star by name
     */
    fun findStarByName(name: String): Star? {
        return starMap.values.find { 
            it.name?.equals(name, ignoreCase = true) == true 
        }
    }
}
