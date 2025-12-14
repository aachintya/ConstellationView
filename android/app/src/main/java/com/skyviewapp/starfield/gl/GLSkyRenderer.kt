package com.skyviewapp.starfield.gl

import android.content.Context
import android.opengl.GLES30
import android.opengl.GLSurfaceView
import android.opengl.Matrix
import android.util.Log
import com.skyviewapp.starfield.gl.renderers.*
import com.skyviewapp.starfield.gl.utils.CrosshairFocusHelper
import com.skyviewapp.starfield.models.ConstellationArt
import com.skyviewapp.starfield.models.Planet
import com.skyviewapp.starfield.models.Star
import javax.microedition.khronos.egl.EGLConfig
import javax.microedition.khronos.opengles.GL10

/**
 * OpenGL ES 3.0 Renderer for the sky view.
 * Implements GLSurfaceView.Renderer for hardware-accelerated rendering.
 * 
 * This class coordinates multiple specialized renderers:
 * - ShaderManager: Manages all shader programs
 * - StarRenderer: Renders stars with proper colors and magnitudes
 * - PlanetRenderer: Renders planets with procedural textures
 * - ConstellationLineRenderer: Renders constellation connection lines
 * - ArtworkRenderer: Renders constellation artwork images
 * - TapRippleRenderer: Renders tap feedback animation
 */
class GLSkyRenderer(private val context: Context) : GLSurfaceView.Renderer {
    companion object {
        private const val TAG = "GLSkyRenderer"
    }

    // Specialized renderers
    private val shaderManager = ShaderManager(context)
    private val starRenderer = StarRenderer()
    private val planetRenderer = PlanetRenderer()
    private val constellationLineRenderer = ConstellationLineRenderer()
    private val artworkRenderer = ArtworkRenderer()
    private val tapRippleRenderer = TapRippleRenderer()
    
    // Texture loader
    private val textureLoader by lazy { GLTextureLoader(context) }
    
    // Skybox resources (Milky Way - currently disabled)
    private val galacticBandMesh = GalacticBandMesh()
    private var milkywayTextureId = 0

    // Matrices
    private val viewMatrix = FloatArray(16)
    private val projectionMatrix = FloatArray(16)
    private val vpMatrix = FloatArray(16)

    // Screen dimensions
    private var screenWidth = 1
    private var screenHeight = 1

    // Camera/view parameters
    var azimuth = 0f
    var altitude = 0f
    var fov = 75f
    
    // Celestial coordinate transformation parameters
    var lst = 0f       // Local Sidereal Time in degrees
    var latitude = 28.6f  // Observer's latitude in degrees

    // Render settings
    var nightModeIntensity = 0f  // 0 = off, 1 = full red
    var starBrightness = 0.5f
    var planetScale = 0.5f
    var artworkOpacity = 0.5f  // Artwork visibility
    var showConstellationArtwork = true

    // Sun direction for planet lighting (unit vector toward sun)
    var sunDirection = floatArrayOf(1f, 0f, 0f)

    // Planet data
    private var planets: List<Planet> = emptyList()
    
    // GL state
    private var glReady = false
    
    // Pending texture loads (deferred until GL context is ready)
    private val pendingPlanetTextures = mutableListOf<Pair<String, String>>()
    private val pendingConstellationTextures = mutableListOf<Pair<String, String>>()

    // Crosshair callback
    var onCrosshairObjectChanged: ((String?, String?) -> Unit)? = null

    fun triggerTapRipple(x: Float, y: Float, z: Float) {
        tapRippleRenderer.trigger(x, y, z)
    }

    override fun onSurfaceCreated(gl: GL10?, config: EGLConfig?) {
        Log.d(TAG, "onSurfaceCreated")

        // Set clear color (transparent for overlay)
        GLES30.glClearColor(0f, 0f, 0f, 0f)

        // Enable depth testing for proper planet rendering
        GLES30.glEnable(GLES30.GL_DEPTH_TEST)
        GLES30.glDepthFunc(GLES30.GL_LEQUAL)

        // Enable blending for stars and lines
        GLES30.glEnable(GLES30.GL_BLEND)
        GLES30.glBlendFunc(GLES30.GL_SRC_ALPHA, GLES30.GL_ONE_MINUS_SRC_ALPHA)

        // Initialize shaders
        shaderManager.initShaders()

        // Initialize renderers
        starRenderer.initialize()
        planetRenderer.initialize()
        constellationLineRenderer.initialize()
        artworkRenderer.initialize()
        galacticBandMesh.initialize()

        // Load Milky Way texture
        milkywayTextureId = textureLoader.loadTextureFromAssets("milkyway.png")
        Log.d(TAG, "Milky Way texture loaded: $milkywayTextureId")

        Log.d(TAG, "Sphere mesh has ${planetRenderer.getTriangleCount()} triangles")
        
        // Mark GL as ready and process any pending texture loads
        glReady = true
        processPendingTextures()
    }
    
