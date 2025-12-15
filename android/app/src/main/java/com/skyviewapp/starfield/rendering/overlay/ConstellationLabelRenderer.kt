package com.skyviewapp.starfield.rendering.overlay

import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.Typeface
import com.skyviewapp.starfield.gl.utils.CrosshairFocusHelper
import com.skyviewapp.starfield.models.ConstellationArt
import com.skyviewapp.starfield.models.Star

/**
 * Renders constellation names near their position in the sky.
 * Uses the same blue color as constellation lines for visual consistency.
 */
class ConstellationLabelRenderer {
    
    // Blue color matching constellation lines (0.4f, 0.6f, 1f) -> RGB(102, 153, 255)
    private val labelPaint = Paint().apply {
        isAntiAlias = true
        textSize = 32f
        color = Color.rgb(102, 153, 255)
        typeface = Typeface.create(Typeface.DEFAULT, Typeface.BOLD)
        textAlign = Paint.Align.CENTER
        setShadowLayer(3f, 0f, 1f, Color.argb(180, 0, 0, 0))
    }
    
    private var nightModeIntensity = 0f
    private var constellationArtworks = listOf<ConstellationArt>()
    private var starMap = mapOf<String, Star>()
    
    fun setNightMode(intensity: Float) {
        nightModeIntensity = intensity
        if (intensity > 0) {
            // Red tint for night mode
            labelPaint.color = Color.rgb(255, 100, 100)
        } else {
            // Normal blue color
            labelPaint.color = Color.rgb(102, 153, 255)
        }
    }
    
    fun setArtworks(artworks: List<ConstellationArt>) {
        constellationArtworks = artworks
    }
    
    fun updateStarMap(stars: Map<String, Star>) {
        starMap = stars
    }
    
    /**
     * Draw constellation labels near their center position
     */
    fun draw(canvas: Canvas, screenWidth: Int, screenHeight: Int) {
        if (constellationArtworks.isEmpty() || starMap.isEmpty()) return
        
        for (artwork in constellationArtworks) {
            // Get opacity from crosshair focus (same as lines)
            val opacity = CrosshairFocusHelper.getOpacity(artwork.id)
            if (opacity < 0.05f) continue
            
            // Calculate center position from anchor stars
            val centerPos = calculateLabelPosition(artwork) ?: continue
            
            // Check if on screen
            if (centerPos.first < -50 || centerPos.first > screenWidth + 50 ||
                centerPos.second < -50 || centerPos.second > screenHeight + 50) {
                continue
            }
            
            // Set alpha based on crosshair focus
            val alpha = (opacity * 200).toInt().coerceIn(0, 200)
            labelPaint.alpha = alpha
            
            // Draw constellation name
            canvas.drawText(artwork.name, centerPos.first, centerPos.second, labelPaint)
        }
    }
    
    /**
     * Calculate label position from visible anchor stars
     */
    private fun calculateLabelPosition(artwork: ConstellationArt): Pair<Float, Float>? {
        var sumX = 0f
        var sumY = 0f
        var count = 0
        
        // Use anchor stars to find center
        for (anchor in artwork.anchors) {
            val star = starMap["HIP${anchor.hipId}"]
            if (star?.visible == true) {
                sumX += star.screenX
                sumY += star.screenY
                count++
            }
        }
        
        // Also check line stars if no anchors visible
        if (count == 0) {
            for (line in artwork.lines) {
                for (hipId in line) {
                    val star = starMap["HIP$hipId"]
                    if (star?.visible == true) {
                        sumX += star.screenX
                        sumY += star.screenY
                        count++
                    }
                }
            }
        }
        
        return if (count > 0) {
            // Offset label slightly above center
            Pair(sumX / count, sumY / count - 30f)
        } else {
            null
        }
    }
}


