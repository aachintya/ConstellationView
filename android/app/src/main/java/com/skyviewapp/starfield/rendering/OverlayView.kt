package com.skyviewapp.starfield.rendering

import android.content.Context
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Matrix
import android.graphics.Paint
import android.graphics.Rect
import android.graphics.RectF
import android.util.Log
import android.view.MotionEvent
import android.view.View
import com.skyviewapp.starfield.models.ConstellationArt
import com.skyviewapp.starfield.models.Star

/**
 * Overlay view for 2D UI elements (crosshair, star info, buttons) drawn on top of GLSurfaceView
 * Also handles constellation artwork rendering using Canvas
 */
class OverlayView(context: Context) : View(context) {
    
    // Crosshair settings
    private val crosshairRadius = 70f
    private val crosshairPaint = Paint().apply {
        isAntiAlias = true
        color = Color.argb(100, 255, 255, 255)
        style = Paint.Style.STROKE
        strokeWidth = 1.5f
    }
    
    // Star info label (shown at bottom)
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
    
    // Button paint
    private val buttonPaint = Paint().apply {
        isAntiAlias = true
        color = Color.WHITE
        style = Paint.Style.STROKE
        strokeWidth = 3f
    }
    
    // Button areas for touch detection
    private val buttonSize = 100f
    private val buttonMargin = 20f
    private var menuButtonRect = RectF()
    private var searchButtonRect = RectF()
    private var shareButtonRect = RectF()
    
    // Button callbacks
    var onMenuPress: (() -> Unit)? = null
    var onSearchPress: (() -> Unit)? = null
    var onSharePress: (() -> Unit)? = null
    
    // Debug mode
    private var debugMode = false
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
    private var debugStars = mutableListOf<DebugStar>()
    
    data class DebugStar(val x: Float, val y: Float, val name: String, val visible: Boolean)
    
    // Constellation artwork data
    private var constellationArtworks = listOf<ConstellationArt>()
    private var constellationTextures = mutableMapOf<String, Bitmap>()
    private var starMap = mutableMapOf<String, Star>()
    private var artworkOpacity = 0.35f
    private var artworkDebugMode = false  // Show anchor debug overlay
    
    // Paint for anchor debug markers
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
    
    // Paint for constellation artwork
    private val artworkPaint = Paint().apply {
        isAntiAlias = true
        alpha = 90
    }
    
    // Paint for constellation lines
    private val constellationLinePaint = Paint().apply {
        isAntiAlias = true
        color = Color.argb(120, 100, 150, 255)
        strokeWidth = 1.5f
        style = Paint.Style.STROKE
    }
    
    // Data for rendering
    private var crosshairName: String? = null
    private var crosshairSubtitle: String? = null
    
    // Night mode
    private var nightModeIntensity = 0f
    
    init {
        setBackgroundColor(Color.TRANSPARENT)
        // Enable touch events
        isClickable = true
        isFocusable = true
    }
    
    /**
     * Check if touch is on a button - if so, allow this view to handle it
     */
    fun isTouchOnButton(x: Float, y: Float): Boolean {
        // Calculate button positions (same as in onDraw)
        val screenWidth = width.toFloat()
        val screenHeight = height.toFloat()
        val centerY = screenHeight / 2f
        val rightEdge = screenWidth - buttonMargin
        val buttonTop = centerY - buttonSize * 1.5f
        
        // Update button rects
        menuButtonRect.set(rightEdge - buttonSize, buttonTop, rightEdge, buttonTop + buttonSize)
        searchButtonRect.set(rightEdge - buttonSize, buttonTop + buttonSize + buttonMargin, rightEdge, buttonTop + buttonSize * 2 + buttonMargin)
        shareButtonRect.set(rightEdge - buttonSize, buttonTop + (buttonSize + buttonMargin) * 2, rightEdge, buttonTop + buttonSize * 3 + buttonMargin * 2)
        
        return menuButtonRect.contains(x, y) || searchButtonRect.contains(x, y) || shareButtonRect.contains(x, y)
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
        nightModeIntensity = when (mode.lowercase()) {
            "red" -> 1f
            "dim" -> 0.5f
            else -> 0f
        }
        updateColors()
        invalidate()
    }
    