    private fun processPendingTextures() {
        for ((planetId, assetPath) in pendingPlanetTextures) {
            val textureId = textureLoader.loadTextureFromAssets(assetPath)
            if (textureId != 0) {
                Log.d(TAG, "Loaded planet texture: $planetId -> $textureId")
            }
        }
        pendingPlanetTextures.clear()
        
        for ((imageName, assetPath) in pendingConstellationTextures) {
            val textureId = textureLoader.loadTextureFromAssets(assetPath)
            if (textureId != 0) {
                artworkRenderer.setTexture(imageName, textureId)
                Log.d(TAG, "Loaded constellation texture: $imageName -> $textureId")
            }
        }
        pendingConstellationTextures.clear()
    }

    override fun onSurfaceChanged(gl: GL10?, width: Int, height: Int) {
        Log.d(TAG, "onSurfaceChanged: ${width}x${height}")
        screenWidth = width
        screenHeight = height

        GLES30.glViewport(0, 0, width, height)

        // Update projection matrix
        val aspectRatio = width.toFloat() / height.toFloat()
        Matrix.perspectiveM(projectionMatrix, 0, fov, aspectRatio, 0.1f, 100f)
    }

    override fun onDrawFrame(gl: GL10?) {
        // Clear buffers
        GLES30.glClear(GLES30.GL_COLOR_BUFFER_BIT or GLES30.GL_DEPTH_BUFFER_BIT)

        // Update view matrix based on orientation
        updateViewMatrix()

        // Calculate VP matrix
        Matrix.multiplyMM(vpMatrix, 0, projectionMatrix, 0, viewMatrix, 0)

        // Update crosshair focus for constellation visibility (uses same view matrix)
        CrosshairFocusHelper.updateViewMatrix(viewMatrix)
        
        // Render in order: artwork (back), lines, stars, planets (front)
        // renderSkybox()  // Milky Way disabled
        artworkRenderer.render(
            shaderManager.artworkShader,
            textureLoader,
            vpMatrix,
            artworkOpacity,
            nightModeIntensity,
            showConstellationArtwork
        )
        constellationLineRenderer.render(
            shaderManager.lineShader,
            vpMatrix,
            nightModeIntensity
        )
        starRenderer.render(
            shaderManager.starShader,
            vpMatrix,
            screenWidth,
            screenHeight,
            starBrightness,
            nightModeIntensity
        )
        planetRenderer.render(
            shaderManager.planetShader,
            shaderManager.ringShader,
            vpMatrix,
            sunDirection,
            nightModeIntensity,
            planetScale
        )
        tapRippleRenderer.render(
            shaderManager.lineShader,
            vpMatrix,
            nightModeIntensity
        )
    }

    private fun updateViewMatrix() {
        // Reset view matrix
        Matrix.setIdentityM(viewMatrix, 0)
        
        // The transformation converts from celestial equatorial coordinates (RA/Dec)
        // to the observer's local horizontal coordinates (Alt/Az)
        // 
        // Stars are stored in equatorial coordinates where:
        // - X axis points toward RA=0h (vernal equinox)
        // - Y axis points toward RA=6h  
        // - Z axis points toward celestial north pole (Dec=+90°)
        //
        // We need to:
        // 1. Rotate by LST around Z to account for Earth's rotation
        // 2. Rotate by (90° - latitude) around Y to tilt celestial pole to correct altitude
        // 3. Apply camera azimuth rotation
        // 4. Apply camera altitude rotation
        
        // Step 1: Apply camera altitude (pitch) - looking up/down
        Matrix.rotateM(viewMatrix, 0, -altitude, 1f, 0f, 0f)
        
        // Step 2: Apply camera azimuth (yaw) - looking left/right
        // Azimuth 0 = North, 90 = East, 180 = South, 270 = West
        Matrix.rotateM(viewMatrix, 0, -azimuth, 0f, 1f, 0f)
        
        // Step 3: Tilt the celestial sphere based on latitude
        // At latitude 0°, celestial pole is at horizon (90° from zenith)
        // At latitude 90°, celestial pole is at zenith (0° from zenith)
        // So we rotate by (90 - latitude) to bring pole to correct altitude
        Matrix.rotateM(viewMatrix, 0, (90f - latitude), 1f, 0f, 0f)
        
        // Step 4: Rotate by LST to account for Earth's rotation
        // LST increases as time passes, causing stars to move westward
        // Positive LST rotation makes stars appear to move from east to west
        Matrix.rotateM(viewMatrix, 0, -lst, 0f, 0f, 1f)
    }

