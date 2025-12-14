package com.skyviewapp.starfield.managers

import com.skyviewapp.starfield.models.Planet
import com.skyviewapp.starfield.models.Star
import com.skyviewapp.starfield.projection.CoordinateProjector
import com.skyviewapp.starfield.rendering.OverlayView

/**
 * Manages crosshair tracking and object detection
 * Updates screen positions and finds objects at crosshair/tap locations
 */
class CrosshairManager(
    private val projector: CoordinateProjector,
    private val overlayView: OverlayView
) {
    private var selectedStar: Star? = null

    /**
     * Update all star and planet screen positions based on current view
     */
    fun updateScreenPositions(stars: List<Star>, planets: List<Planet>) {
        for (star in stars) {
            val pos = projector.projectToScreen(star.x, star.y, star.z)
            star.screenX = pos.x
            star.screenY = pos.y
            star.visible = pos.visible
        }

        for (planet in planets) {
            val pos = projector.projectToScreen(planet.x, planet.y, planet.z)
            planet.screenX = pos.x
            planet.screenY = pos.y
            planet.visible = pos.visible
        }
    }

    /**
     * Update crosshair info display based on what's at screen center
     */
    fun updateCrosshairInfo(
        stars: List<Star>,
        planets: List<Planet>,
        starMap: Map<String, Star>,
        screenWidth: Int,
        screenHeight: Int
    ) {
        if (screenWidth == 0 || screenHeight == 0) return

        val centerX = screenWidth / 2f
        val centerY = screenHeight / 2f

        updateScreenPositions(stars, planets)

        // Update debug stars and star map for overlay
        val debugStars = stars.map {
            OverlayView.DebugStar(it.screenX, it.screenY, it.name ?: it.id, it.visible)
        }
        overlayView.setDebugStars(debugStars)
        overlayView.updateStarMap(starMap)

        // Find object at crosshair
        val crosshairPlanet = findObjectAtScreen(planets, centerX, centerY, 80f)
        val crosshairStar = if (crosshairPlanet == null) 
            findObjectAtScreen(stars, centerX, centerY, 50f) else null

        // Update display
        when {
            crosshairPlanet != null -> {
                val type = when (crosshairPlanet.id.lowercase()) {
                    "moon" -> "Moon"
                    "sun" -> "Star"
                    else -> "Planet"
                }
                overlayView.setCrosshairInfo(crosshairPlanet.name, type)
            }
            crosshairStar != null -> {
                val subtitle = crosshairStar.spectralType?.let { "Star ($it-class)" } ?: "Star"
                overlayView.setCrosshairInfo(crosshairStar.name ?: crosshairStar.id, subtitle)
            }
            else -> overlayView.setCrosshairInfo(null, null)
        }

        updateSelectedLabel()
    }

    /**
     * Set the currently selected star
     */
    fun setSelectedStar(star: Star?) {
        selectedStar = if (selectedStar == star) null else star
        updateSelectedLabel()
    }

    /**
     * Update selected star label position
     */
    private fun updateSelectedLabel() {
        selectedStar?.let { star ->
            if (star.visible) {
                overlayView.setSelectedLabel(star.name ?: star.id, star.screenX, star.screenY, star.magnitude)
            } else {
                overlayView.clearSelectedLabel()
            }
        } ?: overlayView.clearSelectedLabel()
    }

    /**
     * Clear selected star
     */
    fun clearSelection() {
        selectedStar = null
        updateSelectedLabel()
    }

    /**
     * Find object near a screen position
     */
    @Suppress("UNCHECKED_CAST")
    fun <T> findObjectAtScreen(objects: List<T>, x: Float, y: Float, radius: Float): T? {
        var closest: T? = null
        var closestDist = Float.MAX_VALUE

        for (obj in objects) {
            val (screenX, screenY, visible) = when (obj) {
                is Star -> Triple(obj.screenX, obj.screenY, obj.visible)
                is Planet -> Triple(obj.screenX, obj.screenY, obj.visible)
                else -> continue
            }
            if (!visible) continue
            val dx = screenX - x
            val dy = screenY - y
            val dist = kotlin.math.sqrt(dx * dx + dy * dy)
            if (dist < radius && dist < closestDist) {
                closestDist = dist
                closest = obj
            }
        }
        return closest
    }
}
