package com.skyviewapp.starfield

import android.content.Context
import android.opengl.GLSurfaceView
import android.util.AttributeSet
import android.util.Log
import android.view.MotionEvent
import com.skyviewapp.starfield.gl.GLSkyRenderer
import com.skyviewapp.starfield.input.GestureHandler
import com.skyviewapp.starfield.models.ConstellationArt
import com.skyviewapp.starfield.models.Planet
import com.skyviewapp.starfield.models.Star

/**
 * GLSurfaceView subclass for OpenGL ES 3.0 sky rendering
 * Configures EGL context and handles touch events
 */
class GLSkyView @JvmOverloads constructor(
    context: Context,
    attrs: AttributeSet? = null
) : GLSurfaceView(context, attrs) {
    companion object {
        private const val TAG = "GLSkyView"
    }

    val renderer: GLSkyRenderer

    // Gesture handler for touch/zoom
    private var gestureHandler: GestureHandler? = null

    // Touch event listener (optional, for external handling)
    var onTouchEventListener: ((MotionEvent) -> Boolean)? = null

    init {
        // Request OpenGL ES 3.0 context
        setEGLContextClientVersion(3)

        // Configure with alpha channel but NOT on top (to avoid transparency issues)
        setEGLConfigChooser(8, 8, 8, 8, 16, 0)
        holder.setFormat(android.graphics.PixelFormat.TRANSLUCENT)
        // Note: Removed setZOrderOnTop(true) to prevent GL view from overlaying other screens

        // Create and set renderer
        renderer = GLSkyRenderer(context)
        setRenderer(renderer)

        // Render continuously for smooth 60fps
        renderMode = RENDERMODE_CONTINUOUSLY

        Log.d(TAG, "GLSkyView initialized with OpenGL ES 3.0")
    }

    fun setGestureHandler(handler: GestureHandler) {
        gestureHandler = handler
    }

    override fun onTouchEvent(event: MotionEvent): Boolean {
        // First try external listener
        if (onTouchEventListener?.invoke(event) == true) {
            return true
        }

        // Then try gesture handler
        if (gestureHandler?.handleTouchEvent(event) == true) {
            return true
        }

        return super.onTouchEvent(event)
    }

    // ============= Renderer Delegate Methods =============

    fun setOrientation(azimuth: Float, altitude: Float) {
        queueEvent {
            renderer.azimuth = azimuth
            renderer.altitude = altitude
        }
    }

    fun setFov(fov: Float) {
        queueEvent {
            renderer.updateFov(fov)
        }
    }

    fun setStars(stars: List<Star>) {
        queueEvent {
            renderer.setStars(stars)
        }
    }

    fun setPlanets(planets: List<Planet>) {
        queueEvent {
            renderer.setPlanets(planets)
        }
    }

    fun setConstellationLines(vertices: FloatArray, count: Int) {
        queueEvent {
            renderer.setConstellationLines(vertices, count)
        }
    }

    fun setNightMode(mode: String) {
        queueEvent {
            renderer.setNightMode(mode)
        }
    }

    fun setStarBrightness(brightness: Float) {
        queueEvent {
            renderer.starBrightness = brightness
        }
    }

    fun setPlanetScale(scale: Float) {
        queueEvent {
            renderer.planetScale = scale
        }
    }

    fun setSunDirection(x: Float, y: Float, z: Float) {
        queueEvent {
            renderer.sunDirection = floatArrayOf(x, y, z)
        }
    }
    
    /**
     * Set Local Sidereal Time for celestial coordinate transformation
     * LST determines which part of the celestial sphere is overhead based on Earth's rotation
     */
    fun setLst(lst: Float) {
        queueEvent {
            renderer.lst = lst
        }
    }
    
    /**
     * Set observer's latitude for celestial coordinate transformation
     * Latitude determines the altitude of the celestial pole
     */
    fun setLatitude(latitude: Float) {
        queueEvent {
            renderer.latitude = latitude
        }
    }

    fun loadPlanetTexture(planetId: String, assetPath: String) {
        queueEvent {
            renderer.loadPlanetTexture(planetId, assetPath)
        }
    }
    
    // ============= Constellation Artwork Methods =============
    
    fun setConstellationArtworks(artworks: List<ConstellationArt>, stars: List<Star>) {
        queueEvent {
            renderer.setConstellationArtworks(artworks, stars)
        }
    }
    
    fun setShowConstellationArtwork(show: Boolean) {
        queueEvent {
            renderer.enableConstellationArtwork(show)
        }
    }
    
    fun loadConstellationTexture(imageName: String, assetPath: String) {
        queueEvent {
            renderer.loadConstellationTexture(imageName, assetPath)
        }
    }
    
    fun setArtworkOpacity(opacity: Float) {
        queueEvent {
            renderer.updateArtworkOpacity(opacity)
        }
    }

    override fun onDetachedFromWindow() {
        super.onDetachedFromWindow()
        queueEvent {
            renderer.destroy()
        }
    }
}
