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
               searchButtonRect.contains(x, y) || 
               shareButtonRect.contains(x, y)
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
        drawShareButton(canvas)
    }

    private fun drawMenuButton(canvas: Canvas) {
        val cx = menuButtonRect.centerX()
        val cy = menuButtonRect.centerY()
        val lineWidth = 30f
        val spacing = 10f

        buttonPaint.style = Paint.Style.STROKE
        buttonPaint.strokeWidth = 3f
        canvas.drawLine(cx - lineWidth / 2, cy - spacing, cx + lineWidth / 2, cy - spacing, buttonPaint)
        canvas.drawLine(cx - lineWidth / 2, cy, cx + lineWidth / 2, cy, buttonPaint)
        canvas.drawLine(cx - lineWidth / 2, cy + spacing, cx + lineWidth / 2, cy + spacing, buttonPaint)
    }

    private fun drawSearchButton(canvas: Canvas) {
        val cx = searchButtonRect.centerX()
        val cy = searchButtonRect.centerY()
        val radius = 15f

        buttonPaint.style = Paint.Style.STROKE
        buttonPaint.strokeWidth = 3f
        canvas.drawCircle(cx - 5, cy - 5, radius, buttonPaint)
        canvas.drawLine(cx + 5, cy + 5, cx + 18, cy + 18, buttonPaint)
    }

    private fun drawShareButton(canvas: Canvas) {
        val cx = shareButtonRect.centerX()
        val cy = shareButtonRect.centerY()
        val radius = 8f

        buttonPaint.style = Paint.Style.FILL
        canvas.drawCircle(cx, cy - 18, radius, buttonPaint)
        canvas.drawCircle(cx - 18, cy + 12, radius, buttonPaint)
        canvas.drawCircle(cx + 18, cy + 12, radius, buttonPaint)

        buttonPaint.style = Paint.Style.STROKE
        buttonPaint.strokeWidth = 2f
        canvas.drawLine(cx, cy - 18, cx - 18, cy + 12, buttonPaint)
        canvas.drawLine(cx, cy - 18, cx + 18, cy + 12, buttonPaint)
    }
}
