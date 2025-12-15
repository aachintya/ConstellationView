package com.skyviewapp.starfield.rendering.overlay

import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint

/**
 * Renders crosshair and star info display at the bottom
 */
class CrosshairRenderer {
    private val crosshairRadius = 70f

    private val crosshairPaint = Paint().apply {
        isAntiAlias = true
        color = Color.argb(100, 255, 255, 255)
        style = Paint.Style.STROKE
        strokeWidth = 1.5f
    }

    private val starNamePaint = Paint().apply {
        isAntiAlias = true
        textSize = 52f
        color = Color.WHITE
        isFakeBoldText = true
        setShadowLayer(4f, 0f, 2f, Color.argb(150, 0, 0, 0))
    }

    private val starSubtitlePaint = Paint().apply {
        isAntiAlias = true
        textSize = 26f
        color = Color.argb(180, 200, 200, 200)
    }

    private val constellationNamePaint = Paint().apply {
        isAntiAlias = true
        textSize = 28f
        color = Color.rgb(102, 153, 255)  // Blue to match constellation lines
        textAlign = Paint.Align.CENTER
        isFakeBoldText = true
        setShadowLayer(3f, 0f, 1f, Color.argb(180, 0, 0, 0))
    }

    var crosshairName: String? = null
    var crosshairSubtitle: String? = null
    var constellationName: String? = null

    /**
     * Set night mode for color adjustment
     */
    fun setNightMode(intensity: Float) {
        if (intensity > 0) {
            crosshairPaint.color = Color.argb(100, 255, 80, 80)
            starNamePaint.color = Color.rgb(255, 120, 120)
            starSubtitlePaint.color = Color.argb(180, 255, 150, 150)
            constellationNamePaint.color = Color.rgb(255, 100, 100)  // Red for night mode
        } else {
            crosshairPaint.color = Color.argb(100, 255, 255, 255)
            starNamePaint.color = Color.WHITE
            starSubtitlePaint.color = Color.argb(180, 200, 200, 200)
            constellationNamePaint.color = Color.rgb(102, 153, 255)  // Blue for normal mode
        }
    }

    /**
     * Draw crosshair and info
     */
    fun draw(canvas: Canvas, screenWidth: Int, screenHeight: Int) {
        val centerX = screenWidth / 2f
        val centerY = screenHeight / 2f

        // Draw crosshair circle
        crosshairPaint.strokeWidth = 1.5f
        crosshairPaint.color = Color.argb(100, 255, 255, 255)
        canvas.drawCircle(centerX, centerY, crosshairRadius, crosshairPaint)

        // Inner crosshair lines
        crosshairPaint.strokeWidth = 1f
        crosshairPaint.color = Color.argb(50, 255, 255, 255)
        val lineLen = 15f
        canvas.drawLine(centerX - crosshairRadius - lineLen, centerY, centerX - crosshairRadius + 10, centerY, crosshairPaint)
        canvas.drawLine(centerX + crosshairRadius - 10, centerY, centerX + crosshairRadius + lineLen, centerY, crosshairPaint)
        canvas.drawLine(centerX, centerY - crosshairRadius - lineLen, centerX, centerY - crosshairRadius + 10, crosshairPaint)
        canvas.drawLine(centerX, centerY + crosshairRadius - 10, centerX, centerY + crosshairRadius + lineLen, crosshairPaint)

        // Draw constellation name below crosshair (fixed position)
        constellationName?.let { constName ->
            val constY = centerY + crosshairRadius + 40f  // Below crosshair
            canvas.drawText(constName, centerX, constY, constellationNamePaint)
        }

        // Draw star info at bottom left
        crosshairName?.let { name ->
            val leftMargin = 32f
            val bottomMargin = 120f

            starNamePaint.textSize = 52f
            canvas.drawText(name, leftMargin, screenHeight - bottomMargin, starNamePaint)

            crosshairSubtitle?.let { subtitle ->
                canvas.drawText(subtitle, leftMargin, screenHeight - bottomMargin + 32f, starSubtitlePaint)
            }
        }
    }
}
