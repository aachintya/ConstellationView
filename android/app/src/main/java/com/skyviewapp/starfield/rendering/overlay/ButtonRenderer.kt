package com.skyviewapp.starfield.rendering.overlay

import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.RectF

/**
 * Renders control buttons (menu, search, share) on the overlay
 */
class ButtonRenderer {
    private val buttonSize = 100f
    private val buttonMargin = 20f

    val menuButtonRect = RectF()
    val searchButtonRect = RectF()
    val shareButtonRect = RectF()

    private val buttonPaint = Paint().apply {
        isAntiAlias = true
        color = Color.WHITE
        style = Paint.Style.STROKE
        strokeWidth = 3f
    }

    private var nightModeIntensity = 0f

    /**
     * Update button rects based on screen size
     */
    fun updateButtonPositions(screenWidth: Int, screenHeight: Int) {
        val centerY = screenHeight / 2f
        val rightEdge = screenWidth - buttonMargin
        val buttonTop = centerY - buttonSize * 1.5f

        menuButtonRect.set(rightEdge - buttonSize, buttonTop, rightEdge, buttonTop + buttonSize)
        searchButtonRect.set(rightEdge - buttonSize, buttonTop + buttonSize + buttonMargin, rightEdge, buttonTop + buttonSize * 2 + buttonMargin)
        shareButtonRect.set(rightEdge - buttonSize, buttonTop + (buttonSize + buttonMargin) * 2, rightEdge, buttonTop + buttonSize * 3 + buttonMargin * 2)
    }

    /**
     * Check if a position is on any button
     */
    fun isTouchOnButton(x: Float, y: Float): Boolean {
        return menuButtonRect.contains(x, y) || 
               searchButtonRect.contains(x, y)
    }

    /**
     * Set night mode intensity for button color
     */
    fun setNightMode(intensity: Float) {
        nightModeIntensity = intensity
        buttonPaint.color = if (intensity > 0) Color.rgb(255, 120, 120) else Color.WHITE
    }

    /**
     * Draw all buttons
     */
    fun draw(canvas: Canvas) {
        drawMenuButton(canvas)
        drawSearchButton(canvas)
    }

    private fun drawMenuButton(canvas: Canvas) {
        val cx = menuButtonRect.centerX()
        val cy = menuButtonRect.centerY()
        val lineWidth = 50f   // Bigger
        val spacing = 20f     // Bigger

        buttonPaint.style = Paint.Style.STROKE
        buttonPaint.strokeWidth = 4f  // Thicker lines
        canvas.drawLine(cx - lineWidth / 2, cy - spacing, cx + lineWidth / 2, cy - spacing, buttonPaint)
        canvas.drawLine(cx - lineWidth / 2, cy, cx + lineWidth / 2, cy, buttonPaint)
        canvas.drawLine(cx - lineWidth / 2, cy + spacing, cx + lineWidth / 2, cy + spacing, buttonPaint)
    }

    private fun drawSearchButton(canvas: Canvas) {
        val cx = searchButtonRect.centerX()
        val cy = searchButtonRect.centerY()
        val radius = 18f  // Bigger

        buttonPaint.style = Paint.Style.STROKE
        buttonPaint.strokeWidth = 4f  // Thicker
        canvas.drawCircle(cx - 6, cy - 6, radius, buttonPaint)
        canvas.drawLine(cx + 6, cy + 6, cx + 22, cy + 22, buttonPaint)  // Longer handle
    }
}