    private fun updateColors() {
        if (nightModeIntensity > 0) {
            crosshairPaint.color = Color.argb(100, 255, 80, 80)
            starNamePaint.color = Color.rgb(255, 120, 120)
            starSubtitlePaint.color = Color.argb(180, 255, 150, 150)
            buttonPaint.color = Color.rgb(255, 120, 120)
        } else {
            crosshairPaint.color = Color.argb(100, 255, 255, 255)
            starNamePaint.color = Color.WHITE
            starSubtitlePaint.color = Color.argb(180, 200, 200, 200)
            buttonPaint.color = Color.WHITE
        }
    }
    
    fun setCrosshairInfo(name: String?, subtitle: String?) {
        crosshairName = name
        crosshairSubtitle = subtitle
        invalidate()
    }
    
    /**
     * Set constellation artwork data for rendering
     */
    fun setConstellationArtworks(artworks: List<ConstellationArt>) {
        constellationArtworks = artworks
        invalidate()
    }
    
    /**
     * Set constellation textures (bitmap images)
     */
    fun setConstellationTextures(textures: Map<String, Bitmap>) {
        constellationTextures.clear()
        constellationTextures.putAll(textures)
        invalidate()
    }
    
    /**
     * Update star map for constellation anchor lookup
     */
    fun updateStarMap(stars: Map<String, Star>) {
        starMap.clear()
        starMap.putAll(stars)
        invalidate()
    }
    
    /**
     * Set artwork opacity (0.0 to 1.0)
     */
    fun setArtworkOpacity(opacity: Float) {
        artworkOpacity = opacity.coerceIn(0f, 1f)
        invalidate()
    }
    
    /**
     * Enable/disable artwork debug mode (shows anchor star info)
     */
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
    
    override fun onTouchEvent(event: MotionEvent): Boolean {
        Log.d("OverlayView", "Touch event: ${event.action} at (${event.x}, ${event.y})")
        if (event.action == MotionEvent.ACTION_UP) {
            val x = event.x
            val y = event.y
            
            Log.d("OverlayView", "ACTION_UP - Menu rect: $menuButtonRect contains ($x,$y): ${menuButtonRect.contains(x, y)}")
            
            when {
                menuButtonRect.contains(x, y) -> {
                    Log.d("OverlayView", "Menu button pressed! Callback: $onMenuPress")
                    onMenuPress?.invoke()
                    return true
                }
                searchButtonRect.contains(x, y) -> {
                    Log.d("OverlayView", "Search button pressed!")
                    onSearchPress?.invoke()
                    return true
                }
                shareButtonRect.contains(x, y) -> {
                    Log.d("OverlayView", "Share button pressed!")
                    onSharePress?.invoke()
                    return true
                }
            }
        }
        return false // Let other touches pass through
    }
    
