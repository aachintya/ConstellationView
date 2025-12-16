package com.skyviewapp.starfield.rendering

import android.content.Context
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.util.Log
import android.view.MotionEvent
import android.view.View
import com.skyviewapp.starfield.models.ConstellationArt
import com.skyviewapp.starfield.models.Star
import com.skyviewapp.starfield.rendering.overlay.ButtonRenderer
import com.skyviewapp.starfield.rendering.overlay.CanvasArtworkRenderer
import com.skyviewapp.starfield.rendering.overlay.ConstellationLabelRenderer
import com.skyviewapp.starfield.rendering.overlay.CrosshairRenderer


/**
 * Overlay view for 2D UI elements drawn on top of GLSurfaceView
 * Delegates rendering to specialized sub-renderers
 */
class OverlayView(context: Context) : View(context) {

    // Sub-renderers
    private val buttonRenderer = ButtonRenderer()
    private val crosshairRenderer = CrosshairRenderer()
    private val artworkRenderer = CanvasArtworkRenderer()
    private val labelRenderer = ConstellationLabelRenderer()
    // Cardinal Points moved to GL renderer for "3D vs 2D" fix

    // Button callbacks
    var onMenuPress: (() -> Unit)? = null
    var onSearchPress: (() -> Unit)? = null
    var onSharePress: (() -> Unit)? = null

    // Debug mode
    private var debugMode = false
    private var debugStars = mutableListOf<DebugStar>()
    private var artworkDebugMode = false

    private val debugPaint = Paint().apply {
        isAntiAlias = true
        color = Color.RED
        style = Paint.Style.FILL
    }
    private val debugTextPaint = Paint().apply {
        isAntiAlias = true
        textSize = 14f
        color = Color.YELLOW
    }
    private val anchorDebugPaint = Paint().apply {
        isAntiAlias = true
        color = Color.GREEN
        style = Paint.Style.FILL
    }
    private val anchorTextPaint = Paint().apply {
        isAntiAlias = true
        textSize = 24f
        color = Color.YELLOW
        setShadowLayer(2f, 0f, 1f, Color.BLACK)
    }

    // Data for debug rendering
    private var constellationArtworks = listOf<ConstellationArt>()
    private var starMap = mutableMapOf<String, Star>()

    data class DebugStar(val x: Float, val y: Float, val name: String, val visible: Boolean)

    init {
        setBackgroundColor(Color.TRANSPARENT)
        isClickable = true
        isFocusable = true
        setWillNotDraw(false)
    }

    override fun invalidate() {
        // Call super to actually mark view dirty and request redraw
        super.invalidate()
    }

    // ============= Public API =============
    
    fun setProjector(projector: com.skyviewapp.starfield.projection.CoordinateProjector) {
        // Projector set for potential future overlays
    }

    fun isTouchOnButton(x: Float, y: Float): Boolean {
        buttonRenderer.updateButtonPositions(width, height)
        return buttonRenderer.isTouchOnButton(x, y)
    }

    fun setDebugMode(enabled: Boolean) {
        debugMode = enabled
        invalidate()
    }

    fun setDebugStars(stars: List<DebugStar>) {
        debugStars.clear()
        debugStars.addAll(stars)
        invalidate()
    }

    fun setNightMode(mode: String) {
        val intensity = when (mode.lowercase()) {
            "red" -> 1f
            "dim" -> 0.5f
            else -> 0f
        }
        buttonRenderer.setNightMode(intensity)
        crosshairRenderer.setNightMode(intensity)
        labelRenderer.setNightMode(intensity)
        invalidate()
    }

    fun setCrosshairInfo(name: String?, subtitle: String?) {
        crosshairRenderer.crosshairName = name
        crosshairRenderer.crosshairSubtitle = subtitle
        invalidate()
    }

    fun setConstellationName(name: String?) {
        crosshairRenderer.constellationName = name
        invalidate()
    }

    fun setConstellationArtworks(artworks: List<ConstellationArt>) {
        constellationArtworks = artworks
        artworkRenderer.setArtworks(artworks)
        labelRenderer.setArtworks(artworks)
        invalidate()
    }

    fun setConstellationTextures(textures: Map<String, Bitmap>) {
        artworkRenderer.setTextures(textures)
        invalidate()
    }

