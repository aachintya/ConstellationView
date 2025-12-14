package com.skyviewapp.starfield.rendering.overlay

import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Matrix
import android.graphics.Paint
import android.graphics.Rect
import android.graphics.RectF
import com.skyviewapp.starfield.models.ConstellationArt
import com.skyviewapp.starfield.models.Star

/**
 * Renders constellation artwork using Canvas transformations
 * This is a backup/fallback for OpenGL rendering
 */
class CanvasArtworkRenderer {
    private var constellationArtworks = listOf<ConstellationArt>()
    private var constellationTextures = mutableMapOf<String, Bitmap>()
    private var starMap = mutableMapOf<String, Star>()
    private var artworkOpacity = 0.35f

    private val artworkPaint = Paint().apply {
        isAntiAlias = true
        alpha = 90
    }

    private val constellationLinePaint = Paint().apply {
        isAntiAlias = true
        color = Color.argb(120, 100, 150, 255)
        strokeWidth = 1.5f
        style = Paint.Style.STROKE
    }

    fun setArtworks(artworks: List<ConstellationArt>) {
        constellationArtworks = artworks
    }

    fun setTextures(textures: Map<String, Bitmap>) {
        constellationTextures.clear()
        constellationTextures.putAll(textures)
    }

    fun updateStarMap(stars: Map<String, Star>) {
        starMap.clear()
        starMap.putAll(stars)
    }

    fun setOpacity(opacity: Float) {
        artworkOpacity = opacity.coerceIn(0f, 1f)
    }

    /**
     * Draw constellation artwork anchored to stars
     */
    fun draw(canvas: Canvas, screenWidth: Int, screenHeight: Int) {
        if (constellationArtworks.isEmpty() || constellationTextures.isEmpty() || starMap.isEmpty()) {
            return
        }

        artworkPaint.alpha = (artworkOpacity * 255).toInt().coerceIn(20, 100)

        for (artwork in constellationArtworks) {
            val texture = constellationTextures[artwork.imageName] ?: continue

            // Get anchor stars by HIP ID - need at least 2
            val anchorStars = artwork.anchors.mapNotNull { anchor ->
                val hipId = "HIP${anchor.hipId}"
                val star = starMap[hipId]
                if (star?.visible == true) Triple(anchor, star, hipId) else null
            }

            if (anchorStars.size < 2) continue

            val validAnchors = anchorStars.take(3)
            val pointCount = validAnchors.size

            // Check if any anchor is near the screen
            val anyOnScreen = validAnchors.any { (_, star, _) ->
                star.screenX >= -screenWidth && star.screenX <= screenWidth * 2 &&
                star.screenY >= -screenHeight && star.screenY <= screenHeight * 2
            }
            if (!anyOnScreen) continue

            // Prepare arrays for setPolyToPoly transformation
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
            if (!matrix.setPolyToPoly(srcPoints, 0, dstPoints, 0, pointCount)) continue

            // Validate transformation to prevent extreme distortions
            val values = FloatArray(9)
            matrix.getValues(values)
            val scale = kotlin.math.sqrt(values[0] * values[0] + values[3] * values[3].toDouble()).toFloat()
            if (scale < 0.02f || scale > 8.0f) continue

            // Draw artwork
            canvas.save()
            canvas.concat(matrix)

            val srcRect = Rect(0, 0, texture.width, texture.height)
            val dstRect = RectF(0f, 0f, texture.width.toFloat(), texture.height.toFloat())
            canvas.drawBitmap(texture, srcRect, dstRect, artworkPaint)

            canvas.restore()

            // Draw constellation lines
            drawConstellationLines(canvas, artwork.lines)
        }
    }

    /**
     * Draw constellation lines connecting stars
     */
    private fun drawConstellationLines(canvas: Canvas, lineArrays: List<List<Int>>) {
        for (lineArray in lineArrays) {
            if (lineArray.size < 2) continue

            for (i in 0 until lineArray.size - 1) {
                val star1 = starMap["HIP${lineArray[i]}"]
                val star2 = starMap["HIP${lineArray[i + 1]}"]

                if (star1?.visible == true && star2?.visible == true) {
                    canvas.drawLine(star1.screenX, star1.screenY, star2.screenX, star2.screenY, constellationLinePaint)
                }
            }
        }
    }
}
