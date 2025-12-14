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
        updateConstellationLines()
    }

    /**
     * Update planet data - uses change detection to avoid flicker
     */
    fun setPlanets(planetData: List<Map<String, Any>>) {
        // Debug: Log incoming planet positions
        planetData.take(3).forEachIndexed { index, data ->
            val name = data["name"] as? String ?: "?"
            val ra = (data["ra"] as? Number)?.toFloat() ?: 0f
            val dec = (data["dec"] as? Number)?.toFloat() ?: 0f
            Log.d(TAG, "DEBUG_PLANET[$index] $name: RA=${"%.1f".format(ra)}° Dec=${"%.1f".format(dec)}°")
        }

        val changed = hasPlanetsChanged(planetData)
        Log.d(TAG, "DEBUG_PLANET: count=${planetData.size} changed=$changed")

        if (planetData.size == planets.size && !changed) {
            Log.d(TAG, "DEBUG_PLANET: SKIPPING update - no change detected")
            return // No change detected, skip update
        }

        Log.d(TAG, "DEBUG_PLANET: UPDATING - rebuilding planet list")
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
        glSkyView.setConstellationArtworks(constellationArtworks, stars)
        updateConstellationLines()
    }

    /**
     * Build constellation lines from artwork data
     */
    private fun updateConstellationLines() {
        val lineVertices = mutableListOf<Float>()

        for (artwork in constellationArtworks) {
            for (lineArray in artwork.lines) {
                if (lineArray.size < 2) continue
                for (i in 0 until lineArray.size - 1) {
                    val star1 = starMap["HIP${lineArray[i]}"]
                    val star2 = starMap["HIP${lineArray[i + 1]}"]
                    if (star1 != null && star2 != null) {
                        lineVertices.addAll(listOf(star1.x, star1.y, star1.z, star2.x, star2.y, star2.z))
                    }
                }
            }
        }

        val vertexArray = lineVertices.toFloatArray()
        glSkyView.setConstellationLines(vertexArray, vertexArray.size / 3)
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
