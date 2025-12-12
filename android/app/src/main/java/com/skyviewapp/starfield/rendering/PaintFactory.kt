package com.skyviewapp.starfield.rendering

import android.graphics.Color
import android.graphics.Paint

/**
 * Factory for creating Paint objects and managing colors
 * Centralizes all paint/color configuration for the star field
 */
object PaintFactory {
    
    // Spectral type to color mapping (Harvard classification)
    private val spectralColors = mapOf(
        'O' to Color.rgb(155, 176, 255),  // Blue
        'B' to Color.rgb(170, 196, 255),  // Blue-white
        'A' to Color.rgb(202, 215, 255),  // White
        'F' to Color.rgb(248, 247, 255),  // Yellow-white
        'G' to Color.rgb(255, 244, 234),  // Yellow (like Sun)
        'K' to Color.rgb(255, 210, 161),  // Orange
        'M' to Color.rgb(255, 204, 111)   // Red
    )

    /**
     * Get star color based on spectral type and night mode
     */
    fun getStarColor(spectralType: String?, nightMode: String): Int {
        return when (nightMode) {
            "red" -> Color.rgb(255, 80, 80)
            "green" -> Color.rgb(80, 255, 80)
            else -> {
                if (spectralType.isNullOrEmpty()) Color.WHITE
                else spectralColors[spectralType[0].uppercaseChar()] ?: Color.WHITE
            }
        }
    }

    /**
     * Get constellation line color based on night mode
     */
    fun getLineColor(nightMode: String): Int {
        return when (nightMode) {
            "red" -> Color.rgb(255, 60, 60)
            "green" -> Color.rgb(60, 255, 60)
            else -> Color.argb(76, 102, 153, 204)
        }
    }

    /**
     * Get text color based on night mode
     */
    fun getTextColor(nightMode: String): Int {
        return when (nightMode) {
            "red" -> Color.rgb(255, 100, 100)
            "green" -> Color.rgb(100, 255, 100)
            else -> Color.WHITE
        }
    }

    /**
     * Get planet fallback color (when texture not available)
     */
    fun getPlanetColor(planetId: String, nightMode: String): Int {
        if (nightMode != "off") return getStarColor(null, nightMode)
        
        return when (planetId.lowercase()) {
            "sun" -> Color.rgb(255, 220, 100)
            "moon" -> Color.rgb(220, 220, 220)
            "mercury" -> Color.rgb(180, 150, 130)
            "venus" -> Color.rgb(255, 220, 180)
            "mars" -> Color.rgb(255, 120, 80)
            "jupiter" -> Color.rgb(255, 200, 150)
            "saturn" -> Color.rgb(240, 210, 150)
            "uranus" -> Color.rgb(180, 220, 240)
            "neptune" -> Color.rgb(100, 140, 255)
            else -> Color.WHITE
        }
    }

    /**
     * Calculate star radius based on apparent magnitude
     * Brighter stars (lower magnitude) get larger radius
     */
    fun getStarRadius(magnitude: Float): Float {
        val minRadius = 1.5f
        val maxRadius = 8f
        val normalized = (6f - magnitude.coerceAtMost(6f)) / 7.5f
        return minRadius + normalized.coerceIn(0f, 1f) * (maxRadius - minRadius)
    }

    /**
     * Get magnitude limit based on FOV (field of view)
     * Wider FOV shows fewer, brighter stars
     */
    fun getMagnitudeLimit(fov: Float): Float {
        return when {
            fov > 100 -> 3.0f
            fov > 80 -> 4.0f
            fov > 60 -> 5.0f
            fov > 40 -> 5.5f
            fov > 25 -> 6.0f
            else -> 6.5f
        }
    }

    // Pre-configured paint instances
    fun createStarPaint(): Paint = Paint(Paint.ANTI_ALIAS_FLAG)

    fun createGlowPaint(): Paint = Paint(Paint.ANTI_ALIAS_FLAG)

    fun createLinePaint(nightMode: String = "off"): Paint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color = getLineColor(nightMode)
        strokeWidth = 2f
        style = Paint.Style.STROKE
    }

    fun createCrosshairPaint(): Paint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color = Color.argb(76, 255, 255, 255)
        strokeWidth = 2f
        style = Paint.Style.STROKE
    }

    fun createLabelPaint(): Paint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color = Color.WHITE
        textSize = 36f
        textAlign = Paint.Align.CENTER
        setShadowLayer(4f, 0f, 0f, Color.BLACK)
    }

    fun createLabelBackgroundPaint(): Paint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color = Color.argb(180, 0, 0, 0)
        style = Paint.Style.FILL
    }
}
