package com.skyviewapp.starfield.rendering

import android.graphics.*
import com.skyviewapp.starfield.models.ConstellationLine
import com.skyviewapp.starfield.models.Planet
import com.skyviewapp.starfield.models.Star

/**
 * Handles all rendering of celestial objects to the canvas
 */
class SkyRenderer(
    private val starPaint: Paint,
    private val glowPaint: Paint,
    private val linePaint: Paint,
    private val crosshairPaint: Paint,
    private val labelPaint: Paint
) {
    
    private var screenWidth: Float = 0f
    private var screenHeight: Float = 0f
    private val crosshairRadius = 70f

    fun setScreenSize(width: Int, height: Int) {
        screenWidth = width.toFloat()
        screenHeight = height.toFloat()
    }

    /**
     * Draw constellation lines between stars
     */
    fun drawConstellationLines(
        canvas: Canvas,
        lines: List<ConstellationLine>,
        starMap: Map<String, Star>,
        nightMode: String
    ) {
        linePaint.color = PaintFactory.getLineColor(nightMode)
        for (line in lines) {
            val star1 = starMap[line.starId1]
            val star2 = starMap[line.starId2]
            if (star1?.visible == true && star2?.visible == true) {
                canvas.drawLine(star1.screenX, star1.screenY, star2.screenX, star2.screenY, linePaint)
            }
        }
    }

    /**
     * Draw all visible stars with glow effects
     */
    fun drawStars(
        canvas: Canvas,
        stars: List<Star>,
        nightMode: String,
        starBrightness: Float,
        selectedStar: Star?
    ) {
        val brightnessMultiplier = 0.5f + starBrightness * 1.0f

        for (star in stars.sortedByDescending { it.magnitude }) {
            if (!star.visible) continue

            val baseRadius = PaintFactory.getStarRadius(star.magnitude)
            val radius = baseRadius * brightnessMultiplier
            val color = PaintFactory.getStarColor(star.spectralType, nightMode)

            // Glow for bright stars
            val glowThreshold = 4f - starBrightness * 3f
            if (star.magnitude < glowThreshold) {
                val glowAlpha = (102 * brightnessMultiplier).toInt().coerceIn(50, 200)
                glowPaint.shader = RadialGradient(
                    star.screenX, star.screenY, radius * 4f,
                    intArrayOf(
                        Color.argb(glowAlpha, Color.red(color), Color.green(color), Color.blue(color)),
                        Color.TRANSPARENT
                    ),
                    floatArrayOf(0f, 1f),
                    Shader.TileMode.CLAMP
                )
                canvas.drawCircle(star.screenX, star.screenY, radius * 4f, glowPaint)
            }

            // Main star
            starPaint.color = color
            canvas.drawCircle(star.screenX, star.screenY, radius, starPaint)

            // Highlight ring for selected star
            if (star == selectedStar) {
                crosshairPaint.color = Color.argb(200, 79, 195, 247)
                crosshairPaint.strokeWidth = 3f
                canvas.drawCircle(star.screenX, star.screenY, radius + 15f, crosshairPaint)
                crosshairPaint.color = Color.argb(76, 255, 255, 255)
                crosshairPaint.strokeWidth = 2f
            }
        }
    }

    /**
     * Draw all visible planets with textures
     */
    fun drawPlanets(
        canvas: Canvas,
        planets: List<Planet>,
        planetTextures: Map<String, Bitmap>,
        nightMode: String,
        planetScale: Float
    ) {
        val scaleMultiplier = 0.5f + planetScale * 0.8f

        for (planet in planets) {
            if (!planet.visible) continue

            val texture = planetTextures[planet.id.lowercase()]
            if (texture != null) {
                val baseSize = when {
                    planet.id == "sun" -> 50f
                    planet.id == "moon" -> 45f
                    planet.magnitude < -2 -> 40f
                    planet.magnitude < 0 -> 32f
                    planet.magnitude < 2 -> 25f
                    else -> 20f
                }

                val size = (baseSize * scaleMultiplier).coerceAtMost(70f)

                // Saturn with rings
                if (planet.id.lowercase() == "saturn") {
                    val ringWidth = size * 1.6f
                    val ringHeight = size * 0.8f
                    val destRect = RectF(
                        planet.screenX - ringWidth,
                        planet.screenY - ringHeight,
                        planet.screenX + ringWidth,
                        planet.screenY + ringHeight
                    )
                    canvas.drawBitmap(texture, null, destRect, starPaint)
                } else {
                    val destRect = RectF(
                        planet.screenX - size,
                        planet.screenY - size,
                        planet.screenX + size,
                        planet.screenY + size
                    )
                    canvas.drawBitmap(texture, null, destRect, starPaint)
                }
            } else {
                // Fallback colored circle
                val color = PaintFactory.getPlanetColor(planet.id, nightMode)
                starPaint.color = color
                canvas.drawCircle(planet.screenX, planet.screenY, 25f, starPaint)
            }
        }
    }

    /**
     * Draw the center crosshair
     */
    fun drawCrosshair(canvas: Canvas) {
        val centerX = screenWidth / 2f
        val centerY = screenHeight / 2f
        canvas.drawCircle(centerX, centerY, crosshairRadius, crosshairPaint)
    }

    /**
     * Draw info label for crosshair object
     */
    fun drawCrosshairInfo(canvas: Canvas, name: String, subtitle: String) {
        val leftMargin = 24f
        val bottomMargin = 140f

        labelPaint.textSize = 48f
        labelPaint.textAlign = Paint.Align.LEFT
        labelPaint.color = Color.rgb(79, 195, 247)
        canvas.drawText(name, leftMargin, screenHeight - bottomMargin, labelPaint)

        labelPaint.textSize = 28f
        labelPaint.color = Color.argb(150, 255, 255, 255)
        canvas.drawText(subtitle, leftMargin, screenHeight - bottomMargin + 36f, labelPaint)

        // Reset
        labelPaint.textSize = 36f
        labelPaint.textAlign = Paint.Align.CENTER
        labelPaint.color = Color.WHITE
    }
}
