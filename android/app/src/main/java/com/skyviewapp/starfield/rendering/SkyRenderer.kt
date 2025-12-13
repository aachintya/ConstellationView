package com.skyviewapp.starfield.rendering

import android.graphics.*
import com.skyviewapp.starfield.models.ConstellationArt
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
    
    // Line paint for constellation connecting lines
    private val constellationLinePaint = Paint().apply {
        isAntiAlias = true
        color = Color.argb(180, 100, 150, 255)  // Blue color like reference
        strokeWidth = 2f
        style = Paint.Style.STROKE
    }
    
    // Paint for constellation artwork
    private val artworkPaint = Paint().apply {
        isAntiAlias = true
        alpha = 80
    }

    fun setScreenSize(width: Int, height: Int) {
        screenWidth = width.toFloat()
        screenHeight = height.toFloat()
    }

    /**
     * Draw constellation artwork/illustrations anchored to stars
     * Uses proper affine transformation: scale, rotate, and translate based on anchor positions
     * Also draws constellation lines connecting the stars
     */
    fun drawConstellationArtwork(
        canvas: Canvas,
        artworks: List<ConstellationArt>,
        textures: Map<String, Bitmap>,
        starMap: Map<String, Star>,
        artworkOpacity: Float = 0.3f
    ) {
        artworkPaint.alpha = (artworkOpacity * 255).toInt().coerceIn(20, 90)
        
        for (artwork in artworks) {
            val texture = textures[artwork.imageName] ?: continue
            
            // Get anchor stars by HIP ID - need at least 2
            val anchorStars = artwork.anchors.mapNotNull { anchor ->
                val hipId = "HIP${anchor.hipId}"
                val star = starMap[hipId]
                if (star?.visible == true) {
                    Triple(anchor, star, hipId)
                } else null
            }
            
            if (anchorStars.size < 2) continue
            
            // Collect valid anchor stars (must be visible/projected)
            // We need as many as possible (up to 3 or 4) for best fit
            val validAnchors = anchorStars.take(3)
            val pointCount = validAnchors.size
            if (pointCount < 2) continue
            
            // Check visibility - strictly we want to see the artwork
            // At least one anchor or the centroid should be on/near screen
            var anyOnScreen = false
            for ((_, star, _) in validAnchors) {
                if (star.screenX >= -screenWidth && star.screenX <= screenWidth * 2 &&
                    star.screenY >= -screenHeight && star.screenY <= screenHeight * 2) {
                    anyOnScreen = true
                    break
                }
            }
            if (!anyOnScreen) continue

            // Prepare arrays for setPolyToPoly
            val srcPoints = FloatArray(pointCount * 2)
            val dstPoints = FloatArray(pointCount * 2)
            
            for (i in 0 until pointCount) {
                val (anchor, star, _) = validAnchors[i]
                srcPoints[i * 2] = anchor.pixelX.toFloat()
                srcPoints[i * 2 + 1] = anchor.pixelY.toFloat()
                dstPoints[i * 2] = star.screenX
                dstPoints[i * 2 + 1] = star.screenY
            }
            
            val matrix = Matrix()
            // Use 3 points for affine (scale, rotate, translate, skew)
            // Use 2 points for conformal (scale, rotate, translate)
            val success = matrix.setPolyToPoly(srcPoints, 0, dstPoints, 0, pointCount)
            if (!success) continue
            
            // Validate the matrix to prevent extreme distortions
            val values = FloatArray(9)
            matrix.getValues(values)
            
            // Check scaling (approximate from diagonal)
            // Scale X = sqrt(a^2 + d^2) roughly
            val scale = kotlin.math.sqrt(values[0] * values[0] + values[3] * values[3].toDouble()).toFloat()
            if (scale < 0.05f || scale > 5.0f) continue
            
            // Draw artwork using the transformation matrix
            canvas.save()
            canvas.concat(matrix)
            
            val srcRect = Rect(0, 0, texture.width, texture.height)
            val dstRect = RectF(0f, 0f, texture.width.toFloat(), texture.height.toFloat())
            canvas.drawBitmap(texture, srcRect, dstRect, artworkPaint)
            
            canvas.restore()
            
            // Draw constellation lines connecting stars (in screen space)
            drawConstellationLines(canvas, artwork.lines, starMap)
        }
    }
    
    /**
     * Draw constellation lines for a single constellation
     */
    private fun drawConstellationLines(
        canvas: Canvas,
        lineArrays: List<List<Int>>,
        starMap: Map<String, Star>
    ) {
        for (lineArray in lineArrays) {
            if (lineArray.size < 2) continue
            
            // Draw lines connecting consecutive stars in the array
            for (i in 0 until lineArray.size - 1) {
                val hipId1 = "HIP${lineArray[i]}"
                val hipId2 = "HIP${lineArray[i + 1]}"
                
                val star1 = starMap[hipId1]
                val star2 = starMap[hipId2]
                
                if (star1?.visible == true && star2?.visible == true) {
                    canvas.drawLine(star1.screenX, star1.screenY, star2.screenX, star2.screenY, constellationLinePaint)
                }
            }
        }
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