    override fun onDraw(canvas: Canvas) {
        super.onDraw(canvas)
        
        val centerX = width / 2f
        val centerY = height / 2f
        
        // Draw artwork debug overlay if enabled
        if (artworkDebugMode) {
            drawArtworkDebugOverlay(canvas)
        }
        
        // Calculate button positions (right side)
        val rightEdge = width - buttonMargin
        val buttonTop = centerY - buttonSize * 1.5f
        
        menuButtonRect.set(rightEdge - buttonSize, buttonTop, rightEdge, buttonTop + buttonSize)
        searchButtonRect.set(rightEdge - buttonSize, buttonTop + buttonSize + buttonMargin, rightEdge, buttonTop + buttonSize * 2 + buttonMargin)
        shareButtonRect.set(rightEdge - buttonSize, buttonTop + (buttonSize + buttonMargin) * 2, rightEdge, buttonTop + buttonSize * 3 + buttonMargin * 2)
        
        // Draw buttons
        drawMenuButton(canvas, menuButtonRect)
        drawSearchButton(canvas, searchButtonRect)
        drawShareButton(canvas, shareButtonRect)
        
        // Draw debug dots (behind crosshair)
        if (debugMode) {
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
        
        // Draw crosshair circle at center
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
        
        // Draw star info at bottom left
        crosshairName?.let { name ->
            val leftMargin = 32f
            val bottomMargin = 120f
            
            starNamePaint.textSize = 52f
            canvas.drawText(name, leftMargin, height - bottomMargin, starNamePaint)
            
            crosshairSubtitle?.let { subtitle ->
                canvas.drawText(subtitle, leftMargin, height - bottomMargin + 32f, starSubtitlePaint)
            }
        }
    }
    
    /**
     * Draw constellation artwork/illustrations anchored to stars
     */
    private fun drawConstellationArtwork(canvas: Canvas) {
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
                if (star?.visible == true) {
                    Triple(anchor, star, hipId)
                } else null
            }
            
            if (anchorStars.size < 2) continue
            
            // Take up to 3 anchors for best transformation
            val validAnchors = anchorStars.take(3)
            val pointCount = validAnchors.size
            
            // Check if any anchor is near the screen
            var anyOnScreen = false
            for ((_, star, _) in validAnchors) {
                if (star.screenX >= -width && star.screenX <= width * 2 &&
                    star.screenY >= -height && star.screenY <= height * 2) {
                    anyOnScreen = true
                    break
                }
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
            val success = matrix.setPolyToPoly(srcPoints, 0, dstPoints, 0, pointCount)
            if (!success) continue
            
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
    
    private fun drawMenuButton(canvas: Canvas, rect: RectF) {
        val cx = rect.centerX()
        val cy = rect.centerY()
        val lineWidth = 30f
        val spacing = 10f
        
        buttonPaint.strokeWidth = 3f
        canvas.drawLine(cx - lineWidth/2, cy - spacing, cx + lineWidth/2, cy - spacing, buttonPaint)
        canvas.drawLine(cx - lineWidth/2, cy, cx + lineWidth/2, cy, buttonPaint)
        canvas.drawLine(cx - lineWidth/2, cy + spacing, cx + lineWidth/2, cy + spacing, buttonPaint)
    }
    
    private fun drawSearchButton(canvas: Canvas, rect: RectF) {
        val cx = rect.centerX()
        val cy = rect.centerY()
        val radius = 15f
        
        buttonPaint.style = Paint.Style.STROKE
        buttonPaint.strokeWidth = 3f
        canvas.drawCircle(cx - 5, cy - 5, radius, buttonPaint)
        canvas.drawLine(cx + 5, cy + 5, cx + 18, cy + 18, buttonPaint)
    }
    
    private fun drawShareButton(canvas: Canvas, rect: RectF) {
        val cx = rect.centerX()
        val cy = rect.centerY()
        val radius = 8f
        
        buttonPaint.style = Paint.Style.FILL
        // Three circles in a triangle
        canvas.drawCircle(cx, cy - 18, radius, buttonPaint)
        canvas.drawCircle(cx - 18, cy + 12, radius, buttonPaint)
        canvas.drawCircle(cx + 18, cy + 12, radius, buttonPaint)
        
        // Lines connecting them
        buttonPaint.style = Paint.Style.STROKE
        buttonPaint.strokeWidth = 2f
        canvas.drawLine(cx, cy - 18, cx - 18, cy + 12, buttonPaint)
        canvas.drawLine(cx, cy - 18, cx + 18, cy + 12, buttonPaint)
    }
    
    /**
     * Draw debug overlay showing anchor star positions for constellation artwork calibration
     * Shows green dots at actual star screen positions with HIP IDs
     */
    private fun drawArtworkDebugOverlay(canvas: Canvas) {
        if (constellationArtworks.isEmpty() || starMap.isEmpty()) return
        
        // Find which constellation anchors are visible
        val visibleAnchors = mutableListOf<Triple<String, Int, Star>>() // constellation name, HIP ID, star
        
        for (artwork in constellationArtworks) {
            for (anchor in artwork.anchors) {
                val hipId = "HIP${anchor.hipId}"
                val star = starMap[hipId]
                if (star?.visible == true) {
                    visibleAnchors.add(Triple(artwork.id, anchor.hipId, star))
                }
            }
        }
        
        // Draw green dots at each visible anchor star position
        for ((constName, hipId, star) in visibleAnchors) {
            // Draw a bright green circle at the star's actual screen position
            anchorDebugPaint.color = Color.GREEN
            canvas.drawCircle(star.screenX, star.screenY, 12f, anchorDebugPaint)
            
            // Draw inner white dot
            anchorDebugPaint.color = Color.WHITE
            canvas.drawCircle(star.screenX, star.screenY, 5f, anchorDebugPaint)
            
            // Draw HIP ID label
            val label = "$constName:$hipId"
            canvas.drawText(label, star.screenX + 15, star.screenY - 10, anchorTextPaint)
        }
        
        // Draw info text at top
        anchorTextPaint.textSize = 28f
        anchorTextPaint.color = Color.CYAN
        canvas.drawText("DEBUG: Anchor stars shown with HIP IDs", 20f, 120f, anchorTextPaint)
        canvas.drawText("Match these positions to pixel coords in JSON", 20f, 155f, anchorTextPaint)
        anchorTextPaint.textSize = 24f
        anchorTextPaint.color = Color.YELLOW
    }
}