    @Suppress("unused")
    private fun renderSkybox() {
        val shader = shaderManager.skyboxShader ?: return
        if (milkywayTextureId == 0) return

        shader.use()

        // Milky Way band is already positioned at galactic plane in the mesh
        val milkywayModel = FloatArray(16)
        Matrix.setIdentityM(milkywayModel, 0)
        Matrix.scaleM(milkywayModel, 0, 80f, 80f, 80f)

        val milkywayMvp = FloatArray(16)
        Matrix.multiplyMM(milkywayMvp, 0, vpMatrix, 0, milkywayModel, 0)

        shader.setUniformMatrix4fv("u_MVP", milkywayMvp)
        shader.setUniform1f("u_Brightness", 0.3f + starBrightness * 0.4f)

        GLES30.glDepthMask(false)
        GLES30.glDisable(GLES30.GL_CULL_FACE)
        GLES30.glBlendFunc(GLES30.GL_SRC_ALPHA, GLES30.GL_ONE)

        textureLoader.bindTexture(milkywayTextureId, GLES30.GL_TEXTURE0)
        shader.setUniform1i("u_Texture", 0)

        galacticBandMesh.draw()

        GLES30.glBlendFunc(GLES30.GL_SRC_ALPHA, GLES30.GL_ONE_MINUS_SRC_ALPHA)
        GLES30.glEnable(GLES30.GL_CULL_FACE)
        GLES30.glDepthMask(true)
    }

    // ============= Data Upload Methods =============

    fun setStars(starList: List<Star>) {
        starRenderer.setStars(starList)
    }

    fun setConstellationLines(vertices: FloatArray, count: Int) {
        constellationLineRenderer.setConstellationLines(vertices, count)
    }

    fun setPlanets(planetList: List<Planet>) {
        planets = planetList
        planetRenderer.setPlanets(planetList)
    }

    fun loadPlanetTexture(planetId: String, assetPath: String) {
        if (!glReady) {
            pendingPlanetTextures.add(planetId to assetPath)
            return
        }
        val textureId = textureLoader.loadTextureFromAssets(assetPath)
        if (textureId != 0) {
            Log.d(TAG, "Loaded planet texture: $planetId -> $textureId")
        }
    }
    
    // ============= Constellation Artwork Methods =============
    
    fun setConstellationArtworks(artworks: List<ConstellationArt>, stars: List<Star>) {
        artworkRenderer.setConstellationArtworks(artworks, stars)
        // Also build per-constellation lines for crosshair-focused rendering
        val starMap = stars.associateBy { it.id }
        constellationLineRenderer.setConstellationLinesFromArtwork(artworks, starMap)
    }
    
    fun enableConstellationArtwork(show: Boolean) {
        showConstellationArtwork = show
    }
    
    fun loadConstellationTexture(imageName: String, assetPath: String) {
        if (!glReady) {
            pendingConstellationTextures.add(imageName to assetPath)
            return
        }
        artworkRenderer.loadTexture(textureLoader, imageName, assetPath)
    }
    
    fun updateArtworkOpacity(opacity: Float) {
        artworkOpacity = opacity.coerceIn(0f, 1f)
    }

    fun setNightMode(mode: String) {
        nightModeIntensity = when (mode.lowercase()) {
            "red" -> 1f
            "dim" -> 0.5f
            else -> 0f
        }
    }

    fun updateFov(newFov: Float) {
        fov = newFov
        val aspectRatio = screenWidth.toFloat() / screenHeight.toFloat()
        Matrix.perspectiveM(projectionMatrix, 0, fov, aspectRatio, 0.1f, 100f)
    }

    // ============= Cleanup =============

    fun destroy() {
        shaderManager.destroy()
        starRenderer.delete()
        planetRenderer.delete()
        constellationLineRenderer.delete()
        artworkRenderer.delete()
        tapRippleRenderer.delete()
        galacticBandMesh.delete()
        textureLoader.deleteAllTextures()
    }
}
