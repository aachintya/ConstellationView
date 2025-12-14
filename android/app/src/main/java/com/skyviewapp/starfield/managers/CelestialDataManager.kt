package com.skyviewapp.starfield.managers

import android.util.Log
import com.skyviewapp.starfield.GLSkyView
import com.skyviewapp.starfield.data.ConstellationDataLoader
import com.skyviewapp.starfield.models.ConstellationArt
import com.skyviewapp.starfield.models.Planet
import com.skyviewapp.starfield.models.Star

/**
 * Manages celestial data (stars, planets, constellations)
 * Handles data validation, change detection, and GL renderer updates
 */
class CelestialDataManager(
    private val glSkyView: GLSkyView,
    private val constellationLoader: ConstellationDataLoader
) {
    companion object {
        private const val TAG = "CelestialDataManager"
    }

    // Data collections
    val stars = mutableListOf<Star>()
    val planets = mutableListOf<Planet>()
    val constellationArtworks = mutableListOf<ConstellationArt>()
    val starMap = mutableMapOf<String, Star>()

    /**
     * Update star data - skips if count unchanged (stars are static)
     */
    fun setStars(starData: List<Map<String, Any>>) {
        if (starData.size == stars.size && stars.isNotEmpty()) {
            return // Stars are static data, no need to re-upload
        }

        stars.clear()
        starMap.clear()
        for (data in starData) {
            val star = Star.fromMap(data)
            stars.add(star)
            starMap[star.id] = star
        }

        glSkyView.setStars(stars)
        
        // Re-upload constellations if they exist (lines depend on star positions)
        if (constellationArtworks.isNotEmpty()) {
            glSkyView.setConstellationArtworks(constellationArtworks, stars)
        }
    }

    /**
     * Update planet data - uses change detection to avoid flicker
     */
    fun setPlanets(planetData: List<Map<String, Any>>) {
        if (planetData.size == planets.size && !hasPlanetsChanged(planetData)) {
            return // No change detected, skip update
        }

        planets.clear()
        for (data in planetData) {
            planets.add(Planet.fromMap(data))
        }
        glSkyView.setPlanets(planets)
        updateSunDirection()
    }

    /**
     * Update constellation data - skips if count unchanged
     */
    fun setConstellations(
        constData: List<Map<String, Any>>,
        overlayCallback: (List<ConstellationArt>) -> Unit
    ) {
        if (constData.size == constellationArtworks.size && constellationArtworks.isNotEmpty()) {
            return
        }

        constellationArtworks.clear()
        constellationLoader.loadConfigs()

        for (data in constData) {
            val id = data["id"] as? String ?: ""
            constellationLoader.getArtworkConfig(id)?.let { config ->
                constellationArtworks.add(
                    ConstellationArt(
                        id = id,
                        name = data["name"] as? String ?: id,
                        imageName = config.imageName,
                        imageSize = config.imageSize,
                        anchors = config.anchors,
                        lines = config.lines
                    )
                )
            }
        }

        Log.d(TAG, "Loaded ${constellationArtworks.size} constellation artworks")
        overlayCallback(constellationArtworks)
        // setConstellationArtworks now handles both artwork AND per-constellation lines
        glSkyView.setConstellationArtworks(constellationArtworks, stars)
    }

    /**
     * Update sun direction for planet lighting
     */
    private fun updateSunDirection() {
        val sun = planets.find { it.id.lowercase() == "sun" } ?: return
        val length = kotlin.math.sqrt(sun.x * sun.x + sun.y * sun.y + sun.z * sun.z)
        if (length > 0.001f) {
            glSkyView.setSunDirection(sun.x / length, sun.y / length, sun.z / length)
        }
    }

    /**
     * Check if any planet has changed position
     */
    private fun hasPlanetsChanged(planetData: List<Map<String, Any>>): Boolean {
        for ((index, data) in planetData.withIndex()) {
            val existing = planets.getOrNull(index) ?: return true
            val newRa = (data["ra"] as? Number)?.toFloat() ?: 0f
            val newDec = (data["dec"] as? Number)?.toFloat() ?: 0f
            val raDiff = kotlin.math.abs(existing.ra - newRa)
            val decDiff = kotlin.math.abs(existing.dec - newDec)
            if (raDiff > 0.01f || decDiff > 0.01f) return true
        }
        return false
    }
}
