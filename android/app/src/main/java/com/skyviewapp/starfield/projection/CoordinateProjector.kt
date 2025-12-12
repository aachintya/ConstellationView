package com.skyviewapp.starfield.projection

import kotlin.math.*

/**
 * Handles coordinate projection from celestial (RA/Dec) to screen coordinates
 * Uses 3D rotation matrices for accurate sky projection
 */
class CoordinateProjector {
    
    // View parameters
    var fov: Float = 75f
    var latitude: Float = 28.6f
    var longitude: Float = 77.2f
    var lst: Float = 0f  // Local Sidereal Time
    
    // Orientation (from sensors or touch)
    var smoothAzimuth: Float = 180f
    var smoothAltitude: Float = 30f
    
    // Screen dimensions
    private var screenWidth: Float = 0f
    private var screenHeight: Float = 0f

    data class ScreenPosition(
        val x: Float,
        val y: Float,
        val visible: Boolean
    )

    /**
     * Update screen dimensions
     */
    fun setScreenSize(width: Int, height: Int) {
        screenWidth = width.toFloat()
        screenHeight = height.toFloat()
    }

    /**
     * Calculate scale factor based on FOV
     */
    fun getScale(): Float {
        val fovRad = Math.toRadians(fov.toDouble())
        return (screenWidth / (2 * tan(fovRad / 2))).toFloat()
    }

    /**
     * Update Local Sidereal Time from timestamp and longitude
     */
    fun updateLst(simulatedTime: Long) {
        val jd = simulatedTime / 86400000.0 + 2440587.5
        val t = (jd - 2451545.0) / 36525.0
        var gmst = 280.46061837 + 360.98564736629 * (jd - 2451545.0) +
                0.000387933 * t * t - t * t * t / 38710000.0
        gmst = ((gmst % 360.0) + 360.0) % 360.0
        lst = ((gmst + longitude + 360.0) % 360.0).toFloat()
    }

    /**
     * Project a celestial object to screen coordinates
     * @param x Pre-computed X component of unit vector
     * @param y Pre-computed Y component of unit vector  
     * @param z Pre-computed Z component of unit vector
     * @return ScreenPosition with x, y coordinates and visibility flag
     */
    fun projectToScreen(x: Float, y: Float, z: Float): ScreenPosition {
        val centerX = screenWidth / 2f
        val centerY = screenHeight / 2f
        val scale = getScale()

        val azRad = Math.toRadians(smoothAzimuth.toDouble())
        val altRad = Math.toRadians(smoothAltitude.toDouble())
        val lstRad = Math.toRadians(-lst.toDouble())
        val latRad = Math.toRadians((90 - latitude).toDouble())

        // Rotate by LST
        val cosLst = cos(lstRad)
        val sinLst = sin(lstRad)
        val x1 = x * cosLst - y * sinLst
        val y1 = x * sinLst + y * cosLst
        val z1 = z.toDouble()

        // Rotate by latitude
        val cosLat = cos(latRad)
        val sinLat = sin(latRad)
        val y2 = y1 * cosLat - z1 * sinLat
        val z2 = y1 * sinLat + z1 * cosLat

        // Rotate by azimuth
        val cosAz = cos(azRad)
        val sinAz = sin(azRad)
        val x3 = x1 * cosAz - y2 * sinAz
        val y3 = x1 * sinAz + y2 * cosAz

        // Rotate by altitude
        val cosAlt = cos(altRad)
        val sinAlt = sin(altRad)
        val y4 = y3 * cosAlt - z2 * sinAlt
        val z4 = y3 * sinAlt + z2 * cosAlt

        // Cull if behind camera
        if (y4 <= 0.01) {
            return ScreenPosition(0f, 0f, false)
        }

        // Perspective projection
        val screenX = (centerX + (x3 / y4) * scale).toFloat()
        val screenY = (centerY - (z4 / y4) * scale).toFloat()

        // Cull if off screen (with margin)
        val margin = 100f
        if (screenX < -margin || screenX > screenWidth + margin ||
            screenY < -margin || screenY > screenHeight + margin) {
            return ScreenPosition(screenX, screenY, false)
        }

        return ScreenPosition(screenX, screenY, true)
    }
}