    fun updateStarMap(stars: Map<String, Star>) {
        starMap.clear()
        starMap.putAll(stars)
        artworkRenderer.updateStarMap(stars)
        labelRenderer.updateStarMap(stars)
        invalidate()
    }

    fun setArtworkOpacity(opacity: Float) {
        artworkRenderer.setOpacity(opacity)
        invalidate()
    }

    fun setArtworkDebugMode(enabled: Boolean) {
        artworkDebugMode = enabled
        invalidate()
    }

    fun setSelectedLabel(label: String?, x: Float, y: Float, magnitude: Float) {
        // No-op: floating labels removed
    }

    fun clearSelectedLabel() {
        // No-op: floating labels removed
    }

    // ============= Touch Handling =============

    override fun onTouchEvent(event: MotionEvent): Boolean {
        Log.d("OverlayView", "Touch: ${event.action} at (${event.x}, ${event.y})")
        if (event.action == MotionEvent.ACTION_UP) {
            val x = event.x
            val y = event.y

            when {
                buttonRenderer.menuButtonRect.contains(x, y) -> {
                    Log.d("OverlayView", "Menu pressed")
                    onMenuPress?.invoke()
                    return true
                }
                buttonRenderer.searchButtonRect.contains(x, y) -> {
                    Log.d("OverlayView", "Search pressed")
                    onSearchPress?.invoke()
                    return true
                }
                buttonRenderer.shareButtonRect.contains(x, y) -> {
                    Log.d("OverlayView", "Share pressed")
                    onSharePress?.invoke()
                    return true
                }
            }
        }
        return false
    }

    // ============= Drawing =============

    override fun onDraw(canvas: Canvas) {
        super.onDraw(canvas)

        // Update button positions
        buttonRenderer.updateButtonPositions(width, height)

        // Draw debug overlays
        if (artworkDebugMode) drawArtworkDebugOverlay(canvas)

        // Draw components
        // NOTE: Constellation label renderer disabled - names shown via CrosshairRenderer at fixed position instead
        // labelRenderer.draw(canvas, width, height)
        // cardinalPointsRenderer.draw(canvas) -- Moved to GL
        buttonRenderer.draw(canvas)
        drawDebugStars(canvas)
        crosshairRenderer.draw(canvas, width, height)
    }

    private fun drawDebugStars(canvas: Canvas) {
        if (!debugMode) return

        for (star in debugStars) {
            if (star.visible) {
                debugPaint.color = Color.argb(180, 255, 0, 0)
                canvas.drawCircle(star.x, star.y, 8f, debugPaint)
                debugTextPaint.textSize = 12f
                canvas.drawText(star.name.take(8), star.x + 10, star.y - 5, debugTextPaint)
            }
        }
        debugTextPaint.textSize = 16f
        debugTextPaint.color = Color.YELLOW
        canvas.drawText("DEBUG: ${debugStars.count { it.visible }} visible stars", 10f, 30f, debugTextPaint)
    }

    private fun drawArtworkDebugOverlay(canvas: Canvas) {
        if (constellationArtworks.isEmpty() || starMap.isEmpty()) return

        val visibleAnchors = mutableListOf<Triple<String, Int, Star>>()

        for (artwork in constellationArtworks) {
            for (anchor in artwork.anchors) {
                val hipId = "HIP${anchor.hipId}"
                val star = starMap[hipId]
                if (star?.visible == true) {
                    visibleAnchors.add(Triple(artwork.id, anchor.hipId, star))
                }
            }
        }

        for ((constName, hipId, star) in visibleAnchors) {
            anchorDebugPaint.color = Color.GREEN
            canvas.drawCircle(star.screenX, star.screenY, 12f, anchorDebugPaint)
            anchorDebugPaint.color = Color.WHITE
            canvas.drawCircle(star.screenX, star.screenY, 5f, anchorDebugPaint)

            val label = "$constName:$hipId"
            canvas.drawText(label, star.screenX + 15, star.screenY - 10, anchorTextPaint)
        }

        anchorTextPaint.textSize = 28f
        anchorTextPaint.color = Color.CYAN
        canvas.drawText("DEBUG: Anchor stars shown with HIP IDs", 20f, 120f, anchorTextPaint)
        anchorTextPaint.textSize = 24f
        anchorTextPaint.color = Color.YELLOW
    }
}
